import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { EnteteAdmin, PanneauAdmin } from '@/components/layout/CadreAdmin'
import { GestionGaleriesPhotos, type GroupeGalerie } from '@/components/sections/GestionGaleriesPhotos'
import { TableauEmplacements } from '@/components/sections/TableauEmplacements'
import { PAGES_GALERIE, type PageGalerie } from '@/lib/galeries-photos'
import { routing } from '@/i18n/routing'
import { DOSSIERS_MEDIAS, listerFichiersDisponibles } from '@/lib/medias-disponibles'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils/cn'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ onglet?: string }>
}

/**
 * Gestion des médias fixes — deux onglets depuis le 27 août 2026.
 *
 * ---------------------------------------------------------------------------
 * DEUX TABLES, DEUX ÉCRANS, UN SEUL FICHIER DE ROUTE
 *
 * « Emplacements fixes » (medias_emplacements, inchangé) : 15 cases à
 * position unique, une photo chacune, ni ajout ni retrait de ligne.
 * « Nos capacités » (galeries_photos, migration 0043) : 5 galeries à nombre
 * de photos LIBRE, ajout/retrait/réordonnancement depuis l'admin — le
 * système que `lab_1..lab_7` esquissait à moitié (voir la reconnaissance du
 * 27 août 2026), maintenant réel pour les cinq pages qui en ont besoin.
 * `lab_1..lab_7` restent en place dans `medias_emplacements` — elles ne sont
 * retirées qu'à l'étape 3, une fois la page publique Le LAB branchée sur
 * `galeries_photos`.
 *
 * ---------------------------------------------------------------------------
 * ONGLET EN PARAMÈTRE D'URL, PAS EN ÉTAT REACT LOCAL
 *
 * `?onglet=galeries` survit à un rechargement — demande explicite. Deux
 * simples `<Link>` (pas de next-intl : l'admin français n'a pas de
 * NextIntlClientProvider, voir NavAdmin.tsx) suffisent, aucun JS client
 * n'est nécessaire pour ce choix : le contenu de l'onglet actif est déjà
 * décidé côté serveur, avant tout hydratation.
 */
