'use client'

import Script from 'next/script'
import { useEffect } from 'react'

/**
 * Bulle de chat Crisp — présente sur toutes les pages publiques.
 *
 * Crisp plutôt qu'un autre service : plan gratuit sans limite de conversations,
 * hébergement européen et conformité RGPD documentée, intégration en un script.
 *
 * ---------------------------------------------------------------------------
 * DÉGRADATION PROPRE
 * Sans NEXT_PUBLIC_CRISP_WEBSITE_ID, le composant ne rend RIEN et le script
 * n'est jamais chargé. Aucun échec de build, aucune erreur console, aucune
 * requête réseau — le site fonctionne simplement sans chat.
 *
 * Accès littéral à process.env obligatoire : Next substitue ces expressions au
 * build par analyse statique du texte. Un accès dynamique ne serait pas
 * remplacé dans le bundle client et vaudrait undefined dans le navigateur.
 * ---------------------------------------------------------------------------
 *
 * ⚠️ Le compte doit appartenir à KO-LAB Inc., pas à un compte personnel —
 * même discipline que Supabase, Resend et Vercel (skill 24).
 */
const ID_CRISP = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID

export function ChatCrisp() {
  useEffect(() => {
    if (!ID_CRISP) return

    // Crisp lit ces deux globales au démarrage du script.
    window.$crisp = []
    window.CRISP_WEBSITE_ID = ID_CRISP
  }, [])

  if (!ID_CRISP) return null

  return (
    <Script
      id="crisp-widget"
      // lazyOnload : le script part APRÈS le chargement complet de la page.
      // Un widget de chat ne doit jamais concurrencer le LCP (skill 12).
      strategy="lazyOnload"
      src="https://client.crisp.chat/l.js"
    />
  )
}

/**
 * Couleur du lanceur — à régler dans le tableau de bord Crisp, pas ici.
 *
 * Crisp rend sa bulle dans une iframe : ni notre CSS ni nos tokens ne
 * l'atteignent. Le réglage se fait sous Settings → Website Settings →
 * Appearance → Color, en saisissant le noir KO-LAB #111210.
 *
 * Le bleu #2f7fc9 est à éviter : c'est notre unique signal d'interaction, et
 * un lanceur bleu entrerait en concurrence avec les boutons « Demander un
 * prix ». Le noir se pose sans rivaliser (skill 08).
 */
