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
  delaiHeures,
  absence = null,
}: {
  nom: string
  locale: AppLocale
  /** Reglage `delai_reponse_heures` (migration 0051). Ecrit en dur a 48
   *  jusqu'au 2 octobre 2026, comme les quatre autres endroits du site qui
   *  font la meme promesse — et qui divergeaient des que l'un changeait. */
  delaiHeures: number
  /**
   * Message d'absence (migration 0053), ou `null` en fonctionnement normal.
   *
   * ⚠️ Quand il est fourni, il REMPLACE la phrase de délai au lieu de s'y
   * ajouter. Un courriel qui dirait « nous revenons vers vous dans les 48
   * heures » puis « nous sommes fermés jusqu'au 6 janvier » se contredirait
   * dans le même paragraphe, et c'est la première promesse que le destinataire
   * retiendrait. Voir `messageAbsence()` dans lib/reglages.ts.
   */
  absence?: string | null
}): { sujet: string; texte: string } {
  if (locale === 'en') {
    return {
      sujet: 'We received your request — KO-LAB',
      texte: [
        `Hello ${nom},`,
        '',
        ...(absence
          ? ['We received your request.', '', absence]
          : [
              'We received your request and someone from the team will get back to you',
              `within ${delaiHeures} hours.`,
            ]),
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
      ...(absence
        ? ['Nous avons bien reçu votre demande.', '', absence]
        : [
            'Nous avons bien reçu votre demande. Quelqu’un de l’équipe revient vers vous',
            `dans les ${delaiHeures} heures.`,
          ]),
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


/* ========================================================================== */
/* 4. Accusé de réception — vers le CANDIDAT                                  */
/* ========================================================================== */

/**
 * ⚠️ CE QU'IL NE DOIT SURTOUT PAS LAISSER CROIRE
 *
 * Un accusé de réception de candidature est lu avec espoir. S'il ressemble de
 * trop près à une réponse, la personne attend, puis relance, puis en veut à
 * l'entreprise. Le texte dit donc trois choses et s'arrête : c'est bien
 * arrivé, ce qui se passe ensuite, et sous quel délai — sans jamais promettre
 * qu'on rappellera.
 *
 * La formule « si votre profil correspond à un poste ouvert » est reprise mot
 * pour mot de l'écran de confirmation du formulaire (`succes_texte`) : le
 * courriel ne doit pas être plus engageant que ce que la personne vient de
 * lire à l'écran.
 */
export function gabaritAccuseCandidature({
  nom,
  locale,
  delaiHeures,
  absence = null,
}: {
  nom: string
  locale: AppLocale
  delaiHeures: number
  /** Message d'absence (0053) — remplace la phrase de délai, ne s'y ajoute pas. */
  absence?: string | null
}): { sujet: string; texte: string } {
  if (locale === 'en') {
    return {
      sujet: 'We received your application — KO-LAB',
      texte: [
        `Hello ${nom},`,
        '',
        'Thank you — we received your application and it reached our team.',
        '',
        ...(absence
          ? [absence]
          : [
              'We review applications as they come in, and we get back to you within',
              `${delaiHeures} business hours if your profile matches an open position.`,
            ]),
        '',
        'Nothing more is needed from your side. If something changes — your',
        'availability, your phone number — just reply to this email.',
        '',
        '—',
        'KO-LAB Inc. · From idea to field.',
        `Outaouais, Québec · ${EMAILS.info}`,
      ].join('\n'),
    }
  }

  return {
    sujet: 'Nous avons bien reçu votre candidature — KO-LAB',
    texte: [
      `Bonjour ${nom},`,
      '',
      'Merci — nous avons bien reçu votre candidature, elle est parvenue à notre',
      'équipe.',
      '',
      ...(absence
        ? [absence]
        : [
            'Nous examinons les candidatures au fur et à mesure, et nous revenons vers',
            `vous dans les ${delaiHeures} heures ouvrables si votre profil correspond à un`,
            'poste ouvert.',
          ]),
      '',
      'Vous n’avez rien d’autre à faire de votre côté. Si quelque chose change —',
      'vos disponibilités, votre numéro — répondez simplement à ce courriel.',
      '',
      '—',
      'KO-LAB Inc. · De l’idée au terrain.',
      `Outaouais, Québec · ${EMAILS.info}`,
    ].join('\n'),
  }
}

/* ========================================================================== */
/* 5. Candidature non retenue — vers le CANDIDAT                             */
/* ========================================================================== */

/**
 * ⚠️ LE SEUL COURRIEL DE CE FICHIER QUI MET FIN À UNE RELATION.
 *
 * Il n'est JAMAIS envoyé automatiquement. Aucun changement de statut ne le
 * déclenche : il part d'un bouton explicite, avec confirmation, et une seule
 * fois — voir `repondreCandidatRefus` et la migration 0054.
 *
 * TROIS CHOSES QUE CE TEXTE NE FAIT PAS, ET CHACUNE EST UN CHOIX
 *
 * 1. Il ne donne AUCUN motif. La base n'en connaît aucun — il n'existe pas de
 *    champ « raison du refus » — donc en inventer un serait mentir. Et un
 *    motif générique (« nous avons reçu de nombreuses candidatures ») est lu
 *    pour ce qu'il est : une formule.
 *
 * 2. Il ne dit pas « nous gardons votre dossier ». Ce serait une promesse que
 *    personne ne tient : rien dans l'outil ne rappelle un dossier classé, et
 *    la Loi 25 pousse plutôt à ne pas conserver indéfiniment un CV. La porte
 *    reste ouverte autrement — en invitant à repostuler.
 *
 * 3. Il ne s'excuse pas. « Nous sommes désolés » pour une décision assumée
 *    sonne faux. Court et clair respecte davantage la personne qu'un
 *    paragraphe d'amortissement.
 *
 * Il laisse en revanche une vraie adresse : quelqu'un qui veut comprendre doit
 * pouvoir écrire à un humain.
 */
export function gabaritCandidatureRefusee({
  nom,
  locale,
}: {
  nom: string
  locale: AppLocale
}): { sujet: string; texte: string } {
  if (locale === 'en') {
    return {
      sujet: 'Your application — KO-LAB',
      texte: [
        `Hello ${nom},`,
        '',
        'We reviewed your application, and we are not moving forward with it for',
        'the positions currently open.',
        '',
        'Thank you for the time you gave us. Our openings change through the year —',
        'you are welcome to apply again when a new one matches what you do.',
        '',
        'If you have a question, reply to this email and it reaches us.',
        '',
        '—',
        'KO-LAB Inc. · From idea to field.',
        `Outaouais, Québec · ${EMAILS.info}`,
      ].join('\n'),
    }
  }

  return {
    sujet: 'Votre candidature — KO-LAB',
    texte: [
      `Bonjour ${nom},`,
      '',
      'Nous avons étudié votre candidature, et nous ne la retenons pas pour les',
      'postes actuellement ouverts.',
      '',
      'Merci pour le temps que vous nous avez accordé. Nos besoins changent au fil',
      'de l’année — n’hésitez pas à postuler de nouveau lorsqu’un poste',
      'correspond à ce que vous faites.',
      '',
      'Si vous avez une question, répondez à ce courriel : il nous parvient.',
      '',
      '—',
      'KO-LAB Inc. · De l’idée au terrain.',
      `Outaouais, Québec · ${EMAILS.info}`,
    ].join('\n'),
  }
}
