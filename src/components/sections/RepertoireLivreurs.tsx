import { EnteteAdmin, EnteteTableau, PanneauAdmin } from '@/components/layout/CadreAdmin'

/**
 * Répertoire des candidatures retenues pour « Chauffeur-livreur ».
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE N'EST PAS UN QUATRIÈME `ListeProfils`
 *
 * Utilisateurs, Vendeurs et Livreurs partagent tous la même table `profils` —
 * ListeProfils lit un COMPTE, avec identifiants et rôle. Une candidature n'en
 * a pas : c'est un formulaire public, sans connexion (migration 0017).
 *
 * ⚠️ DÉCISION RENVERSÉE LE 27 AOÛT 2026 (Moussa) — un candidat retenu
 * POURRA recevoir un accès. L'ancienne décision de Christian (« un candidat
 * retenu comme chauffeur-livreur doit apparaître dans Livreurs SANS qu'on
 * lui crée d'accès au site ») ne tient plus : une candidature au statut
 * « retenue » pourra déclencher une invitation comme livreur, après
 * confirmation explicite dans l'interface — jamais automatique. Voir
 * migration 0045 (colonnes `compte_id`, `poste_id`, `invitation_envoyee_le`
 * sur `candidatures`) pour le schéma qui porte ce lien. Ce composant reste
 * néanmoins en lecture seule AUJOURD'HUI : l'action d'invitation elle-même
 * n'est pas encore construite (étape 1/3, migration seulement) — ce
 * commentaire documente l'intention, pas encore le geste.
 *
 * C'est donc un second bloc, sous la liste des comptes réels. Aucune action
 * ici pour l'instant (pas de changement de rôle, pas de suppression, pas
 * encore d'invitation) : ces gestes existent déjà sur l'écran Candidatures,
 * qui reste la source — l'invitation les rejoindra là, pas ici.
 * ---------------------------------------------------------------------------
 */
export function RepertoireLivreurs({
  candidats,
  titre,
  intro,
  vide,
  colonnes,
}: {
  candidats: {
    id: string
    nom: string
    telephone: string
    email: string
    ville: string
    /** Déjà formatée côté serveur — jamais une fonction en prop (RSC). */
    dateFormatee: string
  }[]
  titre: string
  intro: string
  vide: string
  colonnes: string[]
}) {
  return (
    <>
      <EnteteAdmin titre={titre} intro={intro} />

      <PanneauAdmin sansPadding>
        {candidats.length === 0 ? (
          <p className="p-6 text-base leading-relaxed text-ko-muted">{vide}</p>
        ) : (
          <>
            <EnteteTableau colonnes={colonnes} />
            <ul className="divide-y divide-ko-line">
              {candidats.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:gap-6"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base text-ko-ink">{c.nom}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-ko-muted">{c.email}</p>
                  </div>
                  <span className="shrink-0 text-sm text-ko-muted">{c.telephone}</span>
                  <span className="shrink-0 text-sm text-ko-muted">{c.ville}</span>
                  <span className="shrink-0 font-mono text-xs text-ko-muted">
                    {c.dateFormatee}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </PanneauAdmin>
    </>
  )
}
