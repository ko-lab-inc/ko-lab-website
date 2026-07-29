# Audit sécurité — 29 juillet 2026

Passage complet de `SKILL-securite-production.md` sur le dépôt et sur les
services en ligne. Chaque ligne a été **mesurée**, pas supposée.

État général : bon. Trois points ouverts, aucun n'est une faille exploitable
aujourd'hui, tous relèvent de la configuration.

---

## Ce qui est vérifié conforme

| § | Contrôle | Résultat |
|---|---|---|
| 1 | Secrets dans le code suivi | aucun |
| 1 | Secrets dans **tout** l'historique git (`git log -p --all`) | aucun |
| 1 | `.env*` ignorés, seul `.env.example` est suivi | conforme |
| 1 | Aucune clé serveur préfixée `NEXT_PUBLIC_` | conforme |
| 2 | RLS activé sur les 5 tables, 20 politiques (0002) | conforme |
| 2 | `anon` ne peut PAS lire `demandes_contact` — testé en direct | 401 42501 |
| 2 | `service_role` isolé derrière `import 'server-only'` | conforme |
| 3 | `getUser()` et jamais `getSession()` pour décider | conforme |
| 3 | Rôle revérifié dans le proxy ET dans le layout admin | conforme |
| 3 | Autorisation jamais portée par le seul masquage d'interface | conforme |
| 4 | Validation Zod sur toutes les entrées | conforme |
| 4 | Messages d'erreur génériques, détails aux journaux serveur | conforme |
| 6 | Aucun `dangerouslySetInnerHTML` | conforme |
| 6 | En-têtes : X-Frame-Options, nosniff, HSTS, Referrer-Policy, Permissions-Policy, CSP | conforme |
| 6 | `npm audit` | 0 vulnérabilité |

Corrigé pendant l'audit : `changerMotDePasse` était la seule action d'écriture
du parcours de compte sans plafond de débit.

---

## Point 1 — Le plafond de débit n'est pas partagé entre instances

`src/lib/utils/rateLimit.ts` garde ses compteurs en mémoire de processus. Sur
Vercel, chaque instance serverless a la sienne : la limite effective est
`N × max`, et tout repart à zéro à chaque démarrage à froid. Le fichier le
documente déjà et renvoie au WAF Cloudflare pour la vraie défense.

**Ce qui a changé depuis :** ce limiteur protège désormais la CONNEXION, pas
seulement un formulaire de contact. Et Cloudflare n'est pas encore devant — le
site tourne sur `ko-lab-website.vercel.app`, `ko-lab.ca` n'est pas branché.

**Mesure réelle du plancher restant.** 45 tentatives de connexion consécutives
contre le projet Supabase :

```
429 over_request_rate_limit à la 32ᵉ tentative
```

Supabase applique donc ~30 essais / 5 min / IP. Ce n'est pas rien, mais ça
reste par IP : un botnet distribué passe à travers.

**À faire, par ordre d'effet :**
1. Brancher `ko-lab.ca` sur Cloudflare et activer Bot Fight Mode.
2. Baisser la limite Supabase (Authentication → Rate Limits) — 30 essais de
   connexion en 5 minutes est généreux pour une équipe de trois personnes.
3. Le jour où une garantie stricte est nécessaire, remplacer le `Map` par
   Upstash Redis ou Vercel KV. La signature de `rateLimit()` ne change pas.

---

## Point 2 — Aucun courriel ne part

`RESEND_API_KEY` est vide et aucun SMTP n'est configuré sur Supabase. Le
mailer intégré plafonne à quelques envois par heure et **son quota était déjà
épuisé pendant les tests** (`over_email_send_rate_limit`).

Conséquences, aujourd'hui, en production :
- personne ne peut valider son adresse, donc personne ne peut se connecter à
  part `web@ko-lab.ca` ;
- la réinitialisation de mot de passe ne fonctionne pas ;
- le formulaire de contact enregistre en base mais n'envoie aucune notification.

Ce n'est pas une faille, c'est une panne silencieuse — la pire espèce, parce
que l'interface répond « vérifiez votre courriel » et que rien n'arrive.

**À faire :** compte Resend sous KO-LAB Inc., domaine `ko-lab.ca` vérifié
(SPF, DKIM, DMARC — § 5 du skill), puis SMTP dans Supabase et
`RESEND_API_KEY` sur Vercel.

---

## Point 3 — Non vérifiable depuis ici

`gh` n'est pas installé sur ce poste : le § 8 du skill n'a pas pu être audité.
À vérifier à la main sur `github.com/ko-lab-inc/ko-lab-website` :

- [ ] Secret scanning **et** push protection activés
- [ ] Dependabot activé
- [ ] Branche `main` protégée : PR obligatoire, revue, checks verts
- [ ] Permissions du `GITHUB_TOKEN` réduites dans les workflows

Et côté Vercel (§ 9) :

- [ ] Protection des déploiements de prévisualisation, si leur contenu doit
      rester privé
- [ ] `NEXT_PUBLIC_FEATURE_PANIER` et `NEXT_PUBLIC_SOLUTIONS_MODULAIRES`
      renseignées en Production **et** Preview
- [ ] Le drapeau « Sensitive » retiré des variables `NEXT_PUBLIC_*` : leur
      valeur part dans le bundle du navigateur, le marquer sensible n'apporte
      rien et rend la relecture impossible

---

## Rappel de la règle qui a déjà servi aujourd'hui

`profils.role` a pour valeur par défaut `'invite'` depuis la migration 0004,
et ça ne doit pas changer. Avant, le défaut était `'editor'` : combiné à
l'inscription publique, n'importe qui pouvait créer un compte et lire tout
`demandes_contact`. Les rôles `vendeur` et `livreur` (0006) n'ouvrent rien non
plus tant qu'aucune politique RLS ne les nomme — et ils ne doivent surtout pas
être ajoutés à `ROLES_EQUIPE` avant.
