# Premier prompt à donner à Claude Code

Copie-colle ce texte exactement dans Claude Code après avoir ouvert le dossier KOLABINC dans VS Code.

---

## PROMPT 1 — Lecture complète du projet (COMMENCER ICI)

```
Lis ces fichiers dans cet ordre exact avant de faire quoi que ce soit :

1. .claude/CLAUDE.md
2. .claude/skills/19-core-workflow.md
3. .claude/skills/08-anti-ia-design.md
4. .claude/skills/01-architecture.md
5. .claude/skills/02-design-system.md
6. .claude/skills/03-database.md
7. .claude/skills/05-api-business-logic.md
8. .claude/skills/07-deployment.md
9. .claude/skills/09-security.md
10. .claude/skills/10-seo-marketing.md
11. .claude/skills/11-responsive-mobile.md
12. .claude/skills/12-performance.md
13. .claude/skills/14-security-production.md
14. .claude/skills/15-security-audit.md
15. .claude/skills/20-ux-details.md
16. .claude/skills/21-features-avancees.md
17. .claude/skills/22-photos-media.md
18. .claude/skills/24-roles-permissions.md
19. .claude/skills/25-security-audit-complet.md
20. .claude/skills/26-tests.md

Une fois tous ces fichiers lus, confirme avec un résumé de ce que tu as compris
sur le projet KO-LAB : stack, règles de design, méthode de travail.
N'écris aucun code pour l'instant.
```

---

## PROMPT 2 — Fondation technique

```
Tu as lu tous les skills. On commence la fondation du projet.
Crée ces fichiers dans cet ordre exact, un par un :

1.  package.json           (déjà présent — vérifier et compléter si nécessaire)
2.  tsconfig.json
3.  next.config.ts         (avec les headers de sécurité du skill 14)
4.  tailwind.config.ts     (avec TOUS les tokens KO-LAB du skill 02 — couleurs, typo, spacing)
5.  postcss.config.js
6.  .env.local             (variables vides commentées — jamais de vraies valeurs)
7.  src/styles/globals.css (TOUTES les CSS custom properties KO-LAB du skill 02 + classes reveal)
8.  src/lib/utils/cn.ts
9.  src/lib/supabase/client.ts
10. src/lib/supabase/server.ts
11. src/lib/supabase/admin.ts
12. src/lib/utils/rateLimit.ts
13. src/hooks/useReveal.ts
14. src/hooks/useScrolled.ts
15. src/i18n/routing.ts
16. src/types/index.ts
17. messages/fr.json        (TOUTES les clés : Nav, Home, Metadata, Footer, Contact, Boutique)
18. messages/en.json        (traduction complète EN de toutes les clés)
19. src/app/layout.tsx      (root layout avec les 3 polices Google Fonts — skill 02 et 12)
20. src/app/(marketing)/[locale]/layout.tsx
21. src/components/layout/Nav.tsx   (desktop + hamburger mobile — skill 11)
22. src/components/layout/Footer.tsx
23. src/components/ui/Button.tsx    (variants : primary, ghost, text — skill 02)
24. src/components/ui/PhotoPlaceholder.tsx  (skill 22)
25. vitest.config.ts
26. playwright.config.ts
27. tests/unit/setup.ts

Après CHAQUE fichier : confirme avec "✓ [nom] créé" et attends ma validation
avant de passer au suivant. Si tu as un doute sur un token ou une règle,
relis le skill concerné avant de coder.

Règles absolues :
- Tokens CSS du skill 02 UNIQUEMENT (var(--ko-blue), var(--ko-black), etc.)
- Zéro couleur hardcodée dans les composants
- Zéro pattern IA (voir skill 08)
- TypeScript strict — zéro any
- next-intl pour tous les textes visibles
```

---

## PROMPT 3 — Page d'accueil : Hero + Stats

