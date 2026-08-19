# Procédure de bascule du domaine

Ce document décrit ce qu'il faut faire, dans quel ordre, le jour où
`ko-lab-center.ca` est remplacé par le domaine définitif. Il ne suppose
pas quel sera ce domaine — écrit pour être suivi tel quel quel qu'il soit.

**Objectif du côté code** : dans le cas normal — la variable Vercel
`NEXT_PUBLIC_SITE_URL` mise à jour (étape 2) — **aucune modification du
dépôt n'est nécessaire**. `DOMAINE` (`lib/constantes.ts`) et l'en-tête CORS
de `/api/*` (`next.config.ts`) lisent tous les deux cette même variable ;
le second la lit directement plutôt que via `constantes.ts` (un build
incrémental local, sans nettoyer `.next`, a servi une ancienne valeur en
silence après un changement de cette variable — reproduit et vérifié le
19 août 2026 — d'où le choix de la lecture la plus directe possible dans ce
fichier précis), mais la SOURCE reste la même variable d'environnement
dans les deux cas.
Le repli littéral `'https://ko-lab-center.ca'` n'existe que pour le cas où
la variable serait absente (filet de sécurité, pas le chemin normal) — il
apparaît à deux endroits (`constantes.ts` et `next.config.ts`) et vaut la
peine d'être mis à jour aux deux, mais un oubli n'empêche pas la bascule
de fonctionner tant que la variable Vercel est bien posée. Vérifier quand
même après déploiement plutôt que de le supposer (étape 6).

---

## Avant de commencer — ce qui NE bouge PAS automatiquement

`EMAILS.info` (`info@ko-lab.ca`) et `EMAILS.rh` (`rh@ko-lab.ca`) sont la
vraie boîte de l'équipe, sur un domaine **différent** du site. Rien dans
cette procédure ne les concerne, sauf décision explicite contraire de
Christian — voir `.claude/CLAUDE.md`, section Domaine, pour l'historique de
cette distinction.

`EMAILS.envoiTransactionnel` (`site@ko-lab-center.ca`) et
`EMAILS.expediteurAuthSupabase` (`notifications@ko-lab-center.ca`), en
revanche, vivent sur le domaine qui bascule — ce sont eux qui exigent la
reconfiguration Resend/Supabase décrite plus bas, pas seulement un
changement de constante.

---

## 1. Cloudflare — DNS

1. Ajouter le nouveau domaine au compte Cloudflare (ou confirmer qu'il y
   est déjà, si c'est `ko-lab.ca` dont le DNS aurait été récupéré).
2. Créer l'enregistrement CNAME vers Vercel, **DNS only** (nuage gris, pas
   orange) — nécessaire pour que Vercel émette lui-même le certificat SSL,
   comme pour `ko-lab-center.ca` aujourd'hui (voir CLAUDE.md, section
   Outillage : Cloudflare n'est volontairement pas en frontal).
3. Laisser tourner la propagation DNS avant l'étape 2 (Vercel refuse de
   vérifier un domaine dont le DNS ne pointe pas encore correctement).

## 2. Vercel — domaine du projet

1. Project Settings → Domains → ajouter le nouveau domaine.
2. Le marquer domaine de production **primaire** une fois vérifié.
3. Garder `ko-lab-center.ca` comme redirection 308 vers le nouveau domaine
   (Vercel le propose automatiquement à l'ajout) — un lien externe ou une
   page indexée sur l'ancien domaine ne doit pas casser.
4. Mettre à jour la variable d'environnement `NEXT_PUBLIC_SITE_URL`
   (Production **et** Preview) avec le nouveau domaine. C'est cette
   variable, lue par `DOMAINE` dans `lib/constantes.ts`, qui propage le
   changement à tout le site sans toucher au code.

## 3. Resend — domaine d'envoi

Le domaine vérifié pour `from:` doit être celui qui hébergera
`EMAILS.envoiTransactionnel`.

1. Resend → Domains → ajouter le nouveau domaine.
2. Utiliser l'intégration "Auto configure" (Resend ↔ Cloudflare) plutôt que
   saisir les enregistrements DKIM/SPF/MX à la main — c'est ce qui a été
   fait pour `ko-lab-center.ca`, vérifié en quelques minutes.
3. Une fois vérifié : mettre à jour `EMAILS.envoiTransactionnel` dans
   `lib/constantes.ts` avec la nouvelle adresse d'envoi.
4. **Ne pas retirer `ko-lab-center.ca` de Resend avant que le nouveau
   domaine soit vérifié et le code déployé** — sinon toute commande passée
   entre les deux échoue silencieusement à l'envoi (dégradation déjà
   prévue dans le code : la commande reste enregistrée, seul le courriel
   manque, mais autant ne pas déclencher l'incident).

## 4. Supabase — Auth

Deux réglages séparés, les deux dans le tableau de bord Supabase — voir
l'avertissement sur `EMAILS.expediteurAuthSupabase` dans
`lib/constantes.ts`, qu'un grep sur le code ne révèle jamais :

1. **Authentication → URL Configuration** : `Site URL` et chaque
   `Redirect URL` enregistrée doivent pointer vers le nouveau domaine. Un
   lien de confirmation de compte ou de réinitialisation de mot de passe
   généré avec l'ancienne valeur redirigerait vers un domaine qui affiche
   désormais une redirection 308, cassant le flux `token_hash` de
   `/api/auth/confirmer`.
2. **Authentication → Emails → SMTP Settings** : le champ `Sender` (
   `notifications@ko-lab-center.ca` aujourd'hui) doit être mis à jour vers
   une adresse vérifiée sur le nouveau domaine côté Resend (étape 3).

## 5. SEO — sitemap, canonicals, Open Graph

Rien à modifier à la main : `app/sitemap.ts`, `app/robots.ts` et les
`canonical`/`openGraph.url` du layout marketing lisent tous `DOMAINE`
depuis `lib/constantes.ts` (voir le commentaire de cette constante pour la
distinction avec `lib/utils/origine.ts`, qui résout différemment et n'a
pas besoin d'être touché). Vérifier après déploiement que
`/sitemap.xml` et `/robots.txt` répondent avec les nouvelles URL — c'est
la preuve que la variable d'environnement a bien été prise en compte, pas
une simple supposition.

**hreflang** : sans objet aujourd'hui — le site est mono-langue français
(`routing.ts`). Si l'anglais est un jour réactivé (Phase 9 de la refonte),
cette étape devra être ajoutée ici.

## 6. Après bascule — vérifications

- [ ] `curl -I https://nouveau-domaine.ca` répond 200
- [ ] `curl -I https://ko-lab-center.ca` répond 308 vers le nouveau domaine
- [ ] Une commande de test déclenche bien un courriel reçu (pas seulement
      enregistré en base — voir la dégradation silencieuse notée plus haut)
- [ ] Une inscription de test complète le flux de confirmation par courriel
      jusqu'au bout (Site URL/Redirect URLs Supabase à jour)
- [ ] `/sitemap.xml` et `/robots.txt` référencent le nouveau domaine
- [ ] `curl -sI -X OPTIONS https://nouveau-domaine.ca/api/contact | grep -i access-control-allow-origin` renvoie le nouveau domaine, pas l'ancien
- [ ] `git grep -i "ko-lab-center.ca"` dans `src/` ne renvoie plus que des
      commentaires historiques (le HANDOFF, les migrations passées) —
      aucune valeur vivante
