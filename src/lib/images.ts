/**
 * ⚠️ TEMPORAIRE — photos de développement Unsplash.
 * Remplacer par les photos KO-LAB 2025-2026 avant la mise en production.
 * Voir skill 22, section « Images temporaires à remplacer ».
 *
 * ---------------------------------------------------------------------------
 * ÉCART ASSUMÉ AU SKILL 22
 * Le skill interdit les photos de stock (« elles trahissent immédiatement un
 * site template »). Écart validé par Christian pour la phase de maquette :
 * des emplacements réservés ne permettent pas de juger le rythme d'une page.
 *
 * Chaque URL ci-dessous a été vérifiée en HTTP 200 ET visionnée. Les critères
 * retenus : lumière venant de l'outil ou à contre-jour, aucun visage face à
 * l'objectif, palette noir + ambre, aucun logo de client lisible.
 *
 * Licence : uniquement images.unsplash.com (libre). Les visuels Unsplash+
 * payants vivent sur plus.unsplash.com, hôte absent de next.config.ts — une
 * URL premium échouerait donc en 400 plutôt que de passer inaperçue.
 * ---------------------------------------------------------------------------
 */

/**
 * Traitement colorimétrique partagé — TOUTES les photos terrain du site.
 *
 * Avant unification : quatre copies indépendantes de la correction « ambre »
 * (Besoins.tsx, GalerieRealisations.tsx, PageCapacite.tsx, nos-capacites/page.tsx),
 * plus quatre bases différentes pour les photos plein cadre — le hero utilisait
 * grayscale(0.1)/contrast(1.05)/brightness(0.85), PageCapacite un tout autre
 * contrast(1.05)/brightness(0.65) sans grayscale, le hub capacités un troisième
 * réglage encore. Deux sections (Lab, PreuveTerrain) n'avaient AUCUN filtre.
 * Résultat : chaque section imposait sa propre température, sans qu'on
 * reconnaisse « une photo KO-LAB » d'une page à l'autre.
 *
 * FILTRE_TERRAIN reprend tel quel le réglage du hero — c'est la première
 * section vue, donc la référence. FILTRE_TERRAIN_CHAUD y ajoute uniquement la
 * correction nécessaire aux deux contre-jours de fin de journée (grue,
 * échafaudage), dont le ciel doré entrait en concurrence avec le bleu accent :
 * mêmes grayscale et brightness que la base (c'est ce qui fait « famille »),
 * plus une désaturation et un contraste légèrement accrus pour ramener l'ambre
 * au même niveau que les autres photos (déjà noir + ambre par la source, pas
 * par un aplat de ciel).
 */
export const FILTRE_TERRAIN = { filter: 'grayscale(0.1) contrast(1.05) brightness(0.85)' }
export const FILTRE_TERRAIN_CHAUD = {
  filter: 'grayscale(0.1) saturate(0.5) contrast(1.1) brightness(0.85)',
}

const PARAMS = 'fm=jpg&q=85&w=2400&auto=format&fit=crop'

/** Construit l'URL finale. Le `w=2400` sert de source ; next/image redimensionne. */
function unsplash(chemin: string): string {
  return `https://images.unsplash.com/${chemin}?${PARAMS}`
}

/**
 * Photos KO-LAB réelles — bucket public `medias`, Supabase Storage.
 * Déposées et redimensionnées le 18 août 2026 (mandats Canada Day 2026,
 * DEVFEST 2026, atelier Le LAB) puis le 19 août 2026 (lot Installations) —
 * voir KO-LAB-PHOTOS/_metadonnees.txt (hors dépôt, jamais commité) pour la
 * source et le contexte de chaque photo.
 */
