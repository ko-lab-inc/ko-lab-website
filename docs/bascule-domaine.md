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

## 1. DNS — `ko-lab.ca` (registraire GoDaddy, DNS chez DreamHost)

État mesuré le 9 octobre 2026 : `ko-lab.ca` est **enregistré chez GoDaddy**
mais ses serveurs de noms sont ceux de **DreamHost**
(`ns1/ns2/ns3.dreamhost.com`), pas Cloudflare. La version antérieure de ce
document supposait Cloudflare — c'était faux. Deux chemins possibles :

- **(a) Garder DreamHost** : éditer directement les enregistrements dans le
  panneau DreamHost. Aucun changement de NS, retour arrière en minutes
  (TTL courts mesurés : 60 s). Le plus sûr pour un premier essai.
- **(b) Basculer les NS vers GoDaddy** (ou Cloudflare) : changer les serveurs
  de noms chez le registraire GoDaddy, puis **recréer toute la zone** dans le
  nouveau panneau DNS. Un changement de NS **abandonne la zone DreamHost en
  entier** — pas seulement la ligne du site. Retour arrière lent (plusieurs
  heures à ~24 h de propagation).

> ⚠️ **Avant tout changement de NS : exporter la zone DreamHost complète.**
> Un relevé DNS public ne voit que ce qui est interrogé nommément. Les
> sélecteurs DKIM (ex. `<selecteur>._domainkey.ko-lab.ca`) et tout
> sous-domaine éventuel ne se devinent pas — seul l'export DreamHost (ou la
> console Google Admin pour DKIM) les donne tous. Oublier un DKIM ne casse
> pas la livraison du courriel mais casse la signature/alignement DMARC.

### Zone à recréer (chemin b) — valeurs directement recopiables

La zone visible aujourd'hui tient en quatre lignes (`@ A`, `www A`, `MX`,
`TXT`). À la recréer, l'apex et `www` doivent désormais pointer vers **Vercel**
(plus vers DreamHost), tandis que **MX et SPF Google sont recopiés tels quels**
pour ne pas couper le courriel de l'équipe (boîte Google Workspace) :

| Type  | Nom (Host) | Valeur                                | Priorité | Rôle |
|-------|-----------|----------------------------------------|----------|------|
| A     | `@`       | `216.198.79.65`                        | —        | Vercel (apex) |
| A     | `@`       | `64.29.17.65`                          | —        | Vercel (apex, 2ᵉ IP) |
| CNAME | `www`     | `cname.vercel-dns.com`                 | —        | Vercel (sous-domaine) |
| MX    | `@`       | `smtp.google.com`                      | `0`      | **Courriel Google — PRÉSERVER** |
| TXT   | `@`       | `v=spf1 include:_spf.google.com ~all`  | —        | **SPF Google — PRÉSERVER** |

Notes :
- Les deux IP Vercel (`216.198.79.65`, `64.29.17.65`) sont celles que sert
  `ko-lab-center.ca` aujourd'hui. **Vercel affiche les valeurs exactes à
  l'ajout du domaine (étape 2) — recopier ce qu'il montre ce jour-là**, pas
  ce tableau si elles diffèrent.
- GoDaddy en DNS classique ne « flatten » pas un CNAME à l'apex : l'apex doit
  être en enregistrements **A**, jamais un CNAME. `www` peut rester en CNAME.
- **DNS only / pas de proxy.** Sur Cloudflare ce serait le nuage gris ; sur
  GoDaddy ou DreamHost il n'y a pas de proxy, donc rien à désactiver —
  nécessaire pour que Vercel émette lui-même le certificat SSL.
- **Resend ajoutera ses propres enregistrements** (DKIM `resend._domainkey`
  et, le plus souvent, un `send.ko-lab.ca` avec MX + SPF dédiés) au moment de
  la vérification (étape 3). Ils vivent sur un **sous-domaine** et ne touchent
  pas le SPF Google de l'apex : les deux coexistent. Les ajouter quand Resend
  les donne, pas avant.

Laisser propager avant l'étape 2 : Vercel refuse de vérifier un domaine dont
le DNS ne pointe pas encore correctement.

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

## 7. Séquence du jour J — gestes numérotés (chemin b : NS → GoDaddy)

Pour suivre sans réfléchir. Chaque geste indique **qui**, **où**, et **le
délai avant effet**. Les gestes 1 à 3 n'ont aucun effet visible et sont
réversibles instantanément ; le geste 4 (NS) est le seul lent à annuler.

**Préparation — aucun effet visible, réversible en secondes**

1. **Exporter la zone DreamHost complète** (filet de sécurité, §1).
   Qui : Moussa. Où : panneau DNS DreamHost. Effet : immédiat (fichier
   local), ne change rien en ligne.
