# Procédure de bascule du domaine

Ce document décrit la bascule du site de `ko-lab-center.ca` vers son domaine
définitif `ko-lab.ca`.

> **Bascule exécutée le 9 octobre 2026, par Cloudflare.** Les §1, §7, §8 et §9
> consignent le chemin réellement suivi et les pièges rencontrés. Les §2 à §6
> restent la référence des réglages (Vercel, Resend, Supabase, SEO). Au moment
> d'écrire ces lignes, la propagation DNS est faite (NS sur Cloudflare, apex
> sur Vercel), Resend est en attente de vérification, et le commit de code
> `196ac3a` n'est pas encore déployé.

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

`EMAILS.envoiTransactionnel` (passé à `site@ko-lab.ca` dans le commit préparé
`196ac3a`, était `site@ko-lab-center.ca`) et `EMAILS.expediteurAuthSupabase`
(`notifications@ko-lab-center.ca`, inchangé — réglage dashboard Supabase, pas
de code), en revanche, vivent sur le domaine qui bascule — ce sont eux qui
exigent la reconfiguration Resend/Supabase décrite plus bas, pas seulement un
changement de constante.

---

## 1. DNS — `ko-lab.ca` (registraire GoDaddy, bascule par Cloudflare)

État de départ : `ko-lab.ca` est **enregistré chez GoDaddy**, ses serveurs
de noms étaient ceux de **DreamHost** (`ns1/ns2/ns3.dreamhost.com`). Une
version antérieure de ce document supposait Cloudflare au départ, puis avait
basculé sur une recréation manuelle chez GoDaddy — **ni l'un ni l'autre
n'est le chemin réellement suivi**.

**Chemin réellement suivi le 9 octobre 2026 : Cloudflare.** `ko-lab.ca` a été
ajouté au compte Cloudflare `Web@ko-lab.ca` — le même qui gère déjà
`ko-lab-center.ca`. À l'ajout, **Cloudflare a scanné la zone DreamHost et
importé automatiquement les 6 enregistrements existants**. Puis les NS ont
été changés chez GoDaddy vers Cloudflare (`mack.ns.cloudflare.com`,
`stevie.ns.cloudflare.com`).

**Pourquoi Cloudflare plutôt que recréer la zone à la main chez GoDaddy** :
l'import automatique reprend le **MX Google et le SPF** tels quels. On ne
retape rien, donc on ne risque pas de couper le courriel de l'équipe (boîte
Google Workspace) par une faute de frappe. C'est l'argument décisif, et il
rend caduque l'ancienne mise en garde « exporter la zone DreamHost à la
main » : Cloudflare l'a fait pour nous.

### Zone finale sur Cloudflare (état réel, 9 octobre 2026)

| Type  | Nom                 | Valeur (contenu)                      | Proxy     | Rôle |
|-------|---------------------|----------------------------------------|-----------|------|
| A     | `@`                 | `216.198.79.1`                         | DNS only  | Vercel (apex) — **la seule IP que Vercel a demandée** |
| A     | `www`               | `216.198.79.1`                         | DNS only  | Vercel |
| A     | `ftp`               | *(DreamHost, inchangé)*                | DNS only  | ancien hébergement, laissé en place |
| A     | `ssh`               | *(DreamHost, inchangé)*                | DNS only  | ancien hébergement, laissé en place |
| MX    | `@`                 | `smtp.google.com`                      | —         | **Courriel Google — importé, préservé** |
| TXT   | `@`                 | `v=spf1 include:_spf.google.com ~all`  | —         | **SPF Google — importé, préservé** |
| TXT   | `resend._domainkey` | *(fourni par Resend)*                  | —         | DKIM Resend |
| CNAME | `rsend`             | *(fourni par Resend)*                  | DNS only  | Resend |
| CNAME | `send`              | *(fourni par Resend)*                  | DNS only  | Resend |
| TXT   | `_dmarc`            | *(fourni par Resend)*                  | —         | DMARC |

Notes :
- **Vercel n'a demandé qu'un seul A, `216.198.79.1`** (pas les deux IP que
  sert `ko-lab-center.ca`, ni un CNAME). `www` pointe sur la même IP. La case
  « Redirect apex to www » a été **laissée décochée** : l'apex `ko-lab.ca` est
  le domaine principal.
- Les 4 enregistrements Resend (DKIM, `rsend`, `send`, `_dmarc`) ont été
  créés **dans Cloudflare**, tous en DNS only. Ils vivent sur des
  sous-domaines et ne touchent pas le SPF Google de l'apex : les deux
  coexistent.
- **Tout en DNS only (nuage gris), pas de proxy orange** — voir le piège nº 1
  en §8, c'est l'erreur par défaut de Cloudflare qui empêche Vercel d'émettre
  le certificat SSL.

Laisser propager le changement de NS avant de vérifier quoi que ce soit chez
Vercel ou Resend : ils refusent de valider un domaine dont le DNS ne pointe
pas encore correctement.

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