function medias(chemin: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/medias/${chemin}`
}

export const IMAGES = {
  /** Photo réelle — scène Fête du Canada Day 2026, plateau de scène en montage. */
  hero: '/images/hero/hero-equipe-nacelle-2026.webp',

  /**
   * ⚠️ REMPLACÉE le 3 septembre 2026, sur demande directe de Christian :
   * l'ancienne photo (`operations/preparation-terrain-2024.webp`) montrait
   * trois personnes câblant des mortiers de feux d'artifice (déploiement
   * pyrotechnique, Feux sur glace 2024). Un mandat réel, mais qui donne
   * l'impression que KO-LAB fait de la pyrotechnie — hors de ce que le site
   * décrit. Retirée des TROIS surfaces où elle apparaissait (ce besoin,
   * la carte « Déploiement événementiel » du bloc Réalisations de l'accueil,
   * et le hub /nos-capacites) ; fichier laissé dans Storage, plus référencé
   * nulle part.
   *
   * Nouvelle photo : les deux camions KO-LAB (Sierra HD noir, Silverado
   * blanc), portes brandées « KO-LAB INC. », sur un terrain avant
   * déploiement. Aucune marque tierce, aucune personne. Fichier déjà dans
   * Storage (`deployment/`), jamais câblé avant ce remplacement.
   */
  besoinDeployer: medias('deployment/deployment-camion-1787966001728.jpg'),

  /** Photo réelle — équipe KO-LAB (gilets orange) sur site, Canada Day 2026. */
  besoinInstaller: medias('home/besoin-installer-2026.webp'),

  /**
   * Photo réelle — impression 3D en cours, atelier Le LAB (pièce dorée
   * drapée). Réutilisée par `lab` plus bas (section LAB de l'accueil + hub
   * capacités) depuis le 20 août 2026 — voir son commentaire pour le
   * raisonnement complet.
   */
  besoinFabriquer: medias('home/besoin-fabriquer-2026.webp'),

  /** Photo réelle — mobilier et aménagement de site loués, DEVFEST 2026. */
  besoinLouer: medias('rental/location-mobilier-2026.webp'),

  /**
   * Photo réelle depuis le 20 août 2026 — remplace l'Unsplash (consigne
   * Christian, revue visuelle du 20 août 2026, point 2 : « la plus grande
   * image du site après le hero » ne pouvait pas rester une photo de stock).
   * Impression 3D en cours (pièce dorée drapée), pas la découpe laser/CNC que
   * le texte visait à l'origine — aucune photo de laser/CNC n'a jamais été
   * reçue, dans aucun des cinq lots (revérifié une dernière fois ce jour-là).
   * Christian a tranché explicitement : « le sujet exact compte moins que
   * l'authenticité ». Home.lab.etape3_detail liste d'ailleurs « Laser, CNC,
   * impression 3D » ensemble, pas la seule découpe — la photo illustre une
   * des trois techniques nommées, pas un sujet inventé.
   *
   * Même fichier que besoinFabriquer ci-dessus, dupliqué volontairement (même
   * raison que hero/preuveTerrain). Sert la section LAB de l'accueil ET la
   * carte « Le LAB » du hub /nos-capacites (même clé, deux consommateurs).
   * `soudeur`/`realisationLab` restent seuls encore Unsplash — voir plus bas.
   */
  lab: medias('home/besoin-fabriquer-2026.webp'),

  /**
   * Photo réelle — imprimante Bambu Lab X2D en cours d'impression, halo bleu
   * de l'éclairage d'atelier.
   *
   * ⚠️ Ne servait plus QUE de repli lab_1/lab_2 (medias-repli.ts) et de photo
   * du LAB sur /nos-capacites/le-lab avant l'étape 3/3 (27 août 2026) : les
   * deux ont disparu (la page lit maintenant galeries_photos). SEUL
   * consommateur restant — accès DYNAMIQUE, `IMAGES[cle]` où `cle` vient de
   * `ClePhotoRepli` — : `lib/carrieres-photo.ts` (`photoPourDepartement`,
   * repli photo du département « Lab créatif » sur /carrieres et
   * /admin/carrieres tant qu'un poste n'a pas sa `photo_url` assignée). Ce
   * mode d'usage n'apparaît PAS dans un grep sur `IMAGES\.labImpression3d` —
   * a fait supprimer cette clé par erreur avant que `npm run build` ne le
   * révèle (type `ClePhotoRepli` non assignable). Ne pas retirer sans
   * vérifier aussi les accès par variable, pas seulement par littéral.
   */
  labImpression3d: medias('lab/lab-machine-2026.webp'),

  /**
   * ⚠️ REMPLACÉE le 3 septembre 2026 (revue du prompt de corrections finales,
   * point 9) — l'ancienne photo montrait une nacelle posant une enseigne
   * F.Auger dont le texte publicitaire (« Paysagement/Landscaping — gazon
   * synthétique ») était lisible et dominant en hero de la page
   * Installations : donnait exactement l'impression interdite par le brief
   * (« KO-LAB = entreprise de paysagement »). Signalé aussi comme un risque
   * déjà identifié ailleurs dans ce fichier pour la même famille de photos
   * (voir `enseignePoseAlt2026` plus bas, écartée du hub pour la même
   * raison) — pas appliqué à ce hero-ci à l'époque.
   *
   * Nouvelle photo : nacelle élévatrice en hauteur sur une façade
   * commerciale, technicien au travail — installation d'affichage vitrine
   * pour des commerces locataires (barbier, studio beauté). Fichier déjà
   * présent dans Storage (`installations/`, uploadé le 29 août 2026) mais
   * jamais câblé nulle part avant ce remplacement — trouvé en listant le
   * dossier Storage directement, pas suggéré par un commit existant.
   *
   * Commerces tiers visibles en arrière-plan (vitrines imprimées) :
   * confirmé par l'utilisateur (3 septembre 2026) que ce n'est PAS le même
   * cas que Pacini/Village Transition — ces impressions vitrine sont un
   * travail RÉALISÉ PAR KO-LAB (impression + installation, activité réelle
   * de l'entreprise via son volet impression/Turbo Impression), pas une
   * photo d'un client tiers non sollicité. Aucune demande du boss de la
   * retirer.
   */
  installationNacelle: medias('installations/installations-1787967308818.jpg'),

  /**
   * Photos réelles — lot Installations, correspondance fournie par Christian
   * le 19 août 2026 (KO-LAB-PHOTOS/_metadonnees.txt). Sur les 5 destinations
   * de la table, seules ces 3 ont une photo qui respecte la règle logos et ne
   * montre personne d'identifiable — vérifié une par une, pas sur la foi de
   * la liste d'exclusion fournie (elle s'est trompée de fichier une fois,
   * voir _metadonnees.txt). Les deux autres (sapin, décor sur mesure) restent
   * en PhotoPlaceholder : aucune photo propre disponible dans ces dossiers.
   *
   * installationsPrincipale est câblée dans Installations.tsx (section 5,
   * accueil). Alternative est câblée depuis le 20 août 2026 dans la carte
   * « installations » du hub /nos-capacites — elle y remplace besoinInstaller,
   * qui apparaissait déjà trois fois ailleurs sur le site (revue visuelle du
   * 20 août 2026, point 1). Guirlandes sert désormais realisationInstallation
   * plus bas, même raison.
   */
  installationsPrincipale: medias('installations/installation-principale-2025.webp'),
  installationsAlternative: medias('installations/installation-alt-2025.webp'),
  installationsGuirlandes: medias('installations/installation-guirlandes-2025.webp'),

  /**
   * Photos réelles — quatre nouveaux lots du 20 août 2026 (enseignes F.Auger,
   * HAP 2023, Feux sur glace 2024, créations 2025), droits confirmés par
   * Christian sur l'ensemble. 25 destinations fournies, 17 ont une photo qui
   * passe la vérification individuelle (logos tiers, texte « lumivalli »,
   * personne identifiable, qualité) ; 8 écartées — voir le rapport de phase
   * pour le détail. Câblage complété le 20 août 2026 (galeries des quatre
   * pages capacités, page Location, carte « Fabriquer » de l'accueil), puis
   * complété une seconde fois le même jour (revue visuelle, point 1 —
   * redistribution des photos dupliquées) : `espaceAmenage2023` sert
   * maintenant l'en-tête du hub /nos-capacites (remplace `hero`, qui y
   * apparaissait en plus de l'accueil et de deux pages capacités).
   * `enseignePoseAlt2026` essayée sur ce même emplacement en premier, écartée :
   * son texte publicitaire tiers (numéro de téléphone et site web du client
   * F.Auger) devient le sujet dominant du cadre une fois recadré en bannière
   * étroite sur mobile — vérifié à l'écran. `structureEclairee2024` sert
   * `preuveTerrain` plus bas. `enseignePoseAlt2026` reste donc sans
   * consommateur. Événements d'avant 2025 non nommés dans les textes,
   * consigne existante.
   *
   * `enseigneCommerciale2026`, `signalisation2026` et `signalisationAlt2026`
   * (photos initiales de ce lot) RETIRÉES le 21 août 2026 : en vérifiant un
   * doute sur l'orientation EXIF, relecture des photos déjà en ligne — les
   * trois montraient en réalité l'enseigne Pacini et la numérotation Village
   * Transition, deux clients réels identifiables présentés comme des
   * exemples génériques (« enseigne commerciale installée en façade »,
   * « signalisation numérotée »), jamais sollicités pour figurer sur le site
   * de KO-LAB. Fichiers laissés dans Storage (medias/installations/) —
   * réutilisables si Christian obtient leur accord — mais plus référencés
   * ici. Voir docs/audits/2026-08-21-photos-clients-non-autorisees.md et,
   * dans ETAT-DU-PROJET.md, la règle de méthode sur les dossiers source
   * réutilisés d'une phase à l'autre.
   */
  // Enseignes F.Auger — le client dont l'enseigne est posée, jamais présenté
  // comme une marque KO-LAB (voir installationNacelle, qui réutilise la
  // première de ces photos).
  enseignePose2026: medias('installations/enseigne-pose-2026.webp'),
  enseignePoseAlt2026: medias('installations/enseigne-pose-alt-2026.webp'),
  // ⚠️ Servait aussi à la galerie Opérations terrain (en dur) avant l'étape
  // 3/3 — ce consommateur est passé à galeries_photos, mais `carrieres-photo.ts`
  // (photoPourDepartement, repli département « Opérations ») y accède encore
  // par variable (`IMAGES[cle]`), invisible à un grep sur `IMAGES\.` + nom
  // littéral — voir le même avertissement sur `labImpression3d` plus haut.
  chantierBalisage2026: medias('operations/chantier-balisage-2026.webp'),
  transportRemorque2026: medias('deployment/equipements-chargement-2026.webp'),

  // Remplacement du 21 août 2026 (voir note ci-dessus) — lot « terrasse 2021 »,
  // déjà vérifié sans marque tierce lisible ni personne identifiable au
  // premier plan lors du traitement de la réalisation Terrasse LPG le même
  // jour. terrasseStructure2021 reprenait l'ancien emplacement hero
  // (operations-terrain) de signalisationAlt2026 ; l'autre reprend
  // l'emplacement de galerie d'installations de enseigneCommerciale2026.
  //
  // ⚠️ terrasseStructure2021 RETIRÉE du hero operations-terrain le
  // 3 septembre 2026 (point 7 des corrections finales) : le remplacement du
  // 21 août avait priorisé l'absence de marque tierce/personne identifiable
  // (urgent à l'époque), pas le sujet — cette photo montre la construction
  // d'une pergola en bois (charpente), plus proche d'« Installations » que
  // d'« Opérations terrain ». Reste utilisée ailleurs (constante conservée) ;
  // voir baseOperationsAerienne ci-dessous pour le remplacement.
  terrasseStructure2021: medias('installations/terrasse-structure-2021.webp'),
  terrasseAmenagee2021: medias('installations/terrasse-amenagee-2021.webp'),

  /**
   * Photo réelle — vue aérienne (drone) d'une base d'opérations KO-LAB sur
   * site : tente et véhicule utilitaire tout-terrain aux couleurs KO-LAB
   * (« OPS-01 »), remorque fermée, zone de préparation/matériel. Choisie le
   * 3 septembre 2026 (point 7) comme nouveau hero de la page Opérations
   * terrain — remplace terrasseStructure2021 (voir sa note ci-dessus).
   * Aucune marque tierce lisible, aucune personne identifiable au premier
   * plan (silhouettes lointaines en plongée). Fichier déjà présent dans
   * Storage (`operations/`) mais jamais câblé nulle part avant ce
   * remplacement — trouvé en listant le dossier Storage directement.
   */
  baseOperationsAerienne: medias('operations/besoin-1-1787965898520.jpg'),

  // HAP 2023 — 2 destinations propres sur 6 (décor illuminé et montage en
  // cours écartés : visage d'enfant identifiable + flou pour l'un, texte
  // « lumivalli » pour l'autre ; logistique écartée pour logos tiers
  // dominants). La deuxième, amenagementSalle2023, retirée d'ici le 27 août
  // 2026 (étape 3/3, migration 0043) : son seul consommateur (galerie
  // Location, en dur) est passé à galeries_photos.
  espaceAmenage2023: medias('installations/espace-amenage-2023.webp'),

  // Feux sur glace 2024.
  structureEclairee2024: medias('installations/structure-eclairee-2024.webp'),

  // Créations 2025 — 4 destinations propres sur 8 (fabrication-alternative,
  // décor-alternative, activation de marque et structures montées écartées :
  // logo FMG et/ou Desjardins dominant, une fois combiné à du texte
  // « lumivalli » et des visages dont le statut équipe/public était incertain).
  besoinFabriquerKiosque2025: medias('home/besoin-fabriquer-kiosque-2025.webp'),
  // ⚠️ Servait aussi à la galerie Opérations terrain (en dur) avant l'étape
  // 3/3 — même situation que chantierBalisage2026 plus haut : consommateur
  // de galerie parti vers galeries_photos, mais `carrieres-photo.ts` y
  // accède encore par variable pour le repli département « Logistique
  // événementielle ».
  amenagementSite2025: medias('operations/amenagement-site-2025.webp'),

  /**
   * Photo réelle — petite série de pièces imprimées (jaune-vert), tête
   * d'impression Bambu Lab visible en haut du cadre. Atelier KO-LAB,
   * lot du 18 août 2026 (dossier « le lab 3d » / Petite série production).
   *
   * Câblée le 20 août 2026 (revue visuelle, point 4) dans Boutique.tsx
   * (section 12, accueil) — seule section sans consommateur depuis la
   * Phase 8, où cette clé attendait justement un usage.
   *
   * ⚠️ MODÈLE — la machine visible porte la marque « Bambu Lab » (lisible,
   * réel) mais AUCUN numéro de modèle identifiable dans ce cadrage —
   * volontaire : le catalogue vend le X1 Carbon et le P1S, pas la machine
   * de cette photo (un X2D, `lab/lab-machine-2026.webp`). L'usage actuel
   * reste générique (carte d'accueil vers la boutique, pas une fiche
   * produit précise) : si cette clé est un jour posée sur UNE fiche produit
   * précise, vérifier que le modèle correspond à ce qui est vendu — sinon
   * même défaut que l'ancien placeholder Unsplash, juste avec une vraie
   * photo.
   *
   * Aucune mention de statut de revendeur nulle part autour de cette image
   * (RAPPEL Phase 8) : KO-LAB n'est ni revendeur ni distributeur autorisé
   * Bambu Lab — la photo montre l'atelier, pas une affirmation commerciale.
   */
  boutiqueImpression3d: medias('boutique/impression-3d-2026.webp'),

  /**
   * ⚠️ TOUJOURS UNSPLASH — aucune photo de soudure reçue, y compris dans les
   * quatre lots du 20 août 2026 (revérifiés pour cette raison). Soudeur au
   * masque, arc blanc-bleu, atelier noyé dans le noir.
   */
  soudeur: unsplash('photo-1745448797900-35d08e85e9db'),

  // preuveTerrain et realisationInstallation ne dupliquent plus hero et
  // besoinInstaller depuis le 20 août 2026 (revue visuelle, point 1) : ces
  // deux photos apparaissaient déjà 3-4 fois chacune ailleurs sur le site
  // (accueil, deux pages capacités, cette section) — la règle du point 1 est
  // qu'un emplacement proche du hero (deux sections plus bas) n'affiche
  // jamais la même photo qu'une autre page déjà très visible. Elles reprennent
  // maintenant structureEclairee2024 et installationsGuirlandes à la place,
  // deux photos du lot du jour même qui n'avaient pas encore de consommateur.
  // realisationTerrain NE SUIT PLUS besoinDeployer depuis le 3 septembre 2026 :
  // les deux pointaient sur la photo de feux d'artifice retirée ce jour-là
  // (voir besoinDeployer plus haut pour la raison). Elles prennent maintenant
  // deux photos distinctes du même lot `deployment/`, chacune ajustée à son
  // emplacement — les camions brandés pour le besoin « déployer », la livraison
  // de mobilier pour la carte « Déploiement événementiel ». realisationLab
  // (soudeur) reste seule encore Unsplash — voir son commentaire plus haut.
  preuveTerrain: medias('installations/structure-eclairee-2024.webp'),
  /**
   * Photo réelle — remorque KO-LAB chargée de mobilier événementiel (tables
   * cocktail, barils) livrée sur un site sous chapiteaux, camion attelé,
   * membre de l'équipe au travail. Colle au libellé de la carte
   * (« Déploiement événementiel ») bien mieux que la photo pyrotechnique
   * qu'elle remplace. Fichier déjà dans Storage, jamais câblé avant.
   */
  realisationTerrain: medias('deployment/deployment-camion-1787966108829.jpg'),
  realisationInstallation: medias('installations/installation-guirlandes-2025.webp'),
  realisationLab: medias('lab/realisation-lab-impression-2026.webp'),
  /** Réutilisée par les Réalisations : la CNC porte déjà la section LAB. */

  /**
   * Photos réelles — Phase 5, section 4 (Opérations terrain), accueil.
   * Deux fichiers pour le même sujet : `Vertical` recadre l'équipe pour un
   * écran portrait plutôt que de forcer une photo pensée pour du paysage
   * dans un cadre trop étroit (skill 11).
   */
  operationsCrew: medias('operations/operations-crew-2026.webp'),
  operationsCrewVertical: medias('operations/operations-crew-vertical-2026.webp'),

  /** Photo réelle — Phase 5, section 7 (Équipements et déploiement), accueil. */
  deploiementRemorque: medias('deployment/deploiement-remorque-2026.webp'),

  /**
   * ⚠️ Retirée de la section 7 le 20 août 2026 (revue visuelle, point 3) :
   * caisse de camionnette pleine de bouteilles Gatorade et Eska, logos tiers
   * dominants et lisibles — sous le titre « Les bons moyens permettent de
   * livrer », ça dessert le propos plutôt que de le servir. Remplacée par
   * transportRemorque2026 (voir plus haut, EquipementsDeploiement.tsx).
   * Fichier resté dans Storage ; décision de le retirer du bucket à prendre
   * par Christian, pas exécutée ici.
   *
   * Servait aussi à la galerie Équipements (en dur) avant l'étape 3/3 —
   * consommateur de galerie parti vers galeries_photos le 27 août 2026, mais
   * `carrieres-photo.ts` y accède encore par variable (`IMAGES[cle]`) pour
   * le repli département « Transport & logistique » — même situation que
   * `labImpression3d`/`chantierBalisage2026`/`amenagementSite2025` plus
   * haut, invisible à un grep sur `IMAGES\.deploiementCamion` littéral.
   */
  deploiementCamion: medias('deployment/deploiement-camion-2026.webp'),

  /**
   * Photos réelles — Phase 5, section 11 (Location), accueil.
   * locationMobilier existe déjà plus haut (besoinLouer) : même photo,
   * réutilisée ici pour le même besoin — duplication assumée, pas une erreur.
   */
  locationStructures: medias('rental/location-structures-2026.webp'),
  locationAmbiance: medias('rental/location-ambiance-2026.webp'),
} as const

/**
 * Cadrages. Deux des photos retenues sont au format vertical : sans recentrage,
 * un recadrage 16/9 couperait précisément les silhouettes qui font l'image.
 */
export const CADRAGES = {
  /**
   * Photo réelle (les deux camions KO-LAB), format portrait 3:4 recadré dans
   * une carte 16/9 — les camions occupent la bande centrale, ciel au-dessus
   * et herbe en dessous. 55 % vertical plutôt que 30 % : le réglage précédent
   * était calé sur la photo pyrotechnique remplacée le 3 septembre 2026 et
   * n'aurait montré que du ciel ici. Vérifié par capture d'écran réelle.
   */
  besoinDeployer: 'object-[50%_55%]',
  /**
   * Photo réelle (remorque de mobilier livrée sur site), format paysage 4:3 —
   * la remorque chargée traverse le bas du cadre, les chapiteaux occupent le
   * haut. Cadrage propre à cette carte depuis le 3 septembre 2026 : elle
   * partageait celui de besoinDeployer tant que les deux emplacements
   * pointaient sur la même photo.
   */
  realisationTerrain: 'object-[50%_60%]',
  /**
   * Photo réelle (équipe KO-LAB, Canada Day 2026), format portrait recadré
   * dans une carte 16/9 — le groupe se tient dans le tiers bas du cadre.
   * L'ancien réglage (22% 40%, calé sur l'ex-silhouette Unsplash) montrait la
   * bannière plutôt que l'équipe une fois la vraie photo posée ; corrigé en
   * visionnant le rendu réel de la carte, pas en le supposant.
   */
  besoinInstaller: 'object-[55%_82%]',
  /**
   * ⚠️ Recalé le 3 septembre 2026 avec le remplacement de la photo
   * (`installationNacelle` dans IMAGES, voir sa docstring) — nouvelle photo
   * paysage (2304×1092), nacelle et technicien centrés-haut plutôt que
   * dans le tiers supérieur droit de l'ancienne. Le voile de lisibilité du
   * hero assombrit la GAUCHE du cadre (voir PageCapacite.tsx, dégradé
   * `from-ko-scrim/[0.92] ... to-ko-scrim/45`) : le point focal doit rester
   * du côté droit, plus clair, pour que le sujet reste visible derrière le
   * texte. Réglage initial posé par estimation des coordonnées du sujet
   * dans l'image (~55% horizontal, ~32% vertical), à confirmer par capture
   * d'écran réelle du rendu — voir le rapport de la conversation.
   */
  installationNacelle: 'object-[55%_32%]',
} as const
