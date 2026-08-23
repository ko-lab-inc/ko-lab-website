# LCP production — mesure après le correctif fetchPriority, 23 août 2026

Suite du chantier LCP (investigation du 22 août : proxy.ts et intro animée
écartés par la mesure ; hero redimensionné à 1920×2560 sans effet mesurable ;
`fetchpriority` manquant identifié en production via Lighthouse — voir
`docs/audits/` et l'historique de session pour le détail des étapes
précédentes). Ce fichier documente la mesure comparative après déploiement
du correctif `fetchPriority` explicite + montage de `@vercel/speed-insights`.

## Correctifs déployés (commit `033d129`)

- `fetchPriority="high"` posé explicitement sur `Hero.tsx` et
  `PageCapacite.tsx` — Next 16.2.11 ne le dérive plus automatiquement de
  `priority`/`preload` (vérifié en lisant `get-img-props.js` : la prop
  `fetchPriority` de l'`<Image>` alimente seule l'attribut, sans dérivation).
- `<SpeedInsights />` monté dans le layout marketing.

## Vérification en production (pas en local)

- `curl https://ko-lab-center.ca/fr` : `fetchPriority="high"` présent à la
  fois sur le `<img data-hero-photo>` et son `<link rel="preload">`.
- Lighthouse confirme `priorityHinted: true` (était `false` avant).
- `@vercel/speed-insights` : le script réel n'apparaît PAS sous
  `/_vercel/speed-insights/script.js` en production — Vercel réécrit l'URL
  en un chemin opaque anti-bloqueurs de pub (`/c07db91fec6a6d3c/script.js`
  au moment de cet audit). Confirmé par son contenu
  (`Content-Type: application/javascript`, `X-Vercel-Cache: HIT`) et par
  `window.si` défini dans la page. Absent de recherche naïve par nom de
  fichier ; présent et actif à la vérification réelle.

## Mesure comparative — Lighthouse mobile, 4 passages contre la production

| Passage | LCP | Element render delay | priorityHinted |
|---|---|---|---|
| Avant (référence, un seul passage, 22 août) | 3201 ms | 354 ms | false |
| Après #1 | 3497 ms | 220 ms | true |
| Après #2 | 4781 ms | 216 ms | true |
| Après #3 | 3498 ms | 243 ms | true |
| Après #4 | 5087 ms | 224 ms | true |

## Verdict

**Amélioration réelle et reproductible** : *element render delay* — le seul
segment directement lié au mécanisme que `fetchPriority` influence — passe
de 354 ms à une moyenne de ~226 ms (-36 %), présent sur les 4 passages, pas
un coup de chance isolé.

**LCP global : non concluant, pas amélioré sur ces mesures.** Les 4 passages
oscillent entre 3497 et 5087 ms, tous supérieurs à l'unique référence
« avant » (3201 ms). Mais ces 4 passages, sur un code strictement
identique, montrent déjà un écart de ~1,6 s entre le meilleur et le pire —
une variance plus grande que l'écart avant/après lui-même. Comparer un seul
relevé « avant » à un nuage de points « après » aussi dispersé ne permet de
conclure ni à une amélioration ni à une régression du LCP global.

Le cache-miss de l'optimiseur d'images (~700 ms, non traité dans ce
chantier) est écarté comme explication des passages les plus lents : le
passage le plus rapide (#1) était le premier de la session, donc le plus
probable pour un cache froid — l'inverse de ce qu'on attendrait si c'était
la cause dominante.

## Reste à faire (hors de ce chantier)

- Cache-miss de l'optimiseur d'images (~700 ms au premier appel après
  déploiement).
- 2,1 s de travail sur le thread principal, dont 757 ms rien qu'en
  évaluation de script — reste à identifier PRÉCISÉMENT quel script coûte
  quoi avant de pouvoir agir dessus.
- `nos-capacites/page.tsx` et `GalerieProduit.tsx` portent le même bug
  `fetchPriority` manquant que Hero.tsx/PageCapacite.tsx, non corrigé dans
  ce chantier (hors périmètre demandé).
