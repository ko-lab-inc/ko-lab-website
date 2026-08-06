/**
 * Gabarit HTML — notification de changement de statut, migration 0021.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE FICHIER EXISTE
 *
 * Demande de Christian : une fois la commande confirmée, c'est l'équipe qui
 * fait avancer le statut (en préparation, prête, expédiée…) depuis
 * /admin/commandes — le client doit en être informé automatiquement à
 * chaque changement, sans avoir à revenir consulter sa page de commande par
 * habitude. Voir changerStatutCommande (admin/commandes/actions.ts).
 *
 * ---------------------------------------------------------------------------
 * PARCOURS ET PRODUITS — ajoutés le 6 août 2026
 *
 * Ce courriel n'affichait au départ que le nouveau statut, sans le parcours
 * ni les produits — demande de Christian après avoir vu la page
 * /compte/commandes/[id] recevoir les deux (StatutTimeline, photos). Même
 * information, deux rendus : un `<ol>` + flexbox sur la page, une paire de
 * `<table>` ici — aucun client de messagerie de bureau (Outlook au premier
 * chef) ne comprend flexbox/grid, seuls des tableaux à largeurs FIXES en
 * pixels s'affichent de façon fiable partout. `font-size:1px;line-height:1px`
 * sur les cellules de points/lignes : technique standard pour qu'une cellule
 * de tableau conserve une hauteur précise en email sans dépendre du rendu de
 * texte d'un client à l'autre.
 * ---------------------------------------------------------------------------
 */

import { ROUTES } from '@/lib/routes'

import type { StatutCommande } from '@/types'

const NOIR = '#111210'
const CREME = '#f0ede6'
const BLANC = '#f8f6f1'
const BLEU = '#2f7fc9'
const MUET = '#7a7b76'
const LIGNE = '#e0ddd6'

const LARGEUR_CONTENU = 496
// Point net, ligne fine — pas un bloc plein. Un premier essai à 12px de
// point et 1px de ligne rendait un rectangle bleu épais et continu (les
// points dominaient visuellement), pas la « petite barre mince avec des
// points » demandée par Christian. 8px/2px garde les points visibles sans
// écraser le trait qui les relie.
const COTE_POINT = 8
const EPAISSEUR_LIGNE = 2

function echapper(texte: string): string {
  return texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function image(src: string | null, origine: string): string | null {
  if (!src) return null
  return src.startsWith('http') ? src : `${origine}${src}`
}

/**
 * Parcours horizontal — équivalent email de StatutTimeline.tsx (ui/). Même
 * principe (petits points reliés par un trait fin, un point atteint devient
 * bleu, le reste en gris), même exclusion de `annulee` : ce n'est pas une
 * étape, l'appelant ne fournit `etapes` que pour une commande active.
 *
 * ⚠️ SANS LIBELLÉ PAR ÉTAPE — contrairement à la page web. Un premier essai
 * affichait les cinq statuts sous la barre. Sur Gmail mobile, un tableau à
 * largeurs FIXES en pixels ne se redimensionne pas comme du flexbox : les
 * cinq libellés se sont écrasés les uns sur les autres, illisibles (signalé
 * par Christian, capture à l'appui). Le titre du courriel dit déjà
 * « Nouveau statut : X » juste au-dessus — la barre seule suffit à montrer
 * la progression sans dupliquer cette information dans un espace trop
 * étroit pour la porter proprement.
 */
function construireTimeline(etapes: readonly StatutCommande[], statutActuel: StatutCommande): string {
  const n = etapes.length
  if (n === 0) return ''
  const largeurLigne = n > 1 ? Math.floor((LARGEUR_CONTENU - n * COTE_POINT) / (n - 1)) : 0
  const indexActuel = etapes.indexOf(statutActuel)

  const cellulesPoints = etapes
    .map((_etape, i) => {
      const atteinte = indexActuel >= 0 && i <= indexActuel
      // Carré, pas un cercle — même vocabulaire que StatutTimeline.tsx (page
      // web) et le reste du site (skill 08 : pas de pastille colorée).
      let html = `<td width="${COTE_POINT}" style="width:${COTE_POINT}px;height:${COTE_POINT}px;background:${atteinte ? BLEU : LIGNE};font-size:1px;line-height:1px;">&nbsp;</td>`
      if (i < n - 1) {
        const ligneAtteinte = i < indexActuel
        html += `<td width="${largeurLigne}" style="width:${largeurLigne}px;height:${EPAISSEUR_LIGNE}px;background:${ligneAtteinte ? BLEU : LIGNE};font-size:1px;line-height:1px;">&nbsp;</td>`
      }
      return html
    })
    .join('')

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:${LARGEUR_CONTENU}px;max-width:100%;">
      <tr>${cellulesPoints}</tr>
    </table>`
}

function construireLignes(
  lignes: { nom: string; categorie: string; quantite: number; image: string | null }[],
  origine: string,
): string {
  return lignes
    .map((l) => {
      const src = image(l.image, origine)
      const vignette = src
        ? `<img src="${src}" width="56" height="56" alt="" style="display:block;width:56px;height:56px;object-fit:cover;border:1px solid ${LIGNE};background:${BLANC};">`
        : `<div style="width:56px;height:56px;border:1px solid ${LIGNE};background:${BLANC};"></div>`

      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid ${LIGNE};width:56px;">${vignette}</td>
          <td style="padding:14px 0 14px 16px;border-bottom:1px solid ${LIGNE};font-family:Arial,Helvetica,sans-serif;">
            <div style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:${BLEU};">${echapper(l.categorie)}</div>
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${NOIR};margin-top:2px;">${echapper(l.nom)}</div>
          </td>
          <td style="padding:14px 0 14px 16px;border-bottom:1px solid ${LIGNE};font-family:'Courier New',Courier,monospace;font-size:13px;color:${MUET};text-align:right;white-space:nowrap;vertical-align:top;">
            × ${l.quantite}
          </td>
        </tr>`
    })
    .join('')
}

