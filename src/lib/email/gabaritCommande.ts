/**
 * Gabarit HTML du courriel de confirmation de commande — migration 0021.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE FICHIER EXISTE
 *
 * Demande explicite de Christian après avoir vu le courriel initial (texte
 * brut) : il veut un courriel illustré — produits, images, prix, politique —
 * comparable à ce qu'envoie un vrai commerce en ligne. Extrait dans son
 * propre module plutôt que gardé en ligne dans l'action : le HTML d'un
 * courriel compatible avec les clients de messagerie (styles EN LIGNE
 * partout, tableaux plutôt que flexbox/grid — Outlook desktop ignore les
 * deux) est verbeux, et n'a rien à faire au milieu de la logique métier de
 * creerCommande.
 *
 * ---------------------------------------------------------------------------
 * CE QUI N'EST DÉLIBÉRÉMENT PAS REPRIS DU MODÈLE (Temu, montré en référence)
 *
 * Aucun moyen de paiement, aucun coupon, aucune mention de retours gratuits
 * ou de programme écologique : KO-LAB ne prend aucun paiement en ligne et ne
 * vend rien de ce type — reprendre ce vocabulaire tel quel mentirait sur ce
 * qui vient de se passer. Ce qui est repris, en revanche, c'est la structure
 * qui rend un courriel de commande utile : la liste illustrée des produits,
 * les prix, un total, et une explication claire de la suite.
 *
 * ---------------------------------------------------------------------------
 * IMAGES : URL ABSOLUE OBLIGATOIRE
 *
 * `ProduitCarte.src` est parfois un chemin LOCAL (`/images/produits/...`,
 * les douze produits d'origine de 0007) et parfois une URL Supabase Storage
 * déjà absolue (produits ajoutés depuis /admin/catalogue) — voir
 * lib/utils/premiereImage.ts. Un chemin local ne veut rien dire dans un
 * client de messagerie, qui n'a pas de notion d'« origine courante » :
 * `image()` ci-dessous préfixe systématiquement avec `origine`.
 * ---------------------------------------------------------------------------
 */

export type LigneEmailCommande = {
  nom: string
  categorie: string
  quantite: number
  prix: number | null
  /** Chemin local ou URL absolue — voir la note d'en-tête. `null` si le produit n'a pas de photo. */
  image: string | null
}

const NOIR = '#111210'
const CREME = '#f0ede6'
const BLANC = '#f8f6f1'
const BLEU = '#2f7fc9'
const MUET = '#7a7b76'
const LIGNE = '#e0ddd6'

function formaterPrix(valeur: number): string {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(valeur)
}