```
Fondation validée. On attaque la page d'accueil section par section.

Relis avant de commencer :
- .claude/skills/02-design-system.md (tokens et composants)
- .claude/skills/08-anti-ia-design.md (interdits absolus)
- .claude/skills/11-responsive-mobile.md (mobile-first)
- .claude/skills/20-ux-details.md (micro-interactions)
- .claude/skills/22-photos-media.md (placeholder photo)

Crée ces deux fichiers :

A. src/components/sections/Hero.tsx
   - Fond clair var(--ko-white) — PAS de fond sombre
   - Layout grid 2 colonnes desktop, 1 colonne mobile
   - COLONNE GAUCHE :
     * Label mono "De l'idée au terrain" avec tiret bleu
     * Titre Fraunces weight 300 clamp(38px, 5vw, 72px)
     * Le mot "terrain" en <em> (italic + couleur ko-blue)
     * Sous-titre Instrument Sans 16px text-ko-muted
     * Bouton primaire bleu "Discuter d'un mandat →"
     * Lien texte "Voir nos capacités →"
   - COLONNE DROITE :
     * PhotoPlaceholder ratio 4/5 "Photo terrain KO-LAB"
     * Carte flottante top-left : "20 000+" + "Heures terrain"
   - Numéro "01" en filigrane bas-droite (couleur ko-cream2, taille clamp(200px,30vw,520px))
   - Classe reveal sur les éléments
   - Bilingue next-intl

B. src/components/sections/StatsBar.tsx
   - Fond var(--ko-black) — contraste avec le hero clair
   - 4 stats en grille : 20 000+ / 6 / Multi / Gouv.
   - Chiffres Fraunces weight 300 34px text-ko-white
   - Labels JetBrains Mono 11px uppercase text-ko-white/50
   - Séparateurs bordure gauche ko-line-d

PAS de dégradés. PAS d'icônes. PAS d'animations complexes.
Mobile-first obligatoire (2 colonnes mobile pour les stats).
Confirme après chaque fichier.
```

---

## PROMPT 4 — Page d'accueil : Besoins + Capacités

```
Hero validé. On continue avec les deux sections suivantes.

Relis : skills 02, 08, 11, 20 avant de commencer.

C. src/components/sections/Besoins.tsx
   - Fond var(--ko-white)
   - En-tête : label mono + titre h2 Fraunces + note texte à droite
   - Grille 4 colonnes desktop, 2 colonnes mobile
   - Fond de la grille : var(--ko-line) avec gap de 2px (effet "joint")
   - Chaque cellule : bg-ko-white, padding 36px 28px
   - Hover : bg white → légèrement plus blanc (transition 250ms)
   - Numéro mono bleu (01, 02, 03, 04)
   - Titre Fraunces 22px
   - Description Instrument Sans 13.5px text-ko-muted
   - Bilingue next-intl

D. src/components/sections/Capacites.tsx
   - Fond var(--ko-cream) — légèrement différent de la section précédente
   - Layout sticky : colonne gauche fixe (sticky top-28), liste à droite
   - Colonne gauche : label + h2 Fraunces + paragraphe explicatif
   - Liste des 4 capacités (lignes séparées par bordure ko-line) :
     * Numéro mono (01, 02, 03, 04) — texte ko-muted
     * Nom Fraunces 24px
     * Flèche ronde (border ko-line, 40px, couleur ko-blue)
     * Hover : padding-left += 16px + bg ko-cream + flèche bg-ko-blue text-white
     * Transition 250ms ease sur tout
   - Mobile : colonne sticky désactivée, liste pleine largeur
   - Bilingue next-intl
```

---

## PROMPT 5 — Page d'accueil : LAB + Preuve + Réalisations

```
Relis : skills 02, 08, 11, 22 avant de commencer.

E. src/components/sections/Lab.tsx
   - Layout split 50/50
   - GAUCHE : PhotoPlaceholder "Atelier Le LAB" (fond ko-black)
   - DROITE : fond ko-black, texte clair
     * Label mono "Le LAB" — couleur ko-blue-mid
     * Titre Fraunces "Nous ne fabriquons pas seulement ce que vous imaginez."
     * Le mot "imaginez" en <em> bleu
     * Paragraphe explicatif text-ko-white/60
     * Liste 4 étapes (Conception / Fabrication / Reproduction / Déploiement)
     * Chaque étape : flex space-between, bordure top ko-line-d
   - Mobile : photo en haut, contenu en dessous

F. src/components/sections/PreuveTerrain.tsx
   - Fond ko-black, texte clair
   - Chiffre géant "20 000+" Fraunces weight 300 clamp(80px, 11vw, 164px)
   - "+" en couleur ko-blue
   - Paragraphe explicatif à droite (max-width 360px)
   - Grille 3 cellules en dessous (fond ko-black, séparateur ko-line-d) :
     * Mandats : Gouvernement & festivals
     * Coordination : Multisite simultané
     * Capacité : Chaîne complète

G. src/components/sections/Realisations.tsx
   - Fond ko-white
   - En-tête avec lien "Voir toutes les réalisations →"
   - Grille 3 colonnes desktop, 1 colonne mobile
   - Chaque carte :
     * PhotoPlaceholder ratio 4/3 avec tag absolu (JetBrains Mono 9.5px)
     * Hover : scale(0.98) sur la photo, transition 300ms
     * Titre Fraunces 20px
     * Description text-ko-muted 13.5px
   - 3 réalisations : Stand 6×4m / Habillage vitrine / Série pilote 25 unités
```