export function gabaritChangementStatut({
  numero,
  statutLabel,
  statutActuel,
  etapesTimeline,
  libellesStatuts,
  lignes,
  lienCommande,
  origine,
}: {
  numero: string
  statutLabel: string
  /** Statut réel — peut être hors de `etapesTimeline` sur une donnée historique incohérente, voir construireTimeline. */
  statutActuel: StatutCommande
  /** Parcours du MODE de cette commande, sans `annulee` — voir STATUTS_PAR_MODE. */
  etapesTimeline: readonly StatutCommande[]
  libellesStatuts: Record<string, string>
  lignes: { nom: string; categorie: string; quantite: number; image: string | null }[]
  lienCommande: string
  /** Base absolue du site — même paramètre que gabaritCommande.ts, pour les liens légaux du pied. */
  origine: string
}): { html: string; text: string } {
  const timelineHtml = construireTimeline(etapesTimeline, statutActuel)
  const lignesHtml = construireLignes(lignes, origine)

  const html = `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:${CREME};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREME};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" style="max-width:560px;background:${BLANC};" cellpadding="0" cellspacing="0">

          <tr>
            <td style="background:${NOIR};padding:28px 32px;">
              <span style="font-family:'Courier New',Courier,monospace;font-size:14px;letter-spacing:.1em;color:${BLANC};text-transform:uppercase;">KO-LAB</span>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 32px 0;">
              <span style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:${BLEU};">Commande ${echapper(numero)}</span>
              <h1 style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:24px;color:${NOIR};">Nouveau statut : ${echapper(statutLabel)}</h1>
            </td>
          </tr>

          ${
            timelineHtml
              ? `<tr>
            <td style="padding:24px 32px 0;">
              ${timelineHtml}
            </td>
          </tr>`
              : ''
          }

          ${
            lignes.length > 0
              ? `<tr>
            <td style="padding:24px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${lignesHtml}
              </table>
            </td>
          </tr>`
              : ''
          }

          <tr>
            <td style="padding:28px 32px 32px;">
              <a href="${lienCommande}" style="display:inline-block;background:${BLEU};color:${BLANC};font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;padding:14px 28px;">
                Voir ma commande
              </a>
              <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUET};">
                Si vous n'étiez pas connecté au moment d'ouvrir ce lien, on vous demandera de vous
                connecter avant d'afficher la commande.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:${NOIR};padding:24px 32px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${BLANC};">De l'idée au terrain.</p>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUET};">
                Outaouais, Québec · <a href="mailto:info@ko-lab.ca" style="color:${MUET};">info@ko-lab.ca</a>
              </p>
              <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUET};">
                <a href="${origine}/fr${ROUTES.politiqueConfidentialite}" style="color:${MUET};">Politique de confidentialité</a>
                &nbsp;·&nbsp;
                <a href="${origine}/fr${ROUTES.conditionsUtilisation}" style="color:${MUET};">Conditions d'utilisation</a>
              </p>
              <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUET};">
                Courriel envoyé automatiquement, inutile d'y répondre.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    `Commande ${numero}`,
    `Nouveau statut : ${statutLabel}`,
    '',
    `Parcours : ${etapesTimeline.map((e) => libellesStatuts[e] ?? e).join(' > ')}`,
    '',
    ...(lignes.length > 0 ? lignes.map((l) => `— ${l.nom} × ${l.quantite}`) : []),
    '',
    lienCommande,
    '',
    `Si vous n'étiez pas connecté au moment d'ouvrir ce lien, on vous demandera`,
    `de vous connecter avant d'afficher la commande.`,
    '',
    `Politique de confidentialité : ${origine}/fr${ROUTES.politiqueConfidentialite}`,
    `Conditions d'utilisation : ${origine}/fr${ROUTES.conditionsUtilisation}`,
  ].join('\n')

  return { html, text }
}
