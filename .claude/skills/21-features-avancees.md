# Skill 21 — Features avancées

## Solutions modulaires — PAGE CACHÉE

Une page "Solutions modulaires" est prévue mais NON publiée au lancement.
Elle sera activée après confirmation de l'entente commerciale.

### Concept
Location, vente, livraison et positionnement de conteneurs :
- Entreposage
- Bureaux temporaires
- Ateliers
- Espaces de chantier
- Transformations personnalisées

### Implémentation technique
```typescript
// La page existe dans le code mais n'est pas dans la nav
// src/app/(marketing)/[locale]/solutions-modulaires/page.tsx

// Accessible uniquement via URL directe, pas référencée dans le sitemap
// Ajouter dans sitemap.ts : exclure cette page jusqu'à activation

// Variable d'env pour activer/désactiver
const SOLUTIONS_MODULAIRES_ACTIVE = process.env.NEXT_PUBLIC_SOLUTIONS_MODULAIRES === 'true'

// Rediriger si désactivé
if (!SOLUTIONS_MODULAIRES_ACTIVE) {
  redirect('/')
}
```

### robots.txt — exclure tant qu'inactif
```
User-agent: *
Disallow: /fr/solutions-modulaires
Disallow: /en/modular-solutions
```

---

## Boutique — évolution e-commerce

Phase 1 (lancement) : catalogue sur commande — pas de paiement
Phase 2 (futur) : panier + paiement Stripe

### Architecture prête pour Phase 2
```typescript
// La structure de données supporte déjà les prix
// produits_boutique.prix peut être null (sur demande) ou un nombre (futur paiement)

// Quand Stripe sera ajouté :
// npm install @stripe/stripe-js stripe
// + STRIPE_SECRET_KEY en variable d'env
// + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

---

## Galerie réalisations — filtrage

```typescript
// Catégories filtrables
const CATEGORIES = [
  { value: 'all',        label_fr: 'Tout voir',       label_en: 'All' },
  { value: 'terrain',    label_fr: 'Opérations',       label_en: 'Operations' },
  { value: 'installation', label_fr: 'Installations',  label_en: 'Installations' },
  { value: 'lab',        label_fr: 'Le LAB',           label_en: 'The LAB' },
  { value: 'equipement', label_fr: 'Équipements',      label_en: 'Equipment' },
]

// Filtre côté client (pas de rechargement de page)
const [categorie, setCategorie] = useState<string>('all')
const filtered = realisations.filter(r =>
  categorie === 'all' || r.categorie === categorie
)
```

---

## Panneau d'administration (futur)

Accès : `/admin` — protégé par Supabase Auth + RBAC
Fonctionnalités prévues :
- Gestion des réalisations (CRUD)
- Gestion de la boutique
- Lecture des demandes de contact
- Gestion des postes carrières

Pour la protection des routes `/admin`, voir `24-roles-permissions.md` —
le proxy est déjà documenté là.

> **Next 16 utilise `proxy.ts` au lieu de `middleware.ts` — voir `src/proxy.ts`.**
> Un seul proxy par projet : le routage de langue next-intl y vit déjà, toute
> logique d'authentification doit y être fusionnée.
