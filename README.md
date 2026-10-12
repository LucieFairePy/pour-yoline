<div align="center">

# Pour Yoline

**Toutes les destinations, au même endroit.**

[▶ Ouvrir le launcher](https://luciefairepy.github.io/pour-yoline/)

</div>

---

La page d'accueil est un launcher : chaque site fait pour Yoline y a sa bulle, avec une image de sa première scène.

## Destinations

| #   | Site                               | Dossier                      | Démo                                                            |
| --- | ---------------------------------- | ---------------------------- | --------------------------------------------------------------- |
| 01  | [Le voyage](voyage/README.md)      | [`voyage/`](voyage/)         | [ouvrir](https://luciefairepy.github.io/pour-yoline/voyage/)    |
| 02  | [BORDERLINE](borderline/README.md) | [`borderline/`](borderline/) | [jouer](https://luciefairepy.github.io/pour-yoline/borderline/) |

## Lancer en local

Aucun build, aucun serveur : ouvrir `index.html` dans un navigateur (le double-clic suffit), puis choisir une bulle.

## Ajouter un site

1. Mettre le site dans son propre dossier à la racine, par exemple `nouveau/` avec son `index.html`.
2. Ajouter une image de sa première scène dans `launcher/img/` (format 16:10, `.webp`).
3. Ajouter une entrée dans [`launcher/sites.js`](launcher/sites.js) :

```js
{
  href: 'nouveau/index.html',
  img: 'launcher/img/nouveau.webp',
  title: 'Nouveau',
  sub: 'Une phrase pour le décrire',
  tag: 'Mois année',
},
```

## Structure

```
index.html            le launcher
launcher/
  sites.js            la liste des destinations
  main.js             bulles, transitions, ciel étoilé
  style.css           styles du launcher
  img/                une image par destination
voyage/               Le voyage (site complet, voir son README)
borderline/           BORDERLINE, le jeu coop (voir son README)
```

## Licence

[MIT](LICENSE)
