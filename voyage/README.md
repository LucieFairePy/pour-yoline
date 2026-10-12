<div align="center">

# Le voyage

**Une déclaration en forme de voyage dans l'espace.**

[▶ Voir la démo](https://luciefairepy.github.io/pour-yoline/voyage/) · [← Toutes les destinations](../README.md)

</div>

---

Un site d'une seule page, en vue subjective : on flotte en combinaison, main dans la main, et on traverse sept chapitres
reliés par des sauts en hyperespace. Tout est dessiné en temps réel (Three.js) et la musique est composée en direct par le
navigateur.

À ouvrir avec le son.

## Le voyage

| #   | Chapitre    | Ce qui se passe                                                                   |
| --- | ----------- | --------------------------------------------------------------------------------- |
| 00  | Départ      | Le prénom écrit en étoiles, loin dans l'espace                                    |
| I   | La lettre   | La lettre arrive en bulles de messages, une par une                               |
| II  | La rose     | Une rose qui se forme à partir de milliers d'astéroïdes                           |
| III | Les étoiles | Une nébuleuse en forme de cœur ; garder le doigt appuyé pour la ressentir         |
| IV  | La question | La question. Le bouton « Non » ne se laisse pas faire, et finit dans un trou noir |
| V   | Oui         | Grand final : galaxie-cœur, feux d'artifice en 3D                                 |
| VI  | Générique   | Le générique de fin                                                               |

## Lancer en local

Aucun build, aucun serveur : ouvrir `index.html` dans un navigateur (le double-clic suffit).
Les librairies sont chargées depuis un CDN, il faut donc une connexion internet.

Sur mobile, le gyroscope sert à regarder autour de soi. Sans WebGL, le texte reste lisible.

## Personnaliser

Tous les textes affichés sont dans [`js/config.js`](js/config.js) :

```js
const CONFIG = {
  name: 'Yoline',          // le prénom (intro, messages, question)
  signature: '— Moi, …',   // signature de la lettre
  letter: [ … ],           // une ligne = une bulle
  credits: [ … ],          // [style, rôle, nom] pour le générique
};
```

## Technique

- **3D** : Three.js r128, shaders GLSL maison (planètes, nébuleuse, trou noir, post-traitement avec bloom)
- **Animation** : GSAP 3.13 (SplitText, ScrambleText)
- **Son** : Web Audio API, musique générative et effets synthétisés, sans fichier audio
- **Code** : HTML, CSS et JavaScript sans framework ni étape de build, formatés avec Prettier

## Structure

```
index.html            scènes + ordre de chargement des CSS et des scripts
css/
  base/               tokens, reset, animations
  components/         hud, curseur, loader, carton de chapitre, scène, boutons
  scenes/             une feuille par chapitre (00-intro … 06-credits)
  responsive.css      media queries
js/
  config.js           textes
  core/               utilitaires, icônes (Lucide, ISC)
  audio/              moteur, instruments, compositeur, battement de cœur, effets
  world/
    core/             renderer, post-traitement, lumières, boucle de rendu
    environment/      ciel, particules, planètes, décors, nébuleuse
    characters/       matériaux, gants, astronautes, poses
    objects/          rose, enveloppe, prénom en étoiles, final
  app/                interface, entrées, curseur, moteur de chapitres, démarrage
  chapters/           la logique de chaque chapitre
```

Les scripts sont des scripts classiques, sans modules ES, pour que le site marche aussi en `file://`. Ils partagent la
même portée globale, donc l'ordre des balises `<script>` dans `index.html` compte.

Pour ajouter un chapitre, il faut :

- `js/chapters/NN-id.js` ;
- `css/scenes/NN-id.css` ;
- son décor dans `js/world/environment/backdrops.js` ;
- une entrée dans `CHAP` (`js/app/chapters.js`).

## Licence

[MIT](../LICENSE)