---

## PROMPT 6 — Page d'accueil : Écosystème + Offres + CTA + Assemblage

```
Relis : skills 02, 08, 11 avant de commencer.

H. src/components/sections/Ecosysteme.tsx
   - Fond ko-black
   - En-tête : label + h2 + paragraphe (max 460px)
   - Grille 4 colonnes desktop, 2 colonnes mobile
   - Fond grille ko-line-d avec gap 2px
   - Chaque cellule : bg ko-black, padding 32px 26px, min-height 180px
   - Flex column justify-between
   - Tag mono (Impression / Vêtement / Expérience / Partenaire)
   - Nom entreprise Fraunces 19px
   - Description 12.5px text-ko-white/50
   - Hover : bg légèrement plus clair (ko-ink-2)

I. src/components/sections/Offres.tsx
   - Fond ko-cream (légèrement différent du blanc)
   - Grille 2 colonnes desktop, 1 colonne mobile
   - Chaque carte : bg ko-white, border ko-line, border-radius 4px, padding 48px
   - Hover : border-color ko-blue (transition 250ms)
   - Label mono / Titre Fraunces 30px / Description / Lien avec bordure bleue
   - Lien hover : gap s'agrandit (animation gap)

J. src/components/sections/CtaFinal.tsx
   - Fond ko-white, centré
   - Label mono + h2 Fraunces géant (clamp(36px, 6vw, 82px))
   - "terrain" en <em> bleu
   - Bouton primaire bleu centré
   - Note sous le bouton : "On revient dans les 48 heures."

K. src/app/(marketing)/[locale]/page.tsx
   - Importer et assembler toutes les sections dans l'ordre :
     1. <Hero />
     2. <StatsBar />
     3. <Besoins />
     4. <Capacites />
     5. <Lab />
     6. <PreuveTerrain />
     7. <Realisations />
     8. <Ecosysteme />
     9. <Offres />
     10. <CtaFinal />
   - Metadata SEO FR + EN (skill 10)
   - export const revalidate = 3600

Après l'assemblage : vérifie mobile 375px et desktop 1280px.
Confirme que zéro pattern IA n'est présent (skill 08).
```

---

## PROMPT 7 — Base de données Supabase

```
Relis : .claude/skills/03-database.md et .claude/skills/24-roles-permissions.md

Crée les migrations Supabase dans cet ordre :

supabase/migrations/0001_initial_schema.sql
  → Tables : realisations, produits_boutique, demandes_contact, postes_carrieres, profils
  → Avec tous les index (categorie, publie, ordre)

supabase/migrations/0002_rls_policies.sql
  → RLS activé sur toutes les tables
  → Politiques par rôle : public (lecture), editor (lecture+écriture), admin (tout)
  → Fonction get_user_role()
  → Trigger handle_new_user()

supabase/migrations/0003_seed_dev.sql
  → 3 réalisations de test
  → 2 produits boutique de test
  → 1 poste carrière de test

Puis crée :
src/lib/supabase/queries/realisations.ts   (avec unstable_cache — skill 12)
src/lib/supabase/queries/boutique.ts
src/lib/supabase/queries/carrieres.ts
```

---

## PROMPT 8 — Tests

```
Relis : .claude/skills/26-tests.md

Crée les tests dans cet ordre :

Unit tests (Vitest) :
tests/unit/utils/cn.test.ts
tests/unit/utils/rateLimit.test.ts
tests/unit/components/Button.test.tsx
tests/unit/api/contact.test.ts

E2E tests (Playwright) :
tests/e2e/home.spec.ts        (hero, stats, navigation)
tests/e2e/navigation.spec.ts  (tous les liens, footer)
tests/e2e/contact.spec.ts     (formulaire, validation, succès)
tests/e2e/i18n.spec.ts        (bascule FR/EN, hreflang)

Lance ensuite :
npm run test:ci
npm run test:e2e
Et confirme que tous les tests passent.
```

---

## RAPPEL — Règles globales pour TOUS les prompts

- Relire le skill concerné AVANT de coder (jamais de mémoire)
- Confirmer après CHAQUE fichier
- ZÉRO couleur hardcodée — toujours var(--ko-blue) etc.
- ZÉRO pattern IA (skill 08 — toujours présent à l'esprit)
- TypeScript strict — zéro `any`
- Mobile-first toujours (skill 11)
- Textes via next-intl — jamais hardcodés
- Photos = PhotoPlaceholder tant que les vraies photos ne sont pas là (skill 22)
