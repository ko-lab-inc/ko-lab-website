import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { buttonVariants } from '@/components/ui/Button'
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder'
import { Reveal } from '@/components/ui/Reveal'
import { Link } from '@/i18n/navigation'
import { FILTRE_TERRAIN, IMAGES } from '@/lib/images'
import { resoudreEmplacement } from '@/lib/medias-emplacements'
import { ROUTES } from '@/lib/routes'

import type { AppLocale } from '@/i18n/routing'

/**
 * Équipements et déploiement (résumé) — section 7 de l'accueil (Phase 5).
 *
 * Extraite de Capacites.tsx, comme les sections 4 et 5. Split 50/50 comme
 * Le LAB juste au-dessus (section 6) — les deux capacités qui se suivent
 * partagent le même gabarit, lu comme une paire plutôt que deux templates
 * différents. Deux photos réelles côte à côte plutôt qu'une seule choisie
 * arbitrairement : « équipements » est pluriel, la composition l'est aussi.
 * deploiementRemorque et transportRemorque2026 depuis le 20 août 2026 (la
 * seconde remplace deploiementCamion — voir images.ts, point 3 de la revue
 * visuelle) : deux remorques plutôt qu'une remorque et un camion, assumé —
 * le sujet exact compte moins que l'absence de logo tiers dans le cadre.
 *
 * Aucun bloc statistique ici — contrairement à la section 4, aucun chiffre de
 * Home.stats ne correspond honnêtement à « équipements et déploiement »
 * (CLAUDE.md interdit d'affirmer un nombre sans preuve) : le titre et les deux
 * photos portent la section seuls.
 *
 * Referme aussi le bloc des capacités (4/5/6/7) avec un lien vers le hub
 * /nos-capacites, voir plus bas.
 */
export async function EquipementsDeploiement({ locale }: { locale: AppLocale }) {
  const t = await getTranslations('Home.equipements')
  const tCapacites = await getTranslations('Home.capacites')
  const tCommun = await getTranslations('Commun')

  // deployment_camion (migration 0031, route A) — pilote UNIQUEMENT la photo
  // de GAUCHE. C'est elle qui correspond à cet emplacement : le repli défini
  // dans medias-repli.ts pointe vers IMAGES.deploiementRemorque, pas
  // IMAGES.deploiementCamion (celle-ci porte des logos tiers dominants —
  // Gatorade, Eska — et a été retirée du site le 20 août 2026 pour cette
  // raison ; voir le rapport de la conversation du 22 août 2026). La photo de
  // DROITE (transportRemorque2026) n'a pas de ligne dans medias_emplacements
  // et reste câblée en dur, hors périmètre de ce chantier — voir le rapport
  // pour un problème de logos tiers repéré dessus, non traité ici.
  const photoGauche = await resoudreEmplacement('deployment_camion', locale)

  return (
    <section className="bg-ko-black">
      <div className="grid grid-cols-1 items-stretch lg:grid-cols-2">
        <Reveal className="grid grid-cols-2 gap-px overflow-hidden rounded-b-2xl bg-ko-line-d lg:aspect-auto lg:min-h-[640px] lg:rounded-b-none lg:rounded-r-2xl">
          <div className="relative aspect-[3/4] lg:aspect-auto">
            {/* Vide assumé (migration 0037) : PhotoPlaceholder à la place,
                jamais l'ancienne photo. */}
            {photoGauche === null ? (
              <PhotoPlaceholder
                ratio=""
                label={tCommun('photo_placeholder')}
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <Image
                src={photoGauche.url}
                alt={photoGauche.alt}
                fill
                quality={80}
                sizes="(max-width: 1024px) 50vw, 25vw"
                style={FILTRE_TERRAIN}
                className="object-cover object-center"
              />
            )}
          </div>
          <div className="relative aspect-[3/4] lg:aspect-auto">
            {/*
              transportRemorque2026 depuis le 20 août 2026 (revue visuelle,
              point 3) — remplace deploiementCamion : sous le titre « Les bons
              moyens permettent de livrer », une caisse de camionnette pleine
              de bouteilles Gatorade et Eska (logos tiers dominants, lisibles)
              dessert le propos plutôt que de le servir. Voir images.ts.
              ⚠️ Ce remplacement a lui-même un problème de logo tiers
              (enseigne « LOCATION GM » + numéro de téléphone dominants,
              Banque Scotia en arrière-plan) — repéré le 22 août 2026 en
              construisant medias_emplacements, non corrigé ici (hors
              périmètre de ce chantier). Voir le rapport de la conversation.
            */}
            <Image
              src={IMAGES.transportRemorque2026}
              alt=""
              fill
              quality={80}
              sizes="(max-width: 1024px) 50vw, 25vw"
              style={FILTRE_TERRAIN}
              className="object-cover object-center"
            />
          </div>
        </Reveal>

        <Reveal className="flex items-center px-6 py-16 lg:px-16 lg:py-28">
          <div className="w-full max-w-[46ch]">
            <p className="label-mono label-mono-d">{t('label')}</p>

            <h2 className="mt-5 font-serif text-[clamp(28px,3.4vw,44px)] font-light leading-[1.08] tracking-[-0.02em] text-ko-white">
              {t('title')}
            </h2>

            <p className="mt-4 text-base leading-relaxed text-ko-frost/60">{t('texte')}</p>

            <Link
              href={ROUTES.equipements}
              // /50, pas /30 — bordure trop faible sur zone claire de photo,
              // corrigé le 3 septembre 2026 (voir Hero.tsx pour le détail).
              className="mt-10 inline-flex min-h-[44px] items-center justify-center gap-2.5 rounded-sm border border-ko-frost/50 px-7 py-4 text-sm text-ko-white transition-colors duration-200 hover:border-ko-white hover:bg-ko-frost/10"
            >
              {t('lien')}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Reveal>
      </div>

      {/* Lien de sortie du bloc capacités (sections 4/5/6/7) — retiré par
          erreur quand Capacites.tsx a été dissoute (chaque section n'a plus
          qu'un lien vers SA propre sous-page), remis ici sur demande de
          Christian : les 4 sous-pages de /nos-capacites restent sans point
          d'entrée commun depuis l'accueil sans lui. Posé à la fin de la
          dernière section du bloc plutôt qu'en section à part — CLAUDE.md
          décrit 13 sections, pas 14. */}
      <div className="border-t border-ko-line-d px-6 py-8 text-center lg:px-12">
        <Link href={ROUTES.capacites} className={buttonVariants({ variant: 'text-d', size: 'sm' })}>
          {tCapacites('lien')}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}
