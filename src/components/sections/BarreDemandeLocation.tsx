'use client'

import { useTranslations } from 'next-intl'

import { buttonVariants } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import { usePanierLocation } from '@/lib/panier/PanierLocationContext'
import { ROUTES } from '@/lib/routes'

/**
 * Barre flottante « Voir ma demande » — suit le visiteur pendant qu'il parcourt
 * le catalogue de location, à la façon des paniers mobiles de la référence
 * (Black Tie). N'apparaît QUE si la sélection contient au moins un article :
 * une barre vide en permanence serait un élément décoratif sans information
 * (skill 08).
 *
 * Attend `pret` (lecture de localStorage faite) : le serveur ignore la
 * sélection, afficher un compteur avant produirait un écart d'hydratation.
 *
 * Pastille centrée en bas, décalée du coin bas-droit où vit la bulle d'aide
 * (WidgetAide) pour ne pas la recouvrir.
 */
export function BarreDemandeLocation() {
  const t = useTranslations('DemandeLocation')
  const { nombre, pret } = usePanierLocation()

  if (!pret || nombre === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-4 border border-ko-line bg-ko-white px-5 py-3 shadow-card">
        <p className="font-mono text-sm text-ko-ink">{t('barre_articles', { n: nombre })}</p>
        <Link href={ROUTES.locationDemande} className={buttonVariants({ variant: 'primary', size: 'sm' })}>
          {t('barre_voir')}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  )
}
