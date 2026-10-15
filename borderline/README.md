<div align="center">

# BORDERLINE

**Un jeu à deux. On ne gagne jamais seul.**

[▶ Jouer](https://luciefairepy.github.io/pour-yoline/borderline/) · [← Toutes les destinations](../README.md)

</div>

---

Un jeu coopératif en 3D, à la troisième personne, jouable dans le navigateur. Deux astronautes se réveillent dans une
ville vide. Des écrans géants s'allument, et pour rentrer il faut gagner des cartes.

Le jeu complet : un prologue, huit cartes à gagner, puis les derniers actes, pour une longue soirée.

| Partie   | Nom                     | Ce qui se passe                                                       |
| -------- | ----------------------- | --------------------------------------------------------------------- |
| Prologue | Réveil                  | Se retrouver au son dans la ville vide                                |
| ♥ 10    | La Balance              | Ponts invisibles, treuil, grappin, cabines                            |
| ♠ 3     | Un, deux, trois, Soleil | Avancer quand la Poupée chante, se cacher l'un derrière l'autre       |
| ♣ 4     | Le Labyrinthe noir      | Guider l'autre dans le noir, désamorcer une bombe à cœurs             |
| ♠ 7     | La Crypte               | Un donjon : leviers, Cavaliers, spectres invisibles, le Cavalier noir |
| ♠ R     | Le Roi de Pique         | Vagues d'ennemis et un boss en trois phases                           |
| ♦ 9     | Les Portes              | Des portails, de la vitesse, deux boutons                             |
| ♥ 2     | La Rivière              | Une balade : pont de lumière, lanternes, cascade, questions à deux    |
| ♣ R     | Le Caveau               | Un raid : ascension par rôles, l'Oracle, rituels de symboles, Égide   |
| III      | L'Heure dorée           | Une balade sans épreuve, des souvenirs, un toit                       |
| IV       | Le Joker                | …                                                                     |
| V        | Deux mondes             | Séparés, chacun ouvre le chemin de l'autre                            |
| ♛        | Dame de Cœur            | …                                                                     |

Chaque carte gagnée fait revenir un souvenir dans la ville.

Six cassettes sont cachées dans le jeu. Les trouver toutes débloque une fin secrète.

## Jouer

1. Ouvrir le jeu, cliquer sur **Créer une partie** et choisir son agent.
2. Envoyer le lien affiché à l'autre joueur.
3. Quand il a cliqué, chacun appuie sur **Entrer dans le Borderland**.

Chacun joue sur son ordinateur, la connexion se fait directement entre les deux navigateurs. Le micro est facultatif : la
voix est spatialisée, plus on est loin, moins on s'entend.

| Action    | Clavier / souris      | Manette |
| --------- | --------------------- | ------- |
| Bouger    | ZQSD / WASD / flèches | stick G |
| Regarder  | souris                | stick D |
| Sauter    | Espace                | A       |
| Courir    | Maj                   | LB / L3 |
| Interagir | E                     | X       |
| Capacité  | F / clic droit        | RB / RT |
| Appeler   | C                     | Y       |
| Pause     | Échap                 | Start   |

**La Dame** a un grappin et voit ce que l'autre ne voit pas. **Le Valet** a un double saut et porte ce qu'elle ne peut
pas porter.

La progression est sauvegardée chez la personne qui crée la partie.

## Tester seul

Ouvrir deux onglets :

- `index.html?local=test&role=dame&host=1`
- `index.html?local=test&role=valet`

## Structure

```
index.html          écrans (lobby, pause, HUD) et ordre de chargement
css/game.css        interface
js/
  config.js         tous les textes
  core/             utilitaires, réglages, entrées clavier/manette, audio génératif, icônes (Lucide, ISC)
  net/net.js        connexion pair-à-pair (PeerJS) et mode local (BroadcastChannel)
  world/            rendu, ciel, ville, écrans, astronautes, arènes, particules, cassettes, physique
  hq/ cine/         astronautes détaillés et film d'intro
  game/             HUD, joueur, joueur distant, caméra, bancs, moteur d'histoire, lobby
  levels/           un fichier par partie (ville, act1 … act5, soleil, donjon, balade, raid, final)
  lab/lab.js        salles de test des assets (lab.html)
  main.js           boucle de jeu
assets/             modèles, textures, sons, sprites externes (CC0) : voir assets/CATALOG.md
lab.html            labo assets : ?lab=sword|grapple|veil|stone, &ext=0 (fait main) / 1 / all
```

Assets externes : déclarés une fois dans `js/core/assets.js` (chargement unique, partagé, en
arrière-plan), branchés sur les systèmes existants par `js/game/assetfx.js` sans en changer la
logique. `?noassets` revient partout à la version faite main.

Passe « Look » (prototype Terre 39, `js/world/look.js`) : scans Poly Haven (asphalte, pierre, bois :
albedo + normale + rugosité) chargés seulement quand un niveau du monde 1 les utilise, rue éclairée
par ses vrais lampadaires (flaques, reflets, vitrines), cônes de lumière, reflets de nuit sur le
métal et le bois verni, réglage de lumière par scène, sons Kenney (cartes, interface, pas, leviers).
`?look=0` (ou `?noassets`) = rendu d'avant ; `?look=tex,ground,lamps,env,grade,sound` = au choix ;
`&tex=all` = les scans dans tous les mondes (aperçu de la généralisation).

L'hôte fait autorité sur l'état de la partie, chaque joueur simule son propre personnage.

## Icônes

Pas d'emoji dans l'interface. Les icônes viennent de [Lucide](https://lucide.dev) (licence ISC),
embarquées en données de tracé dans `js/core/icons.js` pour fonctionner hors ligne et en `file://`.
Les symboles de cartes (♥ ♠ ♦ ♣, couronne, Joker) restent du texte dans `config.js` et sont
convertis en SVG à l'affichage : `Icons.set(el, texte)` / `Icons.rich(texte)` pour le DOM,
`Icons.fillText(ctx, texte, x, y)` pour les textures canvas, `<i data-ic="nom"></i>` dans le HTML.

## Yoline, William et les kits

Au lobby on choisit qui on est : Yoline (combinaison verte) ou William (bleue). Les mécaniques
des niveaux restent écrites pour deux kits, `dame` et `valet` (`Story.role`, `c.role`), mais le
kit change selon le chapitre (`SWAP` dans `js/game/story.js`) pour que chacun ait son tour :

| Kit   | Déplacement                       | Arme (combat)        | Rôle                            |
| ----- | --------------------------------- | -------------------- | ------------------------------- |
| dame  | grappin, double saut              | fusil (rafale)       | voit l'invisible, guide         |
| valet | double saut renforcé              | épée (étourdit)      | porte, protège, le Voile        |

Yoline a le kit dame dans ♥ 10, ♣ 4, ♠ R, ♣ R, Joker et final ; William l'a dans ♠ 3, ♠ 7,
♦ 9 et Deux mondes (le Caveau inverse aussi les rôles au dernier rituel). Les textes utilisent
des jetons résolus pour le lecteur : `{mate}`, `{il}`, `{lui}`, `{le}`, `{e}`, `{pe}`
(`Story.fmt`, appliqué par le HUD). Armes : `js/game/weapons.js`.
