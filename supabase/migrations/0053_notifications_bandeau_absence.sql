-- =============================================================================
-- 0053 — destinataires des notifications, bandeau d'annonce, message d'absence
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
-- Idempotente — `on conflict (cle) do nothing`. NON destructive.
--
-- -----------------------------------------------------------------------------
-- CONTEXTE
-- -----------------------------------------------------------------------------
-- Quatre réglages approuvés par Christian le 2 octobre 2026, dans la suite de
-- 0051 : des valeurs qui gouvernent le site et qui étaient soit figées dans le
-- code, soit inexistantes.
--
-- 9 clés pour 4 fonctions — parce que trois d'entre elles sont BILINGUES ou
-- ont besoin d'un interrupteur séparé de leur texte. Détail plus bas.
--
--
-- =============================================================================
-- 1. QUI REÇOIT LES NOTIFICATIONS  (3 clés)
-- =============================================================================
--
-- ⚠️ LE PROBLÈME QUE ÇA CORRIGE : `contact_courriel` PORTAIT DEUX RÔLES
--
-- Depuis 0011, `contact_courriel` est à la fois
--   (a) l'adresse AFFICHÉE au public — pied de page, page Contact, pages
--       légales, données structurées ; et
--   (b) le DESTINATAIRE des notifications de nouvelle demande.
--
-- Tant qu'une seule adresse tient les deux rôles, ça passe. Mais KO-LAB veut
-- que plusieurs personnes reçoivent les demandes — et une liste
-- « info@ko-lab.ca, christian@…, moussa@… » affichée en pied de page comme un
-- seul `mailto:` produirait un lien cassé sur chaque page du site.
--
-- Les deux rôles sont donc séparés. `contact_courriel` NE CHANGE PAS de sens
-- (une adresse, affichée) et deux clés neuves portent les destinataires.
--
-- POURQUOI VIDE PAR DÉFAUT, ET PAS PRÉREMPLIE
-- Vide = « se comporter comme avant ». Préremplir avec la valeur actuelle de
-- `contact_courriel` figerait une copie qui divergerait au premier changement :
-- quelqu'un corrigerait l'adresse affichée et les notifications continueraient
-- de partir vers l'ancienne, sans que rien ne le signale. Le repli est calculé
-- à la lecture, il ne peut pas se désynchroniser.
--
-- `courriel_rh` remplace la constante EMAILS.rh (lib/constantes.ts), figée dans
-- le code exactement comme `info@` l'était avant 0011.

insert into public.reglages (cle, valeur, description, publique) values
  (
    'courriel_rh',
    '',
    'Adresse RH AFFICHÉE sur /carrieres et /carrieres/postuler. Vide = rh@ko-lab.ca (valeur de repli du code). Une seule adresse : elle sert de lien mailto.',
    true
  ),
  (
    'notifications_demandes',
    '',
    'Qui reçoit les notifications de nouvelle demande de contact. Plusieurs adresses séparées par des virgules. Vide = l''adresse de contact_courriel. N''est PAS affichée au public.',
    false
  ),
  (
    'notifications_candidatures',
    '',
    'Qui reçoit les notifications de nouvelle candidature. Plusieurs adresses séparées par des virgules. Vide = l''adresse RH. N''est PAS affichée au public.',
    false
  )
on conflict (cle) do nothing;


-- =============================================================================
-- 2. BANDEAU D'ANNONCE  (3 clés)
-- =============================================================================
--
-- Une bande au-dessus de la navigation, sur toutes les pages publiques :
-- fermeture des fêtes, événement à venir, avis de service.
--
-- TROIS CLÉS POUR UN BANDEAU, ET CHACUNE A SA RAISON
--
-- `bandeau_actif` séparé du texte : éteindre le bandeau sans perdre le message
-- permet de le rallumer l'an prochain sans le réécrire. Un seul champ texte
-- vidé pour éteindre obligerait à le retaper.
--
-- `_fr` ET `_en` : le site est bilingue. Un champ unique afficherait du
-- français à un visiteur de /en — exactement le défaut que les gabarits de
-- courriel évitent en suivant `demandes_contact.locale`. Si une seule des deux
-- langues est remplie, le bandeau n'apparaît que dans cette langue : c'est
-- préférable à un texte dans la mauvaise langue, et ça permet une annonce qui
-- ne concerne qu'un public.

