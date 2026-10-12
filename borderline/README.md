<div align="center">

# BORDERLINE

**Un jeu à deux. On ne gagne jamais seul.**

[▶ Jouer](https://luciefairepy.github.io/pour-yoline/borderline/) · [← Toutes les destinations](../README.md)

</div>

---

Un jeu coopératif en 3D, à la troisième personne, jouable dans le navigateur. Deux astronautes se réveillent dans une
ville vide. Des écrans géants s'allument, et pour rentrer il faut gagner des cartes.

Le jeu complet : un prologue, cinq actes et un final, pour une soirée d'environ une heure.

| Partie   | Nom                | Ce qui se passe                                           |
| -------- | ------------------ | --------------------------------------------------------- |
| Prologue | Réveil             | Se retrouver dans la ville vide                           |
| ♥ 10    | La Balance         | Ponts invisibles, treuil, grappin, cabines                |
| ♣ 4     | Le Labyrinthe noir | Guider l'autre dans le noir, désamorcer une bombe à cœurs |
| III      | L'Heure dorée      | Une balade sans épreuve, des souvenirs, un toit           |
| IV       | Le Joker           | …                                                         |
| V        | Deux mondes        | Séparés, chacun ouvre le chemin de l'autre                |
| ♛        | Dame de Cœur       | …                                                         |

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
  core/             utilitaires, réglages, entrées clavier/manette, audio génératif
  net/net.js        connexion pair-à-pair (PeerJS) et mode local (BroadcastChannel)
  world/            rendu, ciel, ville, écrans, astronautes, arènes, particules, cassettes, physique
  game/             HUD, joueur, joueur distant, caméra, bancs, moteur d'histoire, lobby
  levels/           un fichier par partie (ville, act1 … act5, final)
  main.js           boucle de jeu
```

L'hôte fait autorité sur l'état de la partie, chaque joueur simule son propre personnage.
