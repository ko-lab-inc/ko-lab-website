import { EMAILS } from '@/lib/constantes'

import type { AppLocale } from '@/i18n/routing'

/**
 * Gabarits des trois courriels ajoutés le 2 octobre 2026.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI DU TEXTE BRUT, ET PAS DU HTML COMME gabaritCommande.ts
 *
 * Les deux gabarits de commande sont du HTML mis en page parce qu'ils
 * montrent des PRODUITS : des photos, une grille de lignes, une frise de
 * statuts. Il y a quelque chose à voir.
 *
 * Les trois ci-dessous ne montrent rien. Une notification interne de
 * candidature est lue en diagonale sur un téléphone pour décider s'il faut
 * rappeler quelqu'un ; un accusé de réception tient en deux phrases. Les
 * habiller en HTML ajouterait du poids, un risque de rendu cassé selon le
 * client de messagerie, et rien d'utile. Le texte brut arrive toujours intact.
 *
 * Exception : l'accusé de réception part vers un PROSPECT, donc il porte la
 * signature complète. Ce n'est pas de la décoration, c'est savoir qui écrit.
 * ---------------------------------------------------------------------------
 *
 * LANGUE — l'accusé et le courriel « traitée » suivent `demandes_contact.locale`,
 * posée à la soumission (migration 0049), JAMAIS la locale de la route admin.
 * Voir la note de gabaritStatutCommande.ts, qui décrit le piège inverse : un
 * courriel en anglais envoyé à un client francophone parce qu'un membre de
 * l'équipe avait ouvert /en/admin/.
 */

/* ========================================================================== */
/* 1. Notification interne — une candidature vient d'arriver                  */
/* ========================================================================== */

export function gabaritNouvelleCandidature({
  nom,
  email,
  telephone,
  ville,
  postes,
  disponibilites,
  aExperience,
  travailExterieur,
  avecCv,
  lienAdmin,
}: {
  nom: string
  email: string
  telephone: string
  ville: string
  postes: readonly string[]
  disponibilites: string
  aExperience: boolean
  travailExterieur: boolean
  avecCv: boolean
  lienAdmin: string
}): { sujet: string; texte: string } {
  return {
    // Le nom et la ville dans l'objet : la liste des courriels suffit souvent
    // à décider si ça vaut un rappel aujourd'hui ou lundi.
    sujet: `Nouvelle candidature — ${nom}${ville ? `, ${ville}` : ''}`,
    texte: [
      `${nom} vient de postuler sur ko-lab-center.ca.`,
      '',
      `Postes        : ${postes.length > 0 ? postes.join(', ') : '—'}`,
      `Ville         : ${ville || '—'}`,
      `Courriel      : ${email}`,
      `Téléphone     : ${telephone || '—'}`,
      `Disponibilités: ${disponibilites || '—'}`,
      `Expérience    : ${aExperience ? 'oui' : 'non'}`,
      `Travail ext.  : ${travailExterieur ? 'oui' : 'non'}`,
      // Le CV n'est PAS joint : il vit dans un bucket privé et une pièce
      // jointe en ferait une copie hors de tout contrôle d'accès. Le lien
      // vers l'admin est le seul chemin, et il exige une session.
      `CV joint      : ${avecCv ? 'oui — à ouvrir depuis l’espace équipe' : 'non'}`,
      '',
      `Dossier complet : ${lienAdmin}`,
      '',
      'Répondre à ce courriel écrit directement au candidat.',
    ].join('\n'),
  }
}

/* ========================================================================== */
/* 2. Accusé de réception — vers le demandeur                                 */
/* ========================================================================== */

export function gabaritAccuseReception({
  nom,
  locale,
}: {
  nom: string
  locale: AppLocale
}): { sujet: string; texte: string } {
  if (locale === 'en') {
    return {
      sujet: 'We received your request — KO-LAB',
      texte: [
        `Hello ${nom},`,
        '',
        'We received your request and someone from the team will get back to you',
        'within 48 hours.',
        '',
        'If your project is time-sensitive, reply to this email with the dates and',
        'the location — it helps us answer faster.',
        '',
        '—',
        'KO-LAB Inc. · From idea to field.',
        `Outaouais, Québec · ${EMAILS.info}`,
      ].join('\n'),
    }
  }

  return {
    sujet: 'Nous avons bien reçu votre demande — KO-LAB',
    texte: [
      `Bonjour ${nom},`,
      '',
      'Nous avons bien reçu votre demande. Quelqu’un de l’équipe revient vers vous',
      'dans les 48 heures.',
      '',
      'Si le projet est urgent, répondez à ce courriel en indiquant les dates et le',
      'lieu — ça nous permet de répondre plus vite.',
      '',
      '—',
      'KO-LAB Inc. · De l’idée au terrain.',
      `Outaouais, Québec · ${EMAILS.info}`,
    ].join('\n'),
  }
}

/* ========================================================================== */
/* 3. Demande traitée — vers le demandeur                                     */
/* ========================================================================== */

/**
 * ⚠️ Ce courriel dit que le DOSSIER est clos côté KO-LAB, pas que le projet
 * est accepté, livré ou refusé — la base ne sait rien de tout ça, elle ne
 * connaît que trois statuts (nouveau, lu, traité). Le texte reste donc
 * délibérément neutre et renvoie vers une vraie personne : promettre plus
 * que ce que la donnée contient est le travers que ce courriel doit éviter.
 */
export function gabaritDemandeTraitee({
  nom,
  locale,
}: {
  nom: string
  locale: AppLocale
}): { sujet: string; texte: string } {
  if (locale === 'en') {
    return {
      sujet: 'Your request has been handled — KO-LAB',
      texte: [
        `Hello ${nom},`,
        '',
        'Your request has been handled by our team.',
        '',
        'If you have not heard from us directly, or if something is still open on',
        'your side, simply reply to this email — it reaches us.',
        '',
        '—',
        'KO-LAB Inc. · From idea to field.',
        `Outaouais, Québec · ${EMAILS.info}`,
      ].join('\n'),
    }
  }

  return {
    sujet: 'Votre demande a été traitée — KO-LAB',
    texte: [
      `Bonjour ${nom},`,
      '',
      'Votre demande a été traitée par notre équipe.',
      '',
      'Si vous n’avez pas eu de nouvelles directement, ou s’il reste quelque chose',
      'en suspens de votre côté, répondez simplement à ce courriel — il nous',
      'parvient.',
      '',
      '—',
      'KO-LAB Inc. · De l’idée au terrain.',
      `Outaouais, Québec · ${EMAILS.info}`,
    ].join('\n'),
  }
}
