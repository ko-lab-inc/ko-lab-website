import { PanierLocationProvider } from '@/lib/panier/PanierLocationContext'

import type { ReactNode } from 'react'

/**
 * Layout du sous-arbre /location — fournit le panier de demande de location.
 *
 * Posé ICI, et non dans le layout marketing global, pour que le panier de
 * location n'existe QUE sous /location et /location/demande : c'est le seul
 * endroit où on y ajoute et où on le consulte. Le reste du site (y compris
 * /contact et la boutique) n'a aucune raison de monter ce contexte.
 *
 * `PanierLocationProvider` est un composant client ; ce layout reste serveur et
 * se contente de l'envelopper autour des pages. L'état vit en localStorage, si
 * bien que la page /location et la page /location/demande partagent la même
 * sélection en relisant la même clé à leur montage.
 */
export default function LocationLayout({ children }: { children: ReactNode }) {
  return <PanierLocationProvider>{children}</PanierLocationProvider>
}
