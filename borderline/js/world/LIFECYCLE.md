# Cycle de vie des mondes

Avant : un monde est construit à la première entrée (`build()`), puis seulement caché à la sortie
(`hide()`). Rien n'est libéré, les colliders restent dans `Phys`. Après 15 niveaux : mémoire GPU
×5, 28 000 meshes dans la scène, framerate de la ville divisé par deux.

Maintenant : un niveau qui déclare son monde (`world: C10` dans `Story.register`) le décharge dès
qu'on entre dans une autre phase (une table de la Cour attend jusqu'à la prochaine épreuve, voir
la politique). Les niveaux sans `world` se comportent comme avant.

## Trois catégories de ressources

**PARTAGÉES : jamais libérées par un monde.**
- `Tex` (`js/world/textures.js`) : cartes procédurales par matière (`Tex.build`), cache de
  matériaux `Tex.mat`, textures des cartes `Tex.card`, scans installés pour une matière
  (`Tex.external`, ex. bois et pierre de la ville). Marqués par `Life.keep` à leur création.
- Le cache `Assets` (`js/core/assets.js`) : l'objet chargé (image décodée, GLTF) reste en cache,
  on ne re-télécharge jamais. Voir plus bas pour la copie GPU d'un scan propre à un niveau.
- Tout ce qui vit dans la scène hors du groupe du monde : la ville, les autres mondes encore
  construits, avatars, armes, `Fx`, ciel global, renderer, BigScreen. `Life.free` parcourt la scène
  au moment du déchargement et ne libère rien de ce qu'elle utilise encore.
- La géométrie unique des sprites de three.js (jamais libérée).
- Les caches en `Map` au niveau d'un module partagé (enemy-models, weapons…) : à marquer avec
  `Life.keep` si un monde en ajoute des copies à son groupe.

**PROPRES AU NIVEAU : libérées au déchargement.**
- Géométries, matériaux et textures canvas du groupe du monde (et des groupes qu'il ajoute
  lui-même à la scène, ex. `wx` de tr_c10 qui suit la caméra), y compris toutes les textures d'un
  matériau : chaque slot `map`, les `uniforms` des ShaderMaterial et les jeux d'uniforms liés par
  `onBeforeCompile` rangés dans `userData`.
- Les ressources créées mais pas forcément attachées au moment du déchargement (matériaux
  échangés sur une plaque, textures de réserve) : passées en `extra` à `Life.free`.
- La copie GPU des scans propres au niveau (ex. `tex.c10stone`) : libérée, l'image décodée reste
  dans `Assets` et sera ré-envoyée au GPU à la reconstruction (sans téléchargement).
- Les colliders : marqués à la construction (`Phys.owner('tr_c10')` … `Phys.owner(null)`),
  retirés par `Phys.drop('tr_c10')` (grille et liste dynamique).
- Lumières, pools (éclairs), listes de meshes utilisées par `update()`, état d'affichage `ST` :
  remis à l'état d'après un chargement de page.
