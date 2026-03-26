Tu dois créer/modifier les fichiers directement dans le projet.
Ne réponds pas avec du texte explicatif.
Passe directement à l’implémentation.

PROMPTE : 
# 1. CONTEXTE

Tu es une intelligence artificielle experte en développement d’applications (frontend, backend, UX/UI, architecture logicielle et logique métier).

Moi, je suis un utilisateur qui organise régulièrement des parties de poker entre amis avec de l’argent réel.

Problème actuel :

* Nous jouons plusieurs parties
* Chaque joueur met une mise de départ
* Certains joueurs recavent (remettent de l’argent pour rejouer)
* À la fin, il devient difficile de suivre précisément :

  * qui a gagné
  * qui a perdu
  * combien chacun doit ou doit recevoir

Objectif :
Créer une application simple, ergonomique et fiable permettant de gérer ces parties de poker et de calculer automatiquement les gains et pertes de chaque joueur.

---

# 2. TÂCHE

Ta mission est de CONCEVOIR et CONSTRUIRE une application complète (MVP fonctionnel) permettant de :

* gérer des joueurs
* créer des parties de poker
* gérer les mises et les recaves
* calculer automatiquement les résultats
* afficher un historique et un classement global

Tu dois agir comme :

* un développeur senior
* un product manager
* un designer UX/UI

---

# 3. RÈGLES MÉTIER (LOGIQUE DU JEU)

## 3.1 Mise de départ

* Chaque joueur paie une mise fixe (ex : 5 €)
* Cette mise donne un stack initial identique pour tous

## 3.2 Recave (CRITIQUE)

* Un joueur peut recave s’il perd ses jetons
* Une recave = il repayé la mise de départ
* Il récupère un stack complet

👉 Conséquence :

* Le total engagé par un joueur = mise initiale + (nombre de recaves × mise)

## 3.3 Pot total

* Pot = somme de toutes les mises initiales + toutes les recaves

## 3.4 Résultat de la partie

* 🥇 1er : gagne tout le pot
* 🥈 2e : récupère exactement ce qu’il a engagé → résultat net = 0
* ❌ autres : perdent tout ce qu’ils ont engagé

## 3.5 Formule de calcul

* gagnant = pot total - total engagé personnel
* deuxième = 0
* autres = - total engagé

## 3.6 Règle de cohérence

👉 La somme de tous les résultats nets doit toujours être égale à 0

---

# 4. FONCTIONNALITÉS ATTENDUES

## 4.1 Joueurs

* créer / modifier / supprimer
* sauvegarde persistante

## 4.2 Partie

* sélectionner joueurs
* définir mise
* définir stack initial
* lancer une partie

## 4.3 Partie en cours

* afficher les joueurs
* bouton “recave” par joueur
* afficher :

  * nombre de recaves
  * total engagé

## 4.4 Fin de partie

* sélectionner :

  * gagnant
  * deuxième
* calcul automatique
* enregistrement

## 4.5 Historique

* liste des parties
* détails complets

## 4.6 Statistiques

* gains cumulés
* pertes cumulées
* nombre de recaves
* nombre de victoires

## 4.7 Classement

* tri par performance (gain net)

## 4.8 Règlement entre joueurs (option)

* calculer qui doit combien à qui

---

# 5. UX / UI (STYLE)

Je veux une interface :

* inspirée casino / poker
* sombre (noir / vert / doré)
* simple et rapide
* utilisable en soirée (gros boutons)

Écrans :

1. Accueil
2. Joueurs
3. Nouvelle partie
4. Partie en cours
5. Résultats
6. Historique
7. Classement

---

# 6. CONTRAINTES TECHNIQUES

* Code simple et pédagogique
* Architecture claire
* MVP rapide à développer
* Pas de complexité inutile
* Priorité à la fiabilité des calculs

---

# 7. FORMAT DE RÉPONSE ATTENDU

Tu dois structurer ta réponse comme suit :

1. Résumé de compréhension
2. Architecture technique proposée
3. Choix de stack (avec justification)
4. Modèle de données (clair et structuré)
5. Logique métier détaillée
6. UX/UI (description des écrans)
7. Cas limites à gérer
8. MVP prioritaire
9. Code fonctionnel de base (minimum viable)
10. Suggestions d’amélioration

---

# 8. TON ET STYLE

* Clair
* Structuré
* Pédagogique
* Précis
* Sans blabla inutile
* Niveau expert mais compréhensible

---

# 9. BONUS (SI POSSIBLE)

* mode tournoi
* graphiques
* export des résultats
* sauvegarde cloud
* système multi-utilisateurs

---