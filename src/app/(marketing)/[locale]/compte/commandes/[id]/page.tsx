import { hasLocale } from 'next-intl'
import { getFormatter, getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'

import Image from 'next/image'

import { BoutonAnnulerCommande } from '@/components/sections/BoutonAnnulerCommande'
import { EditeurLignesCommande } from '@/components/sections/EditeurLignesCommande'
import { StatutTimeline } from '@/components/ui/StatutTimeline'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { lireProduitsPublies } from '@/lib/produits'
import { ROUTES } from '@/lib/routes'
import { createClient } from '@/lib/supabase/server'
import { estUuid } from '@/lib/utils/identifiant'
import { STATUTS_COMMANDE, STATUTS_MODIFIABLES, STATUTS_PAR_MODE, type StatutCommande } from '@/types'

import type { Metadata } from 'next'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

/**
 * Détail d'une commande — migration 0021.
 *
 * ---------------------------------------------------------------------------
 * ACCÈS PAR SESSION, PAS PAR UN TOKEN DANS L'URL
 *
 * `id` est un identifiant de ligne ORDINAIRE, pas un secret — rien n'empêche
 * quiconque de le voir défiler dans une URL partagée par erreur. Ce qui
 * protège la commande, c'est UNIQUEMENT la politique `commandes_lecture_
 * client` (0021) : la requête ci-dessous renvoie `null` pour tout `id` qui
 * n'appartient pas à l'appelant, exactement comme pour un `id` qui n'existe
 * pas — les deux cas sont VOLONTAIREMENT indiscernables (404 dans les deux
 * cas), sinon la réponse elle-même révélerait qu'une commande existe.
 * ---------------------------------------------------------------------------
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations({ locale, namespace: 'Commande' })
  return { title: t('detail_titre'), robots: { index: false, follow: false } }
}

// Dépend de now() par rapport à fenetre_modification_expire_at : un rendu mis
// en cache pourrait montrer un formulaire de modification après l'heure de
// fermeture. `force-dynamic` la même raison que carrieres/postuler.
export const dynamic = 'force-dynamic'

export default async function DetailCommandePage({ params }: Props) {
  const { locale, id } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  if (!estUuid(id)) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/${locale}/connexion?suivant=/${locale}${ROUTES.compteCommandes}/${id}`)

  const t = await getTranslations('Commande')
  const format = await getFormatter({ locale })

  const [{ data: commande }, { data: lignes }] = await Promise.all([
    supabase
      .from('commandes')
      .select('id, numero, statut, mode_livraison, adresse_livraison, fenetre_modification_expire_at, created_at')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('lignes_commande')
      .select('id, produit_id, nom_produit, categorie, quantite, prix_indicatif')
      .eq('commande_id', id)
      .order('created_at', { ascending: true }),
  ])

  // `null` couvre les DEUX cas à la fois — id inexistant, ou commande de
  // quelqu'un d'autre que RLS a rendue invisible. Voir la note d'en-tête.
  if (!commande) notFound()

  const modifiable =
    STATUTS_MODIFIABLES.some((s) => s === (commande.statut as StatutCommande)) &&
    new Date(commande.fenetre_modification_expire_at) > new Date()

  // Toujours lu, plus seulement si modifiable : sert désormais aussi à
  // retrouver la photo de chaque ligne côté lecture seule (voir plus bas).
  // `lireProduitsPublies()` est mis en cache — le lire ici ne coûte rien.
  const catalogue = await lireProduitsPublies()
  const catalogueParId = new Map(catalogue.map((p) => [p.id, p]))

  const libellesStatuts: Record<string, string> = Object.fromEntries(
    STATUTS_COMMANDE.map((s) => [s, t(`statut_${s}`)]),
  )
  const libelleLivraison =
    commande.mode_livraison === 'expedition' ? t('expedition') : t('ramassage')

  // Parcours de CE mode, sans `annulee` : ce n'est pas une étape du cycle
  // normal, c'est une sortie de route — voir la note d'en-tête de
  // StatutTimeline. Rendu seulement si la commande n'est pas déjà annulée,
  // le message dédié plus bas suffit dans ce cas.
  const etapesTimeline = STATUTS_PAR_MODE[commande.mode_livraison as 'ramassage' | 'expedition'].filter(
    (s) => s !== 'annulee',
  )

  return (
    <>
      <section className="border-b border-ko-line bg-ko-cream pb-14 pt-28 lg:pb-20 lg:pt-40">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          <Link
            href={ROUTES.compteCommandes}
            className="text-sm text-ko-muted transition-colors duration-200 hover:text-ko-blue"
          >
            ← {t('retour_liste')}
          </Link>
          <span aria-hidden="true" className="mt-6 block h-px w-8 bg-ko-blue" />
          <h1 className="ko-display mt-6 text-ko-ink">{commande.numero}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ko-muted">
            <span className="label-mono text-ko-blue">
              {libellesStatuts[commande.statut] ?? commande.statut}
            </span>
            <span>{format.dateTime(new Date(commande.created_at), { dateStyle: 'medium' })}</span>
            <span>{libelleLivraison}</span>
          </div>
          {commande.mode_livraison === 'expedition' && commande.adresse_livraison && (
            <p className="mt-4 max-w-[46ch] whitespace-pre-line text-sm leading-relaxed text-ko-muted">
              {commande.adresse_livraison}
            </p>
          )}

          {/* Annulée exclue : ce n'est pas une étape à situer sur le
              parcours normal, le message dédié plus bas suffit. */}
          {commande.statut !== 'annulee' && (
            <div className="mt-8 max-w-[420px]">
              <StatutTimeline
                etapes={etapesTimeline}
                statutActuel={commande.statut as StatutCommande}
                libelles={libellesStatuts}
              />
            </div>
          )}
        </div>
      </section>

      <section className="bg-ko-white py-16 lg:py-24">
        <div className="mx-auto max-w-container px-6 lg:px-12">
          {modifiable ? (
            <>
              <p className="mb-8 max-w-[60ch] text-sm leading-relaxed text-ko-muted">
                {t('fenetre_ouverte_texte', {
                  date: format.dateTime(new Date(commande.fenetre_modification_expire_at), {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }),
                })}
              </p>
              <EditeurLignesCommande
                idCommande={commande.id}
                numero={commande.numero}
                locale={locale}
                modeLivraisonInitial={commande.mode_livraison as 'ramassage' | 'expedition'}
                adresseLivraisonInitiale={commande.adresse_livraison}
                lignesInitiales={(lignes ?? []).map((l) => ({
                  id: l.id,
                  slug: catalogue.find((p) => p.id === l.produit_id)?.slug ?? null,
                  nomProduit: l.nom_produit,
                  categorie: l.categorie,
                  quantite: l.quantite,
                  prixIndicatif: l.prix_indicatif,
                }))}
                catalogue={catalogue.map((p) => ({
                  slug: p.slug,
                  nom: p.nom,
                  categorie: p.categorie,
                  prixIndicatif: p.prixIndicatif,
                  quantiteDisponible: p.quantiteDisponible,
                  src: p.src,
                }))}
              />
              <div className="mt-8 border-t border-ko-line pt-6">
                <BoutonAnnulerCommande id={commande.id} locale={locale} />
              </div>
            </>
          ) : (
            <>
              <div className="mb-8 border border-ko-line bg-ko-cream p-5">
                <p className="text-sm leading-relaxed text-ko-ink">
                  {/* Message précis pour une annulation — distinct de la fenêtre
                      simplement fermée ou d'un statut déjà avancé par l'équipe :
                      la RAISON pour laquelle ce n'est plus modifiable compte pour
                      qui lit, pas seulement le fait que ça ne le soit plus. */}
                  {commande.statut === 'annulee' ? t('commande_annulee_texte') : t('fenetre_fermee_texte')}
                </p>
              </div>
              <ul className="divide-y divide-ko-line border-y border-ko-line">
                {(lignes ?? []).map((l) => {
                  // Photo ACTUELLE du catalogue, pas une copie figée au moment
                  // de la commande — `lignes_commande` n'a jamais stocké
                  // d'image (seuls nom/catégorie/prix sont capturés à l'achat).
                  // Un produit modifié ou dépublié depuis peut donc afficher
                  // une photo différente ou aucune, comme son nom l'indique
                  // déjà pour un produit renommé.
                  const src = l.produit_id ? (catalogueParId.get(l.produit_id)?.src ?? null) : null

                  return (
                    <li key={l.id} className="flex items-center gap-4 py-5">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-ko-line bg-ko-photo">
                        {src && (
                          <Image src={src} alt={l.nom_produit} fill sizes="64px" className="object-contain p-1.5" />
                        )}
                      </div>
                      <div className="flex flex-1 items-center justify-between gap-6">
                        <div>
                          <p className="text-base text-ko-ink">{l.nom_produit}</p>
                          <p className="mt-0.5 font-mono text-xs uppercase tracking-wide text-ko-muted">
                            {l.categorie}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-sm text-ko-muted">× {l.quantite}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </section>
    </>
  )
}
