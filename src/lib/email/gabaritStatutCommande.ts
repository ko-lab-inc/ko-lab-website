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
 * Volontairement plus court que gabaritCommande.ts (confirmation initiale,
 * avec produits et images) : ce courriel n'annonce qu'un changement d'état,
 * pas le contenu de la commande — même style (bandeau noir, accent bleu),
 * même lien vers /compte/commandes/[id] pour le détail complet.
 * ---------------------------------------------------------------------------
 */

import { ROUTES } from '@/lib/routes'

const NOIR = '#111210'
const CREME = '#f0ede6'
const BLANC = '#f8f6f1'
const BLEU = '#2f7fc9'
const MUET = '#7a7b76'

function echapper(texte: string): string {
  return texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function gabaritChangementStatut({
  numero,
  statutLabel,
  lienCommande,
  origine,
}: {
  numero: string
  statutLabel: string
  lienCommande: string
  /** Base absolue du site — même paramètre que gabaritCommande.ts, pour les liens légaux du pied. */
  origine: string
}): { html: string; text: string } {
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