**hreflang** : le site est **bilingue FR/EN** depuis la Phase 9 (l'anglais a
bien été réactivé — la version antérieure de ce document, qui le disait
« mono-langue français », était périmée). Les balises `hreflang` sont
déclarées dans `(marketing)/[locale]/layout.tsx` (`alternates.languages` :
`fr`, `en`, `x-default`) avec des **chemins relatifs**, résolus contre
`metadataBase`, qui lit `DOMAINE`. Elles basculent donc automatiquement avec
la variable, **rien à éditer à la main**. Vérifier après déploiement que
`<link rel="alternate" hreflang=...>` dans le `<head>` de `/fr` et `/en`
pointe vers le nouveau domaine.

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
      références attendues (voir la note en fin de §7) — aucune valeur
      vivante inattendue

---

## 7. Séquence réellement exécutée (9 octobre 2026, par Cloudflare)

Ordre des gestes tels qu'ils ont été faits ce soir-là. Chacun indique
**qui**, **où**, **effet / délai**.

1. **Cloudflare → ajouter `ko-lab.ca`** au compte `Web@ko-lab.ca` (celui qui
   gère déjà `ko-lab-center.ca`). Qui : Moussa. Où : dashboard Cloudflare.
   Effet : scan automatique de la zone DreamHost, **6 enregistrements
   importés** (dont MX Google et SPF, sans les retaper).
2. **Cloudflare → repasser les 4 A en DNS only** (Cloudflare les proxifiait
   en orange par défaut). Qui : Moussa. Où : Cloudflare, DNS. Effet : immédiat
   — condition pour que Vercel puisse émettre le SSL (piège nº 1, §8).
3. **Resend → ajouter `ko-lab.ca`**, qui génère 4 enregistrements, créés dans
   Cloudflare : `TXT resend._domainkey`, `CNAME rsend`, `CNAME send`,
   `TXT _dmarc`, tous en DNS only. Qui : Moussa. Où : Resend + Cloudflare.
   Effet : Resend passe en « Pending / Checking DNS ».
4. **Vercel → ajouter `ko-lab.ca`** au projet, en Production, **sans** cocher
   « Redirect apex to www » (l'apex est le domaine principal). Qui : Moussa.
   Où : Vercel, Domains. Effet : Vercel réclame **un seul A, `216.198.79.1`**.
5. **Cloudflare → pointer les A de `@` et `www`** de `69.163.176.103`
   (DreamHost) vers `216.198.79.1` (Vercel). `ftp` et `ssh` laissés sur
   DreamHost. Qui : Moussa. Où : Cloudflare, DNS. Effet : immédiat côté
   Cloudflare, visible après propagation NS.
6. **GoDaddy → changer les serveurs de noms** de DreamHost vers
   `mack.ns.cloudflare.com` / `stevie.ns.cloudflare.com`. Qui : Moussa. Où :
   GoDaddy, Nameservers. Effet : **propagation 1 h à ~24 h** — le seul geste
   lent à annuler.
7. **Vercel → variable `NEXT_PUBLIC_SITE_URL`** : elle existait en type
   **Secret**, que Vercel refusait de modifier ; **supprimée puis recréée en
   type Config**, valeur `https://ko-lab.ca`, Production + Preview (piège
   nº 2, §8). Redéploiement : **build Ready en 59 s**. Qui : Moussa. Où :
   Vercel, Environment Variables.
8. **Supabase → Auth** : `Site URL = https://ko-lab.ca`, et `https://ko-lab.ca/**`
   ajouté aux Redirect URLs. Qui : Moussa. Où : dashboard Supabase.
   Découverte en passant : Supabase pointait vers `ko-lab-website.vercel.app`,
   **jamais** vers `ko-lab-center.ca` — rien ne cassait avant cette bascule,
   le flux auth était déjà sur l'URL `*.vercel.app`.

**Reste à faire (le lendemain) :**
- Attendre que **Resend passe Verified** (il interrogeait encore DreamHost au
  moment du relevé ; passera seul après propagation NS).
- **Alors seulement**, pousser le commit `196ac3a` (déjà validé par
  `npm run build`, exit 0) pour que l'expéditeur devienne `site@ko-lab.ca`.
  Avant ça, les courriels partent encore de `site@ko-lab-center.ca`, ce qui
  reste valide tant que `ko-lab-center.ca` est vérifié chez Resend.
- Confirmer le sort de **`ko-lab-center.ca`** (redirection vers `ko-lab.ca`
  ou maintien) — voir le test nº 10 du §9.

> **Ce qui référence encore `ko-lab-center.ca` après le futur déploiement du
> commit, et c'est normal** : (1) le commentaire d'avertissement sur
> `envoiTransactionnel` et les commentaires historiques dans `src/` ;
> (2) `EMAILS.expediteurAuthSupabase` (`notifications@ko-lab-center.ca`),
> valeur **inerte** qu'aucun code ne lit, documentant le réglage SMTP Supabase ;
> (3) `ko-lab-center.ca` lui-même, domaine encore **vivant** sur Vercel.

---

## 8. Pièges rencontrés (9 octobre 2026)

1. **Cloudflare proxifie les A importés par défaut (nuage orange).** Après
   l'import automatique de la zone, les 4 A étaient en mode proxy. Tant qu'un
   A reste orange, Cloudflare répond à sa place et **Vercel ne peut pas
   émettre son certificat SSL** (il n'atteint pas l'origine pour le challenge).
   Il faut **repasser chaque A en DNS only (nuage gris)**. Symptôme si on
   oublie : erreur de certificat (`ERR_CERT_*`, `526`) sur `https://ko-lab.ca`.
2. **Une variable `NEXT_PUBLIC_` créée en type « Secret » ne peut plus être
   changée en « Config » sur Vercel.** `NEXT_PUBLIC_SITE_URL` était en Secret ;
   Vercel refusait de la modifier. Solution : **la supprimer et la recréer en
   type Config** (Plain), avec la nouvelle valeur, Production + Preview. Un
   `NEXT_PUBLIC_` doit de toute façon être en clair : il finit inliné dans le
   bundle client, « Secret » n'y protège rien.

---

## 9. Checklist du lendemain — gestes numérotés

À dérouler **dans l'ordre** une fois la nuit de propagation passée. Chaque
test dit **ce qu'on tape**, **le résultat attendu**, et **ce que signifie un
échec**. Ne pas sauter d'étape : plusieurs tests sont des préconditions du
suivant.

1. **NS propagés** — `dig +short NS ko-lab.ca`
   Attendu : `mack.ns.cloudflare.com` / `stevie.ns.cloudflare.com`.
   Échec (encore DreamHost) : propagation pas finie, **attendre, ne rien
   déployer**. Tout le reste en dépend.
2. **Apex vers Vercel** — `dig +short A ko-lab.ca`
   Attendu : `216.198.79.1`.
   Échec : la modification Cloudflare du geste 5 n'est pas servie ; vérifier
   l'enregistrement dans Cloudflare.
3. **HTTPS + SSL** — `curl -I https://ko-lab.ca`
   Attendu : `200`, certificat valide.
   Échec de certificat (`ERR_CERT`, `526`) : un A est resté en proxy orange
   (piège nº 1) — repasser en DNS only, patienter quelques minutes.
4. **Courriel de l'équipe intact** — `dig +short MX ko-lab.ca` (attendu
   `smtp.google.com`) **et** envoyer un vrai courriel de test à
   `info@ko-lab.ca` depuis l'extérieur.
   Échec : le MX a été perdu — **critique**, c'est la boîte réelle de
   l'équipe ; recréer `MX @ smtp.google.com` (priorité 0) dans Cloudflare.
