# KO-LAB Inc. — Site web

> De l'idée au terrain.

Site vitrine premium bilingue (FR/EN) pour KO-LAB Inc., entreprise de déploiement
terrain, fabrication et logistique basée à Outaouais, Québec.

---

## Stack
- **Next.js 16** (App Router) + **React 19** + TypeScript strict
- **Node.js ≥ 20.9.0** (exigé par Next 16)
- **next-intl 4** (bilingue FR/EN, français en premier)
- **Supabase** (PostgreSQL + Auth + Storage)
- **Vercel** (hébergement)
- **Cloudflare** (CDN + WAF + DNS)
- **GitHub** (versioning + CI/CD)

## Démarrage rapide
```bash
npm install
cp .env.example .env.local
# Remplir les variables dans .env.local
npm run dev
```

## Structure
Voir `.claude/CLAUDE.md` pour le guide complet.
Voir `.claude/skills/` pour les règles par domaine.

## Commandes
```bash
npm run dev          # développement local → http://localhost:3000
npm run build        # build production
npm run test         # tests unitaires
npm run test:e2e     # tests end-to-end
```

## Branches
- `main` → production (ko-lab-center.ca)
- `develop` → preview (develop.ko-lab-center.ca)
- `feature/*` → développement

## Contacts
- **Christian** : propriétaire, validation design et contenu
- **Moussa** : développeur principal
