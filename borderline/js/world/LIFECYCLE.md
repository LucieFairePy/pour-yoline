# Cycle de vie des mondes

Avant : un monde est construit à la première entrée (`build()`), puis seulement caché à la sortie
(`hide()`). Rien n'est libéré, les colliders restent dans `Phys`. Après 15 niveaux : mémoire GPU
×5, 28 000 meshes dans la scène, framerate de la ville divisé par deux.

Maintenant : un niveau qui déclare son monde (`world: C10` dans `Story.register`) le décharge dès
qu'on entre dans une autre phase. Les niveaux sans `world` se comportent comme avant.

## Trois catégories de ressources

**PARTAGÉES : jamais libérées par un monde.**
- `Tex` (`js/world/textures.js`) : cartes procédurales par matière (`Tex.build`), cache de
  matériaux `Tex.mat`, textures des cartes `Tex.card`. Marquées par `Life.keep` à leur création.
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

- `build()` : idempotent comme avant, colliders marqués à son nom.
- `unbuild()` : `Life.free([groupes], extra)`, `Phys.drop(nom)`, `built = false`, puis remise à
  zéro de chaque variable de module que `build()` remplit (tableaux, objets, pools, lumières,
  `ST`). Un `build()` suivant refait le monde à l'identique.
- Les fonctions appelables par un message réseau tardif (ex. `bolt`) vérifient `built`.
- Les groupes restent dans la scène, vides et cachés.

## La politique

- Un seul point d'accroche : `Story.enter` (`js/game/story.js`). À l'entrée d'une phase, si la
  phase quittée a un `world` différent de celui de la nouvelle phase, `Life.unload(world)`.
- La ville reste toujours chargée (hub, retour en 0,3 s).
- Les mondes partagés par plusieurs phases (les 4 tables de la Cour : V, D, R) ne sont déchargés
  qu'en quittant la table : même `world` d'une phase à l'autre, donc pas de déchargement.
- Pas de « niveau précédent gardé » : dans le jeu, on ne rentre jamais dans un niveau qu'on vient
  de quitter (après un niveau viennent la récompense, la cinématique, la ville, puis un autre
  niveau ; un échec ne change pas de phase). Garder le précédent ne ferait que garder sa mémoire.
  Le coût d'une reconstruction est mesuré dans le rapport (tr_c10 : voir le commit pilote).
- L'état narratif `Story.S` n'est jamais touché : décharger ne change que ce qui est affiché.
  Rentrer dans le niveau (reprise après rechargement, nouvelle entrée) le reconstruit.