2. **Pré-remplir la zone dans le panneau DNS GoDaddy** avec les cinq lignes
   du tableau §1 (Vercel A×2 + `www` CNAME + MX Google + TXT SPF), **sans
   encore toucher aux NS**. Qui : Moussa. Où : GoDaddy, section DNS. Effet :
   aucun tant que les NS pointent sur DreamHost — la zone reste en attente.
3. **Resend → ajouter `ko-lab.ca`**, relever les enregistrements qu'il
   réclame (DKIM `resend._domainkey`, et en général un `send` avec MX+SPF),
   et les **ajouter à la zone GoDaddy pré-remplie** du geste 2. Qui : Moussa.
   Où : dashboard Resend + GoDaddy. Effet : aucun encore (DNS pas servi).

**Bascule — à partir d'ici le site change pour les visiteurs**

4. **GoDaddy → changer les serveurs de noms** de DreamHost vers ceux de
   GoDaddy. Qui : Moussa. Où : GoDaddy, section Nameservers du domaine.
   Effet : **propagation 1 h à ~24 h** (TTL des NS). C'est LE geste lent à
   annuler — tout le reste est rapide.
5. **Attendre la propagation**, puis vérifier :
   `dig ko-lab.ca NS` → GoDaddy, et `dig ko-lab.ca A` → les IP Vercel.
   Qui : Moussa. Où : terminal. Effet : quand c'est vert, la zone GoDaddy
   est servie partout.
6. **Resend → « Verify »** sur `ko-lab.ca`. Qui : Moussa. Où : Resend. Effet :
   quelques minutes. **Bloque le geste 9** (ne pas déployer le code avant
   que ce soit vert, sinon les courriels échouent « Domain not verified »).
7. **Vercel → Domains** : ajouter `ko-lab.ca` et `www.ko-lab.ca`, passer
   `ko-lab.ca` **primaire**, garder `ko-lab-center.ca` en **redirection 308**.
   Qui : Moussa. Où : Vercel, Project Settings → Domains. Effet : certificat
   SSL émis en quelques minutes une fois le DNS vu.
8. **Vercel → Environment Variables** : poser
   `NEXT_PUBLIC_SITE_URL = https://ko-lab.ca` en **Production ET Preview**.
   Qui : Moussa. Où : Vercel, Settings → Environment Variables. Effet :
   **aucun tant qu'un nouveau déploiement n'a pas eu lieu** (une variable
   `NEXT_PUBLIC_` est figée au build) — c'est le geste 9 qui l'active.
9. **Déployer le commit de code préparé** (replis en dur + `envoiTransactionnel`
   vers `ko-lab.ca`) en poussant la branche. Qui : Moussa. Où : `git push`
   → build Vercel. Effet : build ~1 à 2 min. Ce déploiement prend en compte
   **à la fois** la variable du geste 8 et le commit de code. **Ne le faire
   qu'après le geste 6 (Resend vérifié).**
10. **Supabase → Authentication** : mettre `Site URL` et chaque `Redirect
    URL` sur `https://ko-lab.ca` (URL Configuration), et le `Sender` SMTP sur
    une adresse `@ko-lab.ca` vérifiée chez Resend (Emails → SMTP Settings).
    Qui : Moussa. Où : dashboard Supabase. Effet : immédiat sur les nouveaux
    liens de confirmation / réinitialisation.

**Vérification puis nettoyage**

11. **Dérouler la checklist du §6** (200 sur le nouveau, 308 sur l'ancien,
    inscription de test de bout en bout, sitemap/robots/CORS à jour).
    Qui : Moussa. Où : terminal + navigateur.
12. **Plus tard seulement, tout étant vert et stable** : retirer
    `ko-lab-center.ca` de Resend si souhaité, soumettre `ko-lab.ca` à Google
    Search Console, et décider du sort de l'ancien contenu DreamHost. Qui :
    Moussa / Christian.

> **Ce qui référence encore `ko-lab-center.ca` APRÈS le commit de code, et
> c'est normal** : (1) le commentaire d'avertissement sur `envoiTransactionnel`
> et les commentaires historiques dans `src/` ; (2) `EMAILS.expediteurAuthSupabase`
> (`notifications@ko-lab-center.ca`) — valeur **inerte**, aucun code ne la lit,
> elle ne documente que le réglage SMTP Supabase du geste 10, à changer dans
> le dashboard, pas dans le dépôt ; (3) `ko-lab-center.ca` lui-même reste un
> domaine **vivant** sur Vercel, en redirection 308 — c'est voulu, pas un
> oubli.
