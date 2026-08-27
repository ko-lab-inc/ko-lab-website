/**
 * Gabarit HTML — invitation à créer un compte, migration 0045 (étape 2/3).
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE COURRIEL NE PASSE PAS PAR LE MAILER SUPABASE
 *
 * `inviterUtilisateur` (admin/utilisateurs/actions.ts) crée le compte et
 * génère le lien via l'API Admin (`createUser` + `generateLink`), mais
 * l'ENVOI passe par Resend — jamais `auth.admin.inviteUserByEmail`, qui
 * expédierait par le mailer intégré de Supabase. Ce mailer a déjà épuisé son
 * quota une fois sur ce projet (voir la note de `inscrire()`,
 * connexion/actions-compte.ts) ; Resend est déjà configuré et vérifié sur
 * ko-lab-center.ca pour tout le reste des courriels transactionnels.
 *
 * Même charpente que gabaritStatutCommande.ts (tableau à largeurs fixes en
 * pixels — aucun client de bureau, Outlook au premier chef, ne comprend
 * flexbox/grid en email).
 *
 * ---------------------------------------------------------------------------
 * FRANÇAIS SEUL, PAS BILINGUE — même raisonnement que gabaritStatutCommande.ts
 *
 * Le courriel est déclenché depuis /admin/utilisateurs, un écran d'équipe qui
 * reste hors périmètre bilingue (Phase 9). La langue de CE courriel reflète
 * qui a cliqué « Inviter », pas une préférence de la personne invitée — rien
 * ne permet de connaître celle-ci avant qu'elle n'ait de compte.
 * ---------------------------------------------------------------------------
 */

import { EMAILS } from '@/lib/constantes'
import { ROUTES } from '@/lib/routes'

const NOIR = '#111210'
const CREME = '#f0ede6'
const BLANC = '#fafafa'
const BLEU = '#61b4db'
const MUET = '#7a7b76'

function echapper(texte: string): string {
  return texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function gabaritInvitation({
  roleLabel,
  lienInvitation,
  origine,
}: {
  /** Libellé du rôle déjà résolu (« Vendeur », « Administrateur »…). */
  roleLabel: string
  lienInvitation: string
  /** Base absolue du site — pour les liens légaux du pied, même paramètre que les autres gabarits. */
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
              <span style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:${MUET};">Invitation</span>
              <h1 style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:24px;color:${NOIR};">Vous êtes invité·e chez KO-LAB</h1>
              <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${NOIR};">
                Un compte vient d'être créé pour vous, avec le rôle <strong>${echapper(roleLabel)}</strong>.
                Cliquez sur le bouton ci-dessous pour choisir votre mot de passe et activer votre accès.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 8px;">
              <a href="${lienInvitation}" style="display:inline-block;background:${BLEU};color:${NOIR};font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;padding:14px 28px;">
                Activer mon compte
              </a>
              <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUET};">
                Ce lien est à usage unique et expire après un délai limité. S'il ne fonctionne
                plus, demandez à la personne qui vous a invité·e de vous en envoyer un nouveau.
              </p>
              <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUET};">
                Vous ne vous attendiez pas à ce courriel ? Vous pouvez l'ignorer — aucun accès
                n'est activé tant que ce lien n'a pas été utilisé.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:${NOIR};padding:24px 32px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${BLANC};">De l'idée au terrain.</p>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUET};">
                Outaouais, Québec · <a href="mailto:${EMAILS.info}" style="color:${MUET};">${EMAILS.info}</a>
              </p>
              <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUET};">
                <a href="${origine}/fr${ROUTES.politiqueConfidentialite}" style="color:${MUET};">Politique de confidentialité</a>
                &nbsp;·&nbsp;
                <a href="${origine}/fr${ROUTES.conditionsUtilisation}" style="color:${MUET};">Conditions d'utilisation</a>
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
    'Vous êtes invité·e chez KO-LAB',
    '',
    `Un compte vient d'être créé pour vous, avec le rôle ${roleLabel}.`,
    'Ouvrez ce lien pour choisir votre mot de passe et activer votre accès :',
    lienInvitation,
    '',
    "Ce lien est à usage unique et expire après un délai limité.",
    "Vous ne vous attendiez pas à ce courriel ? Vous pouvez l'ignorer.",
    '',
    `Politique de confidentialité : ${origine}/fr${ROUTES.politiqueConfidentialite}`,
    `Conditions d'utilisation : ${origine}/fr${ROUTES.conditionsUtilisation}`,
  ].join('\n')

  return { html, text }
}
