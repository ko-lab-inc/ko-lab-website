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
 * Même charpente à largeurs fixes en pixels que les autres gabarits — aucun
 * client de bureau, Outlook au premier chef, ne comprend flexbox/grid en
 * email.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ BILINGUE — décision renversée le 27 août 2026 (Moussa)
 *
 * Ce gabarit était français seul, sur le raisonnement que « la langue
 * reflète qui a cliqué Inviter, pas une préférence de la personne invitée ».
 * Ce raisonnement ne tenait pas POUR CE COURRIEL PRÉCIS : contrairement à
 * gabaritStatutCommande.ts (un client qui a déjà commandé, dans une langue
 * qu'il a choisie), l'invité n'a encore AUCUN compte au moment de la
 * réception — aucune préférence n'a jamais pu s'exprimer, et un livreur
 * anglophone recevrait son invitation dans une langue qu'il ne lit peut-être
 * pas. Le gabarit affiche donc désormais les DEUX langues, séparées par un
 * filet, chacune avec son propre bouton vers sa propre page
 * /mot-de-passe/nouveau (`suivant=/fr/...` ou `suivant=/en/...`) — la
 * personne choisit elle-même en cliquant, personne ne devine à sa place.
 * `lang="fr"` sur l'élément racine devient trompeur pour la moitié anglaise
 * du document ; retiré plutôt que mal renseigné (aucune alternative simple
 * ne décrit un HTML mixte FR+EN dans un seul `lang`).
 *
 * ---------------------------------------------------------------------------
 * IDENTITÉ VISUELLE — alignée sur le gabarit Supabase (27 août 2026)
 *
 * Fond #f5f5f5, carte blanche, bordure #e5e5e5, bouton NOIR (#111210) à
 * texte blanc — jamais le bleu #61b4db, qui échoue le contraste AA en texte
 * (2,32:1, voir CLAUDE.md, table de contraste). Rupture volontaire avec les
 * autres gabarits (bandeau noir plein en tête/pied) : ce courriel-ci suit le
 * même habillage que celui déjà posé par Moussa côté Supabase, pas le style
 * des notifications de commande.
 * ---------------------------------------------------------------------------
 */

import { EMAILS } from '@/lib/constantes'
import { ROUTES } from '@/lib/routes'

import type { Role } from '@/types'

const FOND = '#f5f5f5'
const CARTE = '#ffffff'
const BORDURE = '#e5e5e5'
const NOIR = '#111210'
const MUET = '#7a7b76'

/**
 * Libellés de rôle, dans les deux langues — n'existent nulle part ailleurs
 * sous cette forme : `messages/en.json` duplique le FRANÇAIS pour
 * l'espace `Admin` (convention « admin reste français », voir CLAUDE.md),
 * `getTranslations({locale:'en', namespace:'Admin'})` aurait donc renvoyé
 * « Vendeur », pas « Salesperson ». Ce petit lexique est local à ce fichier
 * exprès : c'est le seul endroit du projet où un libellé de rôle part
 * réellement en anglais, vers quelqu'un qui n'a pas encore de compte pour
 * choisir sa langue lui-même.
 */
const LIBELLES_ROLE: Record<Role, { fr: string; en: string }> = {
  admin: { fr: 'Administrateur', en: 'Administrator' },
  editor: { fr: 'Éditeur', en: 'Editor' },
  vendeur: { fr: 'Vendeur', en: 'Salesperson' },
  livreur: { fr: 'Livreur', en: 'Delivery driver' },
  client: { fr: 'Client', en: 'Customer' },
}

function echapper(texte: string): string {
  return texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Filet horizontal — technique standard en email (cellule de 1px, jamais de `<hr>`, mal supporté). */
function filet(): string {
  return `<tr><td style="padding:24px 32px;"><div style="border-top:1px solid ${BORDURE};font-size:1px;line-height:1px;">&nbsp;</div></td></tr>`
}

export function gabaritInvitation({
  role,
  lienInvitationFr,
  lienInvitationEn,
  origine,
}: {
  /** Rôle brut (admin/editor/vendeur/livreur/client) — les deux libellés sont résolus ici, voir LIBELLES_ROLE. */
  role: Role
  lienInvitationFr: string
  lienInvitationEn: string
  /** Base absolue du site — pour les liens légaux du pied, même paramètre que les autres gabarits. */
  origine: string
}): { html: string; text: string } {
  const { fr: roleFr, en: roleEn } = LIBELLES_ROLE[role]

  const bouton = (lien: string, texte: string) => `
              <a href="${lien}" style="display:inline-block;background:${NOIR};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;padding:14px 28px;">
                ${echapper(texte)}
              </a>`

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:${FOND};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FOND};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" style="max-width:560px;background:${CARTE};border:1px solid ${BORDURE};" cellpadding="0" cellspacing="0">

          <tr>
            <td style="padding:32px 32px 0;">
              <span style="font-family:'Courier New',Courier,monospace;font-size:14px;letter-spacing:.1em;color:${NOIR};text-transform:uppercase;">KO-LAB</span>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 0;">
              <span style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:${MUET};">Invitation</span>
              <h1 style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:22px;color:${NOIR};">Vous êtes invité·e chez KO-LAB</h1>
              <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${NOIR};">
                Un compte vient d'être créé pour vous, avec le rôle <strong>${echapper(roleFr)}</strong>.
                Cliquez sur le bouton ci-dessous pour choisir votre mot de passe et activer votre accès.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 0;">
              ${bouton(lienInvitationFr, 'Activer mon compte')}
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

          ${filet()}

          <tr>
            <td style="padding:0 32px 0;">
              <span style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:${MUET};">Invitation</span>
              <h1 style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:22px;color:${NOIR};">You've been invited to join KO-LAB</h1>
              <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${NOIR};">
                An account has just been created for you, with the role <strong>${echapper(roleEn)}</strong>.
                Click the button below to choose your password and activate your access.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 32px;">
              ${bouton(lienInvitationEn, 'Activate my account')}
              <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUET};">
                This link is single-use and expires after a limited time. If it no longer
                works, ask the person who invited you to send you a new one.
              </p>
              <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUET};">
                Weren't expecting this email? You can ignore it — no access is activated
                until this link is used.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;border-top:1px solid ${BORDURE};">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUET};">
                KO-LAB · Outaouais, Québec · <a href="mailto:${EMAILS.info}" style="color:${MUET};">${EMAILS.info}</a>
              </p>
              <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUET};">
                <a href="${origine}/fr${ROUTES.politiqueConfidentialite}" style="color:${MUET};">Politique de confidentialité</a>
                &nbsp;·&nbsp;
                <a href="${origine}/fr${ROUTES.conditionsUtilisation}" style="color:${MUET};">Conditions d'utilisation</a>
              </p>
              <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUET};">
                <a href="${origine}/en${ROUTES.politiqueConfidentialite}" style="color:${MUET};">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="${origine}/en${ROUTES.conditionsUtilisation}" style="color:${MUET};">Terms of Use</a>
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
    `Un compte vient d'être créé pour vous, avec le rôle ${roleFr}.`,
    'Ouvrez ce lien pour choisir votre mot de passe et activer votre accès :',
    lienInvitationFr,
    '',
    'Ce lien est à usage unique et expire après un délai limité.',
    "Vous ne vous attendiez pas à ce courriel ? Vous pouvez l'ignorer.",
    '',
    '----------------------------------------',
    '',
    "You've been invited to join KO-LAB",
    '',
    `An account has just been created for you, with the role ${roleEn}.`,
    'Open this link to choose your password and activate your access:',
    lienInvitationEn,
    '',
    'This link is single-use and expires after a limited time.',
    "Weren't expecting this email? You can ignore it.",
    '',
    'KO-LAB · Outaouais, Québec',
    `Politique de confidentialité : ${origine}/fr${ROUTES.politiqueConfidentialite}`,
    `Conditions d'utilisation : ${origine}/fr${ROUTES.conditionsUtilisation}`,
    `Privacy Policy: ${origine}/en${ROUTES.politiqueConfidentialite}`,
    `Terms of Use: ${origine}/en${ROUTES.conditionsUtilisation}`,
  ].join('\n')

  return { html, text }
}