/** Échappe le texte inséré dans le HTML — noms de produits notamment, saisis par l'équipe via /admin/catalogue. */
function echapper(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function image(src: string | null, origine: string): string | null {
  if (!src) return null
  return src.startsWith('http') ? src : `${origine}${src}`
}

export function gabaritConfirmationCommande({
  numero,
  lignes,
  modeLivraison,
  adresseLivraison,
  lienCommande,
  origine,
}: {
  numero: string
  lignes: LigneEmailCommande[]
  modeLivraison: 'ramassage' | 'expedition'
  adresseLivraison: string | null
  lienCommande: string
  origine: string
}): { html: string; text: string } {
  const total = lignes.reduce((somme, l) => (l.prix != null ? somme + l.prix * l.quantite : somme), 0)
  const auMoinsUnPrixManquant = lignes.some((l) => l.prix == null)
  const libelleLivraison = modeLivraison === 'expedition' ? 'Expédition' : 'Ramassage sur place'

  const lignesHtml = lignes
    .map((l) => {
      const src = image(l.image, origine)
      const vignette = src
        ? `<img src="${src}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;object-fit:cover;border:1px solid ${LIGNE};background:${BLANC};">`
        : `<div style="width:64px;height:64px;border:1px solid ${LIGNE};background:${BLANC};"></div>`

      return `
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid ${LIGNE};width:64px;">${vignette}</td>
          <td style="padding:16px 0 16px 16px;border-bottom:1px solid ${LIGNE};font-family:Arial,Helvetica,sans-serif;">
            <div style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:${BLEU};">${echapper(l.categorie)}</div>
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:${NOIR};margin-top:4px;">${echapper(l.nom)}</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MUET};margin-top:4px;">Quantité : ${l.quantite}</div>
          </td>
          <td style="padding:16px 0 16px 16px;border-bottom:1px solid ${LIGNE};font-family:'Courier New',Courier,monospace;font-size:14px;color:${NOIR};text-align:right;white-space:nowrap;vertical-align:top;">
            ${l.prix != null ? formaterPrix(l.prix * l.quantite) : 'Sur demande'}
          </td>
        </tr>`
    })
    .join('')

  const adresseHtml =
    modeLivraison === 'expedition' && adresseLivraison
      ? `<p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${MUET};">${echapper(adresseLivraison)}</p>`
      : ''

  const html = `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:${CREME};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREME};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" style="max-width:560px;background:${BLANC};" cellpadding="0" cellspacing="0">

          <!-- en-tête -->
          <tr>
            <td style="background:${NOIR};padding:28px 32px;">
              <span style="font-family:'Courier New',Courier,monospace;font-size:14px;letter-spacing:.1em;color:${BLANC};text-transform:uppercase;">KO-LAB</span>
            </td>
          </tr>

          <!-- titre -->
          <tr>
            <td style="padding:32px 32px 8px;">
              <span style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:${BLEU};">Commande ${echapper(numero)}</span>
              <h1 style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:26px;color:${NOIR};">Merci pour votre commande</h1>
              <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${MUET};">
                Nous l'avons bien reçue. Les prix ci-dessous restent indicatifs — notre équipe vous
                recontacte pour les confirmer avant de lancer la préparation.
              </p>
            </td>
          </tr>

          <!-- produits -->
          <tr>
            <td style="padding:16px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${lignesHtml}
                <tr>
                  <td colspan="2" style="padding:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${NOIR};font-weight:bold;">
                    Total indicatif
                  </td>
                  <td style="padding:16px 0 0;font-family:'Courier New',Courier,monospace;font-size:15px;color:${NOIR};font-weight:bold;text-align:right;white-space:nowrap;">
                    ${formaterPrix(total)}
                  </td>
                </tr>
              </table>
              ${
                auMoinsUnPrixManquant
                  ? `<p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUET};">Hors produits à prix sur demande.</p>`
                  : ''
              }
            </td>
          </tr>

          <!-- livraison -->
          <tr>
            <td style="padding:28px 32px 0;">
              <span style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:${MUET};">Mode de livraison</span>
              <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${NOIR};">${libelleLivraison}</p>
              ${adresseHtml}
            </td>
          </tr>

          <!-- suite -->
          <tr>
            <td style="padding:28px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREME};">
                <tr>
                  <td style="padding:20px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${NOIR};">
                    Vous pouvez ajouter des articles ou modifier les quantités pendant
                    <strong>48&nbsp;heures</strong> depuis votre compte. Passé ce délai, la commande
                    se ferme et notre équipe entame la préparation.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:24px 32px 32px;">
              <a href="${lienCommande}" style="display:inline-block;background:${BLEU};color:${BLANC};font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;padding:14px 28px;">
                Voir ma commande
              </a>
              <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUET};">
                Si vous n'étiez pas connecté au moment d'ouvrir ce lien, on vous demandera de vous
                connecter avant d'afficher la commande.
              </p>
            </td>
          </tr>

          <!-- pied -->
          <tr>
            <td style="background:${NOIR};padding:24px 32px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${BLANC};">De l'idée au terrain.</p>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUET};">
                Outaouais, Québec · <a href="mailto:info@ko-lab.ca" style="color:${MUET};">info@ko-lab.ca</a>
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
    '',
    ...lignes.map(
      (l) => `— ${l.nom} × ${l.quantite}${l.prix != null ? ` (${formaterPrix(l.prix * l.quantite)})` : ' (sur demande)'}`,
    ),
    '',
    `Total indicatif : ${formaterPrix(total)}`,
    '',
    `Mode de livraison : ${libelleLivraison}`,
    ...(modeLivraison === 'expedition' && adresseLivraison ? [adresseLivraison] : []),
    '',
    `Vous pouvez ajouter des articles ou modifier les quantités pendant 48 heures`,
    `depuis votre compte — les prix ne sont pas encore finaux, on revient vers`,
    `vous pour les confirmer :`,
    lienCommande,
    '',
    `Si vous n'étiez pas connecté au moment d'ouvrir ce lien, on vous demandera`,
    `de vous connecter avant d'afficher la commande.`,
  ].join('\n')

  return { html, text }
}
