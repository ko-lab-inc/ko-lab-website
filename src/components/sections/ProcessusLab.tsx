import { getTranslations } from 'next-intl/server'

/**
 * Frise du processus Le LAB — sept étapes, `contenuSupplementaire` de
 * /nos-capacites/le-lab (LOT E1, §11, révision Joe Himad, 30 août 2026).
 * Remplace la bande de vidéos retirée à cet endroit précis de la page —
 * masquée, pas démontée : voir le-lab/page.tsx, `BandeauVideos.tsx` et la
 * table `videos` restent intacts, seul l'appel qui les affichait ici a
 * disparu.
 *
 * ---------------------------------------------------------------------------
 * MODÈLE REPRIS DE Lab.tsx (accueil, section 6) — pas un composant inventé
 *
 * Même vocabulaire exact : étiquette mono, titre serif, liste en filets
 * (`border-t`, pas de grille). Une grille aurait imposé un nombre de
 * colonnes à choisir ; sept rangées empilées n'ont besoin d'aucun calcul.
 *
 * ⚠️ UNE SEULE COLONNE, PAS DE DÉTAIL À DROITE — contrainte du brief, pas un
 * choix esthétique. Lab.tsx associe un titre (`dt`) et un court détail
 * (`dd`) à chaque étape ; le brief ne fournit ici que les sept intitulés,
 * jamais de texte d'accompagnement. En inventer un contredirait la règle du
 * projet (« la preuve, pas l'affirmation » vaut aussi pour le contenu, pas
 * seulement la sécurité). Le numéro (01 à 07) qui remplace la colonne de
 * détail n'est pas du contenu : c'est la même convention purement
 * structurelle que les cartes de Besoins.tsx et le filigrane numéroté de
 * PageCapacite.tsx — jamais un fait à vérifier.
 *
 * `<ol>`/`<li>`, pas `<dl>`/`<dt>` comme Lab.tsx : Lab.tsx associe un terme à
 * sa définition (dt/dd), ce que ce composant ne fait plus une fois la
 * colonne de détail retirée. Sept étapes SÉQUENCÉES sont une liste ordonnée
 * par nature — `<ol>` le porte nativement (un lecteur d'écran annonce
 * « 3 sur 7 », etc.), le numéro visuel affiché en plus est donc `aria-hidden`
 * pour ne pas le doubler.
 *
 * ---------------------------------------------------------------------------
 * FOND NOIR, PAS BLANC COMME LA SECTION RETIRÉE
 *
 * `GalerieLab`, juste au-dessus dans `contenuSupplementaire`, est déjà
 * blanche ; le CTA final de PageCapacite, juste en dessous, est crème.
 * Reproduire le blanc de l'ancienne bande de vidéos aurait redonné
 * blanc → blanc → crème (deux sections claires collées). Noir → blanc → noir
 * → crème alterne pour de vrai — même bénéfice que celui déjà obtenu en
 * retirant Concours de la nav (LOT B) : un défaut de répétition qui existait
 * déjà se referme comme effet de bord, pas comme objectif.
 * ---------------------------------------------------------------------------
 */
export async function ProcessusLab() {
  const t = await getTranslations('Capacites.lab')

  const etapes = [
    'processus_1',
    'processus_2',
    'processus_3',
    'processus_4',
    'processus_5',
    'processus_6',
    'processus_7',
  ] as const

  return (
    <section className="border-t border-ko-line-d bg-ko-black py-16 lg:py-24">
      <div className="mx-auto max-w-container px-6 lg:px-12">
        <p className="label-mono label-mono-d">{t('label')}</p>

        <h2 className="mt-5 font-serif text-[clamp(28px,3.4vw,44px)] font-light leading-[1.08] tracking-[-0.02em] text-ko-white">
          {t('processus_titre')}
        </h2>

        <ol className="mt-10 max-w-[46ch]">
          {etapes.map((cle, i) => (
            <li key={cle} className="flex items-baseline gap-4 border-t border-ko-line-d py-4">
              <span aria-hidden="true" className="label-mono label-mono-d shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-ko-white">{t(cle)}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
