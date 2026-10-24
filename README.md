# Quizz Culture & GeoGuessr Dofus

Jeu multijoueur en ligne autour de Dofus, à jouer entre amis : quizz de culture (quêtes, sorts, panoplies, donjons, métiers, cartes…), GeoGuessr Dofus, « Confusion horaire » du Comte Harebourg et « Monstre pixelisé ».

Le site est statique (HTML, CSS, JavaScript) ; le temps réel passe par une base Firebase Realtime Database.

## Jouer
Ouvrir la page du site, choisir un pseudo, créer un salon (public ou privé) ou rejoindre un salon avec son code à 4 caractères. Le chef du salon choisit les catégories et lance la partie.

- Les questions sont corrigées par le chef (✅/❌ champ par champ), ou automatiquement pour les mini-jeux (classement par distance ou par rapidité).
- La page `stats.html` affiche le taux de réussite de chaque question.

## Héberger sa propre version
1. Créer un projet Firebase avec **Realtime Database** et l'**authentification anonyme**.
2. Copier la configuration web du projet dans `js/firebase-config.js` (ce n'est pas un secret : la sécurité vient des règles).
3. Publier `database.rules.json` dans les règles de la base.
4. Ajouter le domaine du site dans Authentication, Paramètres, Domaines autorisés.
5. Publier le dépôt (GitHub Pages, Firebase Hosting, etc.).

Il est conseillé de restreindre la clé d'API du projet aux domaines du site dans la console Google Cloud.

## Banque de questions
Les questions sont dans `js/questions/` ; la plupart sont générées par les scripts de `tools/` (Python) à partir de sources publiques. Les réponses sont donc lisibles dans le code : ce jeu est fait pour s'amuser, pas pour un concours.

## Crédits et mentions légales
Projet de fans, **non affilié à Ankama**. Dofus est une marque d'Ankama Games. Les noms, illustrations, cartes et données du jeu appartiennent à Ankama.

Sources des données et images : [DofusDB](https://dofusdb.fr), [Dofus sur JeuxOnLine](https://dofus.jeuxonline.info) et [Gamosaurus](https://gamosaurus.com). Merci à leurs auteurs.
