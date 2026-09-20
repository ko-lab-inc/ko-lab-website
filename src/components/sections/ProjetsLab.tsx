import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/ui/Reveal'

/**
 * Deux projets du LAB — Cinq23 (Devcore) et CityFolk / Legacy Walk, phase 1.
 *
 * Révision du 20 septembre 2026, §8.3 et §8.4. Ils arrivent APRÈS les
 * capacités et AVANT les technologies : le brief demande que les
 * technologies apparaissent comme des moyens, une fois les solutions et les
 * preuves posées.
 *
 * ⚠️ Deux règles du brief tenues ici, à ne pas relâcher sans nouvelle
 * consigne écrite :
 * - Cinq23 est un projet EN COURS : le statut le dit, le texte ne promet
 *   rien de terminé, et la fiche « évoluera avec le mandat » (§14.1).
 * - CityFolk est toujours « phase 1 » — jamais le projet entier (§8.4).
 * Aucun chiffre, aucun rôle, aucun client inventé : tout ce qui est écrit
 * ici vient mot pour mot du brief.
 *
 * Pas de photo pour l'instant : les albums Cinq23 et CityFolk n'existent pas
 * encore dans l'admin. Le bloc est conçu pour rester juste sans image, et
 * une colonne photo pourra s'ajouter quand les albums seront créés (lot 6).
 */
// Clés écrites en toutes lettres, pas construites : le typage des messages
// (global.d.ts) valide chaque clé une à une, et un `projet_${cle}_${x}`
// produirait le produit croisé des deux projets — dont des combinaisons qui
// n’existent pas (cityfolk_tag_1, cinq23_etape_1). Même raison que les
// traducteurs cadrés du hub /nos-capacites.
const PROJETS = [
  {
    cle: "cinq23",
    numero: "01",
    separateur: "·",
    titre: "projet_cinq23_titre",
    statut: "projet_cinq23_statut",
    texte: "projet_cinq23_texte",
    etapes: [
      "projet_cinq23_tag_1",
      "projet_cinq23_tag_2",
      "projet_cinq23_tag_3",
      "projet_cinq23_tag_4",
      "projet_cinq23_tag_5",
      "projet_cinq23_tag_6",
    ],
  },
  {
    cle: "cityfolk",
    numero: "02",
    // Flèche, pas point médian : le parcours CityFolk est une CHAÎNE
    // (concept → design → fabrication → impression → installation), le §8.4
    // la présente ainsi ; Cinq23 est une liste de capacités mobilisées.
    separateur: "→",
    titre: "projet_cityfolk_titre",
    statut: "projet_cityfolk_statut",
    texte: "projet_cityfolk_texte",
    etapes: [
      "projet_cityfolk_etape_1",
      "projet_cityfolk_etape_2",
      "projet_cityfolk_etape_3",
      "projet_cityfolk_etape_4",
      "projet_cityfolk_etape_5",
    ],
  },
] as const

export async function ProjetsLab() {
  const t = await getTranslations('Capacites.lab')

  return (
    <section className="border-t border-ko-line bg-ko-white py-16 lg:py-28">
      <div className="mx-auto max-w-container px-6 lg:px-16">
        <Reveal>
          <p className="label-mono">{t('projets_label')}</p>
          <h2 className="ko-h2 mt-5 max-w-[24ch] text-ko-ink">{t('projets_titre')}</h2>
        </Reveal>

        <div className="mt-12 space-y-12 lg:mt-16 lg:space-y-16">
          {PROJETS.map(({ cle, numero, separateur, titre, statut, texte, etapes }) => (
            <Reveal key={cle}>
              <article className="grid grid-cols-1 gap-6 border-t border-ko-line pt-8 lg:grid-cols-[4rem_minmax(0,1fr)] lg:gap-8 lg:pt-10">
                <p aria-hidden="true" className="label-mono text-ko-muted">
                  {numero}
                </p>

                <div>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                    <h3 className="font-serif text-[24px] leading-tight text-ko-ink lg:text-[30px]">
                      {t(titre)}
                    </h3>
                    {/* Statut à côté du titre, pas sous le texte : « projet en
                        cours » et « phase 1 » doivent se lire avant le récit,
                        c'est ce qui empêche de sur-promettre. */}
                    <p className="label-mono border border-ko-line px-2.5 py-1 text-ko-muted">
                      {t(statut)}
                    </p>
                  </div>

                  <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-ko-muted lg:text-lg">
                    {t(texte)}
                  </p>

                  {/* Chaîne d'étapes / tags — séparateur décoratif, donc
                      aria-hidden : un lecteur d'écran lirait « flèche » ou
                      « point » entre chaque mot. */}
                  <ul className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
                    {etapes.map((etape, i) => (
                      <li key={etape} className="flex items-center gap-3">
                        <span className="label-mono text-ko-ink">{t(etape)}</span>
                        {/* Séparateur APRÈS, jamais avant : en mobile la liste
                            passe à la ligne, et un séparateur en tête de ligne
                            se lisait comme une puce orpheline (capture du
                            20 septembre 2026). */}
                        {i < etapes.length - 1 && (
                          <span aria-hidden="true" className="text-ko-blue">
                            {separateur}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
