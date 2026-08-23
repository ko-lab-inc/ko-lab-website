'use client'

import { useTranslations } from 'next-intl'
import Script from 'next/script'
import { useState } from 'react'

import { IconeAccompagnement } from '@/components/ui/Icones'

/**
 * Bulle de chat Crisp — présente sur toutes les pages publiques.
 *
 * Crisp plutôt qu'un autre service : plan gratuit sans limite de conversations,
 * hébergement européen et conformité RGPD documentée, intégration en un script.
 *
 * ---------------------------------------------------------------------------
 * CLIC-POUR-CHARGER — Loi 25 (audit du 23 août 2026)
 *
 * Avant cette version, le script Crisp partait automatiquement (`lazyOnload`)
 * dès la page chargée, sans qu'aucune action du visiteur ne le demande — un
 * cookie tiers pouvait donc être déposé avant tout consentement. Ce composant
 * rend maintenant un VRAI bouton statique, dans notre propre DOM, et ne
 * charge `client.crisp.chat/l.js` qu'au premier clic dessus. Personne ne
 * touche à Crisp = aucune requête vers client.crisp.chat, jamais.
 *
 * Une fois chargé, `window.$crisp` est un tableau-file que le script Crisp
 * lui-même vide au démarrage : pousser `['do', 'chat:open']` AVANT que le
 * script ait fini de charger fonctionne quand même (comportement documenté
 * Crisp, pas une supposition) — la fenêtre s'ouvre dès que possible, sans
 * callback `onLoad` à orchestrer.
 *
 * Le bouton se démonte une fois `charge` à `true` : Crisp dessine sa PROPRE
 * bulle (iframe tierce) au même endroit par défaut, et le CLAUDE.md interdit
 * deux widgets superposés dans le même coin.
 *
 * ---------------------------------------------------------------------------
 * DÉGRADATION PROPRE
 * Sans NEXT_PUBLIC_CRISP_WEBSITE_ID, le composant ne rend RIEN — ni bouton, ni
 * script. Aucun échec de build, aucune erreur console, aucune requête réseau.
 *
 * Accès littéral à process.env obligatoire : Next substitue ces expressions au
 * build par analyse statique du texte. Un accès dynamique ne serait pas
 * remplacé dans le bundle client et vaudrait undefined dans le navigateur.
 * ---------------------------------------------------------------------------
 *
 * ⚠️ Le compte doit appartenir à KO-LAB Inc., pas à un compte personnel —
 * même discipline que Supabase, Resend et Vercel (skill 24).
 *
 * ⚠️ NON VÉRIFIÉ CONTRE CRISP RÉEL EN LOCAL. NEXT_PUBLIC_CRISP_WEBSITE_ID est
 * vide en local — le script ne s'y charge jamais, `charge` ne passe jamais à
 * `true` hors production. Voir le rapport de tâche pour ce qui a été mesuré
 * (bouton, absence de requête avant clic) et ce qui reste à confirmer en
 * production (ouverture réelle de la fenêtre Crisp après clic).
 */
const ID_CRISP = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID

export function ChatCrisp() {
  // Espace de noms partagé avec WidgetAide.tsx (déjà whitelisté en entier
  // côté client, voir (marketing)/[locale]/layout.tsx) : les deux widgets
  // occupent le MÊME emplacement, jamais les deux en même temps (voir
  // layout.tsx, `CRISP_CONFIGURE ? <ChatCrisp /> : <WidgetAide />`) — le même
  // libellé « Poser une question » décrit la même fonctionnalité pour le
  // visiteur, peu importe laquelle des deux implémentations la sert.
  const t = useTranslations('Aide')
  const [charge, setCharge] = useState(false)

  if (!ID_CRISP) return null

  function demarrer() {
    if (charge) return

    // Crisp lit ces deux globales au démarrage du script. Variable locale
    // plutôt que `window.$crisp.push(...)` direct : `$crisp` est optionnel
    // dans le type (crisp.d.ts), TypeScript ne garantit pas qu'il reste
    // non-`undefined` d'une instruction à l'autre sur une propriété globale.
    const file: unknown[] = []
    window.$crisp = file
    window.CRISP_WEBSITE_ID = ID_CRISP as string
    // Queue Crisp standard : consommée dès que le script a fini de charger,
    // qu'elle soit remplie avant ou après ce moment.
    file.push(['do', 'chat:open'])

    setCharge(true)
  }

  return (
    <>
      {!charge && (
        <button
          type="button"
          onClick={demarrer}
          aria-label={t('ouvrir')}
          // Même position, taille et forme que le lanceur de secours
          // (WidgetAide.tsx) : c'est le même emplacement dans la mise en
          // page, jamais les deux widgets en même temps.
          className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-sm bg-ko-black text-ko-white shadow-card transition-colors duration-200 hover:bg-ko-black2 lg:right-6"
        >
          <IconeAccompagnement taille={22} />
        </button>
      )}

      {charge && (
        <Script id="crisp-widget" strategy="afterInteractive" src="https://client.crisp.chat/l.js" />
      )}
    </>
  )
}

/**
 * Couleur du lanceur — à régler dans le tableau de bord Crisp, pas ici.
 *
 * Crisp rend sa bulle dans une iframe : ni notre CSS ni nos tokens ne
 * l'atteignent. Le réglage se fait sous Settings → Website Settings →
 * Appearance → Color, en saisissant le noir KO-LAB #111210.
 *
 * Le bleu #61b4db est à éviter : c'est notre unique signal d'interaction, et
 * un lanceur bleu entrerait en concurrence avec les boutons « Demander un
 * prix ». Le noir se pose sans rivaliser (skill 08).
 */
