/**
 * Gabarit HTML du courriel de confirmation de commande — migration 0021.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE FICHIER EXISTE
 *
 * Demande explicite de Christian après avoir vu le courriel initial (texte
 * brut) : il veut un courriel illustré — produits, images, prix, politique —
 * comparable à ce qu'envoie un vrai commerce en ligne (Temu, montré en
 * référence visuelle). Extrait dans son propre module plutôt que gardé en
 * ligne dans l'action : le HTML d'un courriel compatible avec les clients de
 * messagerie (styles EN LIGNE partout, tableaux plutôt que flexbox/grid —
 * Outlook desktop ignore les deux) est verbeux, et n'a rien à faire au milieu
 * de la logique métier de creerCommande.
 *
 * ---------------------------------------------------------------------------
 * MÊME STRUCTURE DE CONTENU QUE /compte/commandes/[id]
 *
 * Numéro en gros titre, statut/date/livraison sur une ligne, fenêtre de 48h
 * avec sa date d'expiration EXACTE — même vocabulaire que
 * `Commande.fenetre_ouverte_texte` (page.tsx), pas un texte réinventé pour
 * l'occasion. Une personne qui reçoit ce courriel puis ouvre la page doit
 * reconnaître la même commande dite dans les mêmes mots.
 *
 * ---------------------------------------------------------------------------
 * CE QUI N'EST DÉLIBÉRÉMENT PAS REPRIS DU MODÈLE (Temu, montré en référence)
 *
 * Aucun moyen de paiement, aucun badge « paiement sécurisé », aucune
 * politique de retours, aucun compte à rebours ni urgence artificielle :
 * KO-LAB ne prend aucun paiement en ligne et n'offre aucune politique de
 * retour formelle aujourd'hui — affirmer le contraire mentirait sur ce qui
 * vient de se passer. Ce qui est repris, c'est la structure qui rend un
 * courriel de commande utile : la liste illustrée des produits, les prix, un
 * total, et une explication claire de la suite.
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

const DATE_LONGUE: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
const DATE_HEURE: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }

function formaterDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  // fr-CA directement plutôt que next-intl's getFormatter() : ce module est
  // appelé depuis une Server Action, pas depuis un composant — pas de contexte
  // de requête ici. Mêmes options que /compte/commandes/[id] (page.tsx), pour
  // que la même commande s'affiche dans les mêmes mots aux deux endroits.
  return new Intl.DateTimeFormat('fr-CA', options).format(date)
}

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
  creeLe,
  fenetreExpireLe,
  lignes,
  modeLivraison,
  adresseLivraison,
  lienCommande,
  origine,
}: {
  numero: string
  /** `commandes.created_at` — affiché dans la ligne de statut, comme sur /compte/commandes/[id]. */
  creeLe: Date
  /** `commandes.fenetre_modification_expire_at` — date/heure EXACTE, pas « dans 48h ». */
  fenetreExpireLe: Date
  lignes: LigneEmailCommande[]
  modeLivraison: 'ramassage' | 'expedition'
  adresseLivraison: string | null
  lienCommande: string
  origine: string
}): { html: string; text: string } {
  const total = lignes.reduce((somme, l) => (l.prix != null ? somme + l.prix * l.quantite : somme), 0)
  const auMoinsUnPrixManquant = lignes.some((l) => l.prix == null)
  const libelleLivraison = modeLivraison === 'expedition' ? 'Expédition' : 'Ramassage sur place'
  const dateCreation = formaterDate(creeLe, DATE_LONGUE)
  const dateExpiration = formaterDate(fenetreExpireLe, DATE_HEURE)

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
      ? `<p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${MUET};white-space:pre-line;">${echapper(adresseLivraison)}</p>`
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

          <!-- numéro de commande, en gros — même traitement que /compte/commandes/[id] -->
          <tr>
            <td style="padding:32px 32px 0;">
              <span style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:${BLEU};">Commande</span>
              <h1 style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:32px;color:${NOIR};">${echapper(numero)}</h1>
            </td>
          </tr>

          <!-- ligne de statut : reçue le, mode de livraison -->
          <tr>
            <td style="padding:12px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MUET};">
              Commande reçue le ${dateCreation} · ${libelleLivraison}
            </td>
          </tr>

          <!-- rappel fenêtre 48h — même texte que fenetre_ouverte_texte -->
          <tr>
            <td style="padding:16px 32px 0;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${NOIR};">
                Vous pouvez ajouter des articles ou modifier les quantités jusqu'au
                <strong>${dateExpiration}</strong>. Passé ce délai, la commande se ferme et
                notre équipe entame la préparation.
              </p>
            </td>
          </tr>

          <!-- produits -->
          <tr>
            <td style="padding:24px 32px 0;">
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
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUET};">
                ${auMoinsUnPrixManquant ? 'Hors produits à prix sur demande. ' : ''}Prix indicatifs — on revient vers vous pour les confirmer.
              </p>
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

          <!-- CTA -->
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

          <!-- pied -->
          <tr>
            <td style="background:${NOIR};padding:24px 32px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${BLANC};">De l'idée au terrain.</p>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUET};">
                Outaouais, Québec · <a href="mailto:info@ko-lab-center.ca" style="color:${MUET};">info@ko-lab-center.ca</a>
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
    `Reçue le ${dateCreation} · ${libelleLivraison}`,
    '',
    `Vous pouvez ajouter des articles ou modifier les quantités jusqu'au ${dateExpiration}.`,
    `Passé ce délai, la commande se ferme et notre équipe entame la préparation.`,
    '',
    ...lignes.map(
      (l) => `— ${l.nom} × ${l.quantite}${l.prix != null ? ` (${formaterPrix(l.prix * l.quantite)})` : ' (sur demande)'}`,
    ),
    '',
    `Total indicatif : ${formaterPrix(total)}`,
    `Prix indicatifs — on revient vers vous pour les confirmer.`,
    '',
    `Mode de livraison : ${libelleLivraison}`,
    ...(modeLivraison === 'expedition' && adresseLivraison ? [adresseLivraison] : []),
    '',
    lienCommande,
    '',
    `Si vous n'étiez pas connecté au moment d'ouvrir ce lien, on vous demandera`,
    `de vous connecter avant d'afficher la commande.`,
  ].join('\n')

  return { html, text }
}