insert into public.reglages (cle, valeur, description, publique) values
  (
    'bandeau_actif',
    'false',
    'Affiche le bandeau d''annonce au-dessus de la navigation, sur toutes les pages publiques. Le texte reste enregistré quand il est éteint.',
    true
  ),
  (
    'bandeau_texte_fr',
    '',
    'Texte du bandeau d''annonce en français. Vide = aucun bandeau sur /fr même si bandeau_actif est allumé.',
    true
  ),
  (
    'bandeau_texte_en',
    '',
    'Texte du bandeau d''annonce en anglais. Vide = aucun bandeau sur /en même si bandeau_actif est allumé.',
    true
  )
on conflict (cle) do nothing;


-- =============================================================================
-- 3. MESSAGE D'ABSENCE  (3 clés)
-- =============================================================================
--
-- ⚠️ CE N'EST PAS UN SIMPLE AVIS DE PLUS : ÇA REMPLACE UNE PROMESSE
--
-- Le site promet aujourd'hui « on revient vers vous dans les 48 heures » à
-- CINQ endroits (page Contact ×3, Carrières, pages Capacité) et dans l'accusé
-- de réception — tous alimentés par `delai_reponse_heures` depuis 0051.
--
-- Quand l'équipe est au complet sur un chantier ou fermée pour les fêtes,
-- cette promesse devient fausse. Ajouter un bandeau « nous sommes absents »
-- SANS toucher à la promesse donnerait un site qui dit les deux choses à la
-- fois, et le courriel d'accusé continuerait d'annoncer 48 heures à quelqu'un
-- qui n'aura de réponse que dans dix jours.
--
-- Quand `absence_actif` est allumé, le message d'absence PREND LA PLACE de la
-- phrase de délai partout où elle est faite, courriel compris. C'est la seule
-- version qui ne crée pas de contradiction.
--
-- Même raisonnement bilingue que le bandeau. Ici, en revanche, une langue vide
-- retombe sur la phrase de délai habituelle plutôt que de n'afficher rien :
-- une page sans aucune indication de délai serait une régression.

insert into public.reglages (cle, valeur, description, publique) values
  (
    'absence_actif',
    'false',
    'Remplace la promesse de délai de réponse par le message d''absence, sur le site ET dans l''accusé de réception par courriel. Les formulaires continuent de fonctionner.',
    true
  ),
  (
    'absence_message_fr',
    '',
    'Message d''absence en français — ex. « Nous sommes fermés jusqu''au 6 janvier. Votre demande sera traitée à notre retour. » Vide = la phrase de délai habituelle est conservée.',
    true
  ),
  (
    'absence_message_en',
    '',
    'Message d''absence en anglais. Vide = la phrase de délai habituelle est conservée.',
    true
  )
on conflict (cle) do nothing;


-- =============================================================================
-- VÉRIFICATION APRÈS EXÉCUTION
-- =============================================================================
-- 1) Les 9 clés existent (doit renvoyer 9 lignes) :
--    select cle, valeur, publique from public.reglages
--    where cle in (
--      'courriel_rh', 'notifications_demandes', 'notifications_candidatures',
--      'bandeau_actif', 'bandeau_texte_fr', 'bandeau_texte_en',
--      'absence_actif', 'absence_message_fr', 'absence_message_en'
--    ) order by cle;
--
-- 2) Les deux listes de destinataires ne sont PAS publiques (doit renvoyer 2) :
--    select count(*) from public.reglages
--    where cle like 'notifications_%' and publique = false;
--
-- 3) Le total (doit renvoyer 24) :
--    select count(*) from public.reglages;