export default async function MediasEmplacementsAdminPage({ params, searchParams }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const { onglet } = await searchParams
  const ongletActif = onglet === 'galeries' ? 'galeries' : 'fixes'

  const t = await getTranslations('Admin')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [
    { data: emplacements, error: erreurEmplacements },
    { data: moi },
    fichiersDisponibles,
    { data: photosGaleries, error: erreurGaleries },
  ] = await Promise.all([
    supabase
      .from('medias_emplacements')
      .select('cle, url_stockage, alt_text_fr, alt_text_en')
      .order('cle'),
    supabase.from('profils').select('role').eq('id', user?.id ?? '').maybeSingle(),
    listerFichiersDisponibles(supabase),
    supabase
      .from('galeries_photos')
      .select('id, page, url_stockage, alt_fr, alt_en, ordre')
      .order('ordre'),
  ])

  const estAdmin = moi?.role === 'admin'

  // Titres de section réutilisés depuis leur namespace public — pas de texte
  // dupliqué : « Opérations terrain », « Installations saisonnières et
  // commerciales », etc. sont déjà les libellés affichés sur les pages
  // publiques correspondantes (Capacites.*.label, Location.title).
  const [tOperations, tInstallations, tLab, tEquipements, tLocation] = await Promise.all([
    getTranslations({ locale, namespace: 'Capacites.operations' }),
    getTranslations({ locale, namespace: 'Capacites.installations' }),
    getTranslations({ locale, namespace: 'Capacites.lab' }),
    getTranslations({ locale, namespace: 'Capacites.equipements' }),
    getTranslations({ locale, namespace: 'Location' }),
  ])
  const titresPages: Record<PageGalerie, string> = {
    'operations-terrain': tOperations('label'),
    installations: tInstallations('label'),
    'le-lab': tLab('label'),
    equipements: tEquipements('label'),
    location: tLocation('title'),
  }

  const groupesGaleries: GroupeGalerie[] = PAGES_GALERIE.map((page) => ({
    page,
    titre: titresPages[page],
    photos: (photosGaleries ?? [])
      .filter((p) => p.page === page)
      .map((p) => ({ id: p.id, url_stockage: p.url_stockage, alt_fr: p.alt_fr, alt_en: p.alt_en })),
  }))

  const erreur = erreurEmplacements || erreurGaleries

  return (
    <>
      <EnteteAdmin
        titre={t('medias_emplacements_titre')}
        intro={
          ongletActif === 'fixes'
            ? t('medias_emplacements_intro', { n: emplacements?.length ?? 0 })
            : t('galeries_photos_intro')
        }
      />

      {/* Deux vues du même écran, pas un widget ARIA « tabs » — chaque onglet
          est une vraie destination (`?onglet=`), atteinte par une vraie
          navigation. `aria-current="page"` est donc le bon attribut, pas
          `aria-selected` (qui suppose un panneau basculé en JS, sans
          rechargement). */}
      <nav aria-label={t('nav_onglets_medias')} className="mb-8 flex gap-2 border-b border-ko-line">
        {(
          [
            { cle: 'fixes' as const, libelle: t('onglet_emplacements_fixes') },
            { cle: 'galeries' as const, libelle: t('onglet_galeries_capacites') },
          ]
        ).map(({ cle, libelle }) => (
          <Link
            key={cle}
            href={`/${locale}/admin/medias-emplacements?onglet=${cle}`}
            aria-current={ongletActif === cle ? 'page' : undefined}
            className={cn(
              'min-h-[44px] border-b-2 px-1 pb-3 text-sm transition-colors duration-200',
              ongletActif === cle
                ? 'border-ko-blue font-medium text-ko-ink'
                : 'border-transparent text-ko-muted hover:text-ko-ink',
            )}
          >
            {libelle}
          </Link>
        ))}
      </nav>

      {erreur ? (
        <PanneauAdmin>
          <p className="text-base text-ko-ink">{t('erreur_serveur_emplacement')}</p>
        </PanneauAdmin>
      ) : ongletActif === 'fixes' ? (
        <TableauEmplacements
          emplacements={emplacements ?? []}
          estAdmin={estAdmin}
          fichiersDisponibles={fichiersDisponibles}
          dossiers={DOSSIERS_MEDIAS}
          textes={{
            colonneCle: t('colonne_cle'),
            colonneApercu: t('colonne_apercu'),
            voirApercu: t('voir_apercu'),
            colonneAltFr: t('colonne_alt_fr'),
            colonneAltEn: t('colonne_alt_en'),
            altEnVide: t('emplacement_alt_en_vide'),
            modifier: t('action_modifier'),
            titreModal: t('titre_modifier_emplacement'),
            champChoix: t('champ_choix_photo_emplacement'),
            aideChoix: t('aide_choix_photo_emplacement'),
            champTeleverser: t('champ_televerser_emplacement'),
            champDossier: t('champ_dossier_emplacement'),
            contraintesPhoto: t('contraintes_photo_emplacement'),
            televersementEnCours: t('televersement_en_cours_emplacement'),
            photoActuelle: t('emplacement_photo_actuelle'),
            retirerPhoto: t('emplacement_retirer_photo'),
            confirmerRetrait: t('emplacement_confirmer_retrait'),
            sansPhoto: t('emplacement_sans_photo'),
            enregistrer: t('enregistrer'),
            enCours: t('en_cours'),
            fermer: t('fermer'),
            erreurServeur: t('erreur_serveur_emplacement'),
          }}
        />
      ) : (
        <GestionGaleriesPhotos
          groupes={groupesGaleries}
          libelles={{
            vide: t('galerie_vide'),
            champFichier: t('champ_photo_nouvelle'),
            aideFichier: t('champ_photo_nouvelle_aide'),
            televerser: t('champ_photo_televerser'),
            televersementEnCours: t('televersement_en_cours_galerie'),
            colonneAltFr: t('colonne_alt_fr'),
            colonneAltEn: t('colonne_alt_en'),
            altEnVide: t('emplacement_alt_en_vide'),
            monter: t('action_monter_image'),
            descendre: t('action_descendre_image'),
            retirer: t('action_retirer_image'),
            confirmerRetrait: t('confirmer_retrait_galerie'),
            erreurFichier: t('erreur_photo'),
          }}
        />
      )}
    </>
  )
}
