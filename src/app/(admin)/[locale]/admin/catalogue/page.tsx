import { hasLocale } from 'next-intl'
import { getFormatter, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { basculerPublication, supprimerProduit } from './actions'
import { EnteteAdmin, PanneauAdmin } from '@/components/layout/CadreAdmin'
import {
  FormulaireProduit,
  type LibellesProduit,
  type Produit,
} from '@/components/sections/FormulaireProduit'
import { buttonVariants } from '@/components/ui/Button'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils/cn'

type Props = { params: Promise<{ locale: string }> }

/**
 * Gestion du catalogue — lecture, création, édition, publication, suppression.
 *
 * ---------------------------------------------------------------------------
 * TOUT PASSE PAR LE RLS
 *
 * Lecture et écritures utilisent le client de SESSION. Les politiques de 0002
 * décident : admin et editor lisent et écrivent, seul l'admin supprime. Le
 * bouton de suppression n'est affiché qu'à l'admin — mais c'est du confort
 * d'affichage, la garantie est dans la politique, pas dans ce fichier.
 *
 * Publication et suppression sont des Server Actions EN LIGNE, sans état
 * client : un <form> suffit et fonctionne sans JavaScript. L'édition, elle, a
 * besoin de renvoyer une erreur de validation, donc d'un composant client.
 * ---------------------------------------------------------------------------
 */
export default async function CataloguePage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')
  const format = await getFormatter({ locale })
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: produits, error }, { data: moi }] = await Promise.all([
    supabase
      .from('produits_boutique')
      .select(
        'id, slug, marque, categorie, nom_fr, nom_en, description_fr, description_en, prix, cadrage, ordre, publie',
      )
      .order('ordre'),
    supabase.from('profils').select('role').eq('id', user?.id ?? '').maybeSingle(),
  ])

  const estAdmin = moi?.role === 'admin'

  const libelles: LibellesProduit = {
    slug: t('champ_slug'),
    marque: t('champ_marque'),
    categorie: t('colonne_categorie'),
    nomFr: t('champ_nom_fr'),
    nomEn: t('champ_nom_en'),
    descriptionFr: t('champ_desc_fr'),
    descriptionEn: t('champ_desc_en'),
    prix: t('colonne_prix'),
    prixAide: t('champ_prix_aide'),
    cadrage: t('champ_cadrage'),
    cadrageContain: t('champ_cadrage_contain'),
    cadrageCover: t('champ_cadrage_cover'),
    ordre: t('champ_ordre'),
    enregistrer: t('enregistrer'),
    creer: t('creer_produit'),
    enCours: t('en_cours'),
    succes: t('produit_enregistre'),
    categories: {
      impression: t('cat_impression'),
      laser: t('cat_laser'),
      conteneurs: t('cat_conteneurs'),
      equipements: t('cat_equipements'),
    },
    erreurDonnees: t('erreur_donnees_produit'),
    erreurSlug: t('erreur_slug_pris'),
    erreurRefuse: t('reserve_admin_texte'),
    erreurServeur: t('erreur_lecture'),
  }

  if (error) {
    return (
      <>
        <EnteteAdmin titre={t('catalogue_titre')} />
        {/* Le message technique reste dans les journaux : il nomme des tables
            et des politiques. */}
        <PanneauAdmin>
          <p className="text-base text-ko-ink">{t('erreur_lecture')}</p>
        </PanneauAdmin>
      </>
    )
  }

  return (
    <>
      <EnteteAdmin titre={t('catalogue_titre')} intro={t('catalogue_intro')} />

      <PanneauAdmin sansPadding className="mb-10">
        {!produits || produits.length === 0 ? (
          <p className="p-6 text-base leading-relaxed text-ko-muted">{t('catalogue_vide')}</p>
        ) : (
          <ul className="divide-y divide-ko-line">
            {produits.map((p) => (
              <li key={p.id}>
                {/* <details> natif : douze fiches ouvertes en même temps
                    donneraient une page de plusieurs milliers de pixels où
                    l'on ne retrouve rien. Aucun état, aucun JavaScript. */}
                <details>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4 transition-colors duration-200 hover:bg-ko-cream">
                    <span className="w-8 shrink-0 font-mono text-xs text-ko-muted">{p.ordre}</span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base text-ko-ink">{p.nom_fr}</span>
                      <span className="block truncate font-mono text-xs text-ko-muted">
                        {p.slug}
                      </span>
                    </span>

                    <span className="label-mono shrink-0 text-ko-blue">
                      {libelles.categories[p.categorie] ?? p.categorie}
                    </span>

                    <span className="w-24 shrink-0 text-right font-mono text-sm text-ko-ink">
                      {p.prix === null
                        ? '—'
                        : format.number(p.prix, {
                            style: 'currency',
                            currency: 'CAD',
                            maximumFractionDigits: 0,
                          })}
                    </span>

                    {/* Publié ou non : l'information la plus lourde de
                        conséquence de la ligne, donc la plus visible. */}
                    <span
                      className={cn(
                        'label-mono w-24 shrink-0 text-right',
                        p.publie ? 'text-ko-blue' : 'text-ko-muted',
                      )}
                    >
                      {p.publie ? t('statut_publie') : t('statut_hors_ligne')}
                    </span>
                  </summary>

                  <div className="border-t border-ko-line bg-ko-cream/50 px-6 py-6">
                    <FormulaireProduit
                      locale={locale}
                      produit={p as Produit}
                      libelles={libelles}
                    />

                    <div className="mt-6 flex flex-wrap items-center gap-5 border-t border-ko-line pt-5">
                      <form action={basculerPublication}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="publie" value={String(p.publie)} />
                        <button
                          type="submit"
                          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                        >
                          {p.publie ? t('retirer_vitrine') : t('publier')}
                        </button>
                      </form>

                      {estAdmin && (
                        <form action={supprimerProduit}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="id" value={p.id} />
                          <button
                            type="submit"
                            className="min-h-[44px] border-b border-ko-line pb-0.5 text-sm text-ko-muted transition-colors duration-200 hover:border-ko-ink hover:text-ko-ink"
                          >
                            {t('supprimer')}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </PanneauAdmin>

      <h2 className="ko-h3 mb-4 text-[20px] text-ko-ink">{t('nouveau_produit')}</h2>
      <PanneauAdmin>
        <FormulaireProduit locale={locale} libelles={libelles} />
        <p className="mt-5 border-t border-ko-line pt-4 text-xs leading-relaxed text-ko-muted">
          {t('nouveau_produit_note')}
        </p>
      </PanneauAdmin>
    </>
  )
}