5. **Resend Verified** — dashboard Resend, domaine `ko-lab.ca`.
   Attendu : `Verified`.
   Tant que `Pending` : **NE PAS exécuter le test 6**. Le déploiement du code
   avant vérification casse tout envoi (« Domain not verified »).
6. **Déployer le code** — `git push` du commit `196ac3a` (uniquement si test 5
   vert). Attendu : build Vercel Ready. Puis **envoyer une commande de test**
   et confirmer la **réception** d'un courriel dont l'expéditeur est
   `site@ko-lab.ca`.
   Échec d'envoi : revenir en arrière (Resend pas réellement prêt) ; la
   commande reste enregistrée, seul le courriel manque.
7. **Canonicals / sitemap** — `curl -s https://ko-lab.ca/sitemap.xml | head`
   Attendu : des URL en `https://ko-lab.ca`.
   Échec (encore `ko-lab-center.ca`) : la variable n'a pas été prise ;
   vérifier qu'elle est bien en type **Config** (piège nº 2) et redéployer.
8. **robots.txt** — `curl -s https://ko-lab.ca/robots.txt`
   Attendu : `Sitemap: https://ko-lab.ca/sitemap.xml`. Même cause d'échec
   que le test 7.
9. **CORS des API** —
   `curl -sI -X OPTIONS https://ko-lab.ca/api/contact | grep -i access-control-allow-origin`
   Attendu : `https://ko-lab.ca`.
   Échec (ancien domaine) : le commit `196ac3a` n'est pas déployé, ou la
   variable n'est pas prise.
10. **Ancien domaine** — `curl -I https://ko-lab-center.ca`
    Attendu : idéalement `308` vers `https://ko-lab.ca`.
    Si `200` (le site se sert en double) : **contenu dupliqué pour Google**.
    Ajouter dans Vercel une redirection de `ko-lab-center.ca` vers
    `ko-lab.ca`. Décision à prendre avec Christian — ce n'est pas bloquant
    pour les visiteurs, mais ça l'est pour le SEO.
11. **Auth de bout en bout** — inscription de test avec une **vraie** adresse
    que tu consultes, cliquer le lien de confirmation reçu, atterrir sur
    `https://ko-lab.ca/...` sans erreur.
    Échec (lien mort / `token_hash` invalide) : une Redirect URL manque côté
    Supabase (geste 8). Supprimer le compte de test ensuite.
12. **Plus tard, tout étant vert** : soumettre `ko-lab.ca` à Google Search
    Console, et décider de retirer `ko-lab-center.ca` de Resend.