- Listeners et timers créés par `build()` : à retirer dans `unbuild()` (tr_c10 n'en a pas).

**TEMPORAIRES** : éclairs, particules, décals d'impact, douilles. Déjà gérés au cas par cas
(pools, `dispose` ponctuels), on n'y touche pas.

## Pourquoi un parcours de la scène plutôt qu'un comptage de références

Les mondes créent leurs ressources avec `new THREE.X` partout (une cinquantaine de fichiers) : un
compteur devrait être tenu à chaque création et partage, et un seul oubli libère une ressource
encore utilisée. Le parcours de la scène au déchargement (≈ 10 ms) regarde ce qui est réellement
utilisé à cet instant : une ressource partagée à la main entre deux mondes reste vivante tant
qu'un des deux est construit. Seuls les caches hors scène doivent marquer ce qu'ils prêtent
(`Life.keep`). En three r128, une ressource libérée par erreur puis réutilisée est simplement
ré-envoyée au GPU (pas de plantage) : l'erreur coûterait un à-coup, pas un bug.

## Le contrat d'un monde

- `build()` : idempotent comme avant, colliders marqués à son nom (`Phys.owner`).
- `unbuild()` : `Life.free([groupes], extra)`, `Phys.drop(nom)`, `built = false`, puis remise à
  zéro de chaque variable de module que `build()` remplit (tableaux, objets, pools, lumières,
  état d'affichage `ST`, éléments DOM ajoutés à la page). Un `build()` suivant refait le monde à
  l'identique. Les tables lues par le niveau (`W.doors`, `W.buds`…) sont vidées sur place, jamais
  remplacées : le niveau garde la même référence.
- Ce qui est créé au chargement du script (matériaux de module, caches de géométrie) reste comme
  objet : sa copie GPU est libérée, three la ré-envoie au `build()` suivant.
- Un matériau `Tex.mat` (partagé, en cache) qu'un monde enveloppe (`onBeforeCompile` de scans,
  `envify`) ne l'est qu'une fois : un drapeau dans `userData` évite de l'envelopper à nouveau.
- Les groupes restent dans la scène, vides et cachés (les groupes de zone sont raccrochés).
- Un message réseau tardif d'un niveau dont le monde est déchargé est ignoré (`Story`), et
  `bolt` vérifie `built`.

## La politique

- Un seul point d'accroche : `Story.enter` (`js/game/story.js`), via le champ `world` de la
  définition du niveau. Les niveaux sans `world` se comportent comme avant.
- Monde d'une seule phase : déchargé dès l'entrée dans la phase suivante (récompense, film ou
  ville). La ville reste toujours chargée.
- Monde partagé par plusieurs phases (les 4 tables de la Cour, V/D/R) : il attend pendant la
  ville, la récompense et les films (le joueur passe par la ville entre deux figures) et n'est
  déchargé qu'à l'entrée d'une autre épreuve. Au plus une table attend ainsi.
- Pas de « niveau précédent gardé » pour les autres : on ne rentre jamais dans un niveau qu'on
  vient de quitter (un échec ne change pas de phase). Mesuré : la reconstruction ajoute 0,8 à
  1,5 s à l'entrée (écran noir du fondu), contre 0,5 à 0,7 Go de GPU gardés sinon.
- L'état narratif `Story.S` n'est jamais touché : décharger ne change que ce qui est affiché.
  Rentrer dans le niveau (reprise après rechargement, nouvelle entrée) le reconstruit.

## Mondes déchargeables

Tous les mondes d'épreuve : les 4 tables de la Cour (cour_h, cour_c, cour_d, cour_s), tr_s1, tr_s2,
tr_s4, tr_s5, tr_s6, tr_c1, tr_c2, tr_c3, tr_c5, tr_c6, tr_c7, tr_c10, tr_d1 à tr_d7, tr_d10, tr_h3
à tr_h8, tr_h10, tr_ufo, soleil, donjon, garde, portes, balade, raid, la finale (`final`, déchargée
à l'épilogue), worlds.js (act5), l'arène (act1) et le labyrinthe (act2).

Restent chargés : la ville (toujours), et ce qui joue dans la ville (prologue, welcome, act3, act4,
epilogue, la récompense). `garde` est partagé avec `stand` quand `?stand` charge ce niveau de
test : il attend alors dans la ville comme une table de la Cour.

Points relevés en passant :
- Les tables remplies au `build()` et jamais vidées doublaient à la reconstruction (instances
  de façades de tr_s2, prismes de tr_s6, sièges de tr_d6, arbres de balade, pièces du donjon,
  points du chemin de tr_d2) : vidées dans `unbuild()`.
- Les mondes dont le `build()` tire au hasard le font sur une graine : tr_c2 (dalles) et le
  labyrinthe (fissures) n'utilisent plus `Math.random` au build, la reconstruction est identique.
- La graine partagée `S.seed` (arène, labyrinthe) ne fait pas partie de la sauvegarde : après un
  rechargement, l'arène et le labyrinthe sont tirés à nouveau (les deux joueurs voient le même).
  Comportement antérieur, indépendant du déchargement.
- `Life.keep` en plus : la texture du dos des cartes (`Cards.backTexture`, prise par tr_s1 et
  tr_h10) et le cœur des galaxies (`Heart`, ciel et plusieurs mondes).

## La carte procédurale 2048² sous un scan (non modifié)

tr_c10 (et les tables de la Cour) lient leurs propres scans sur des matériaux `Tex.mat`, mais
`Tex.mat` construit la matière (`Tex.build`). D'après le code : les matières de tr_c10 (pierre,
brique, bois, métal) sont déjà construites par la ville au chargement de la page ; la pierre et
le bois y sont des scans (`Look`), et c'est `Tex.rescope` qui génère leur carte procédurale en
quittant le monde 1, parce que d'autres matériaux déjà construits (worlds.js, les mondes anciens) en ont
besoin hors du monde 1. Ne pas la générer laisserait ces matériaux sur l'aperçu 256². Le coût est
borné (une fois par matière et par session, dans le cache partagé), il ne grandit pas avec les
niveaux : laissé tel quel.

## Mémoire GPU : ce que mesure le compteur Windows

Mesuré avec `tools/qa/mem-gl.js` (registre des allocations WebGL vivantes, octet près, injecté dans
la page de test) et `tools/qa/mem-tour.mjs` (ville → niveau → ville pour chaque phase, deux joueurs),
le 16/10 sur la même machine, deux tournées par version :

| version | registre en fin de tournée | pic du registre | compteur Windows (pic) |
|---|---|---|---|
| avant les fondations | 13,5 Go | 13,5 Go | 9,4 et 10,1 Go |
| 10 mondes déchargeables | 9,95 Go | 9,95 Go | 8,9 et 11,1 Go |
| tous les mondes | 2,65 Go | 3,1 Go | 5,7 et 5,7 Go |

- Les textures font 97 % du registre ; la géométrie (buffers) moins de 150 Mo par page même avant :
  compter les géométries ne dit presque rien de la mémoire.
- Le compteur « Dedicated Usage » du processus GPU n'est pas le registre : il s'arrête là où la
  carte est pleine (16 Go, partagés avec les autres processus : 15,8 Go occupés au total pendant
  les tournées de référence, d'où des pics de 8,9 à 11,1 Go sans rapport avec le code), il
  additionne les deux pages (deux joueurs = deux fois un joueur), il compte ≈ 0,65 Go par page
  hors WebGL, et il ne rend pas ce qui est libéré : après `WEBGL_lose_context` (registre à zéro),
  il reste 1,4 Go par page, plus qu'au démarrage. Il suit le plus haut niveau atteint, pas ce
  qui est vivant. Un GC forcé ne change rien (les ressources ne tiennent pas à des références JS
  oubliées).
- Ce qui reste après la tournée (par page, 1,3 Go) : la ville (0,47 Go), le cache partagé des
  cartes procédurales `Tex` (une paire 2048² par matière rencontrée, 43 Mo ; 52 textures 2048²,
  0,9 Go en fin de tournée, borné par le nombre de matières), la table de la Cour en attente, et
  ce que les phases jouées dans la ville gardent (act3, act4, prologue).
