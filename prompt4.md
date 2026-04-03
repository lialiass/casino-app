Le projet existe déjà.
Tu dois modifier et compléter le code existant sans recréer l'application.

## Objectif
Corriger la logique métier des résultats de partie et corriger la sauvegarde des données pour qu'elles persistent réellement et se synchronisent entre utilisateurs.

---

## Problème 1 : logique de calcul des gains / pertes

La logique actuelle de calcul est incorrecte.

### Règle métier voulue
- Chaque joueur met une cave initiale de 5 €.
- Une recave ajoute 5 € supplémentaires.
- Le joueur qui termine **1er** gagne :
  - toutes les pertes nettes des joueurs classés après lui
  - sauf que le joueur classé **2e** récupère seulement sa cave initiale de 5 €
  - les recaves du 2e ne lui sont pas rendues : elles vont au gagnant

### Règle précise pour le joueur classé 2e
- Le 2e récupère uniquement **sa mise initiale de 5 €**
- Toutes ses recaves sont perdues
- Donc son résultat net est :
  - si aucune recave : `0`
  - si 1 recave : `-5`
  - si 2 recaves : `-10`
  - si 3 recaves : `-15`
  - etc.

### Règle pour les autres joueurs
- Tous les joueurs classés après le 2e perdent l'intégralité de leur mise :
  - cave initiale
  - + toutes les recaves

### Règle pour le gagnant
- Le gagnant récupère toutes les pertes nettes des autres joueurs
- La somme totale des résultats nets doit toujours être égale à 0

### Exemple concret à respecter
Joueurs :
- Ruben : 5 €
- Elias : 15 € au total
- Edgar : 10 € au total
- Paul : 5 €
- Cyprien : 5 €

Classement final :
- 1er : Paul
- 2e : Elias
- autres : Ruben, Edgar, Cyprien

Résultat attendu :
- Elias a mis 15 € mais ne récupère que sa cave initiale de 5 €
- donc Elias perd 10 €
- Ruben perd 5 €
- Edgar perd 10 €
- Cyprien perd 5 €
- Paul gagne 30 €

Résultats nets attendus :
- Paul : +30
- Elias : -10
- Ruben : -5
- Edgar : -10
- Cyprien : -5

Vérifie que cette logique est bien appliquée dans le calcul de fin de partie.

---

## Problème 2 : sauvegarde persistante et synchronisation

Actuellement, si je refresh la page, l'historique disparaît ou les données reviennent à zéro.
Je veux une vraie persistance des données.

### Comportement attendu
- Les joueurs, parties, résultats, historiques et photos doivent être sauvegardés de manière persistante
- Si je recharge la page, je dois retrouver toutes les données
- Si j'ouvre l'application depuis un autre appareil avec le même lien, je dois retrouver les mêmes données
- Si un utilisateur modifie les données, les autres utilisateurs doivent voir la mise à jour
- L'application ne doit plus dépendre uniquement d'un state local ou d'un localStorage non synchronisé

### Ce qu'il faut faire
- Vérifier que toutes les créations, modifications et suppressions sont bien envoyées vers Supabase
- Vérifier que l'historique des parties est bien relu depuis Supabase au chargement
- Vérifier que les abonnements realtime fonctionnent réellement
- Corriger tout endroit où le state local écrase les données distantes
- Corriger tout problème qui fait que les données disparaissent au refresh
- S'assurer que les opérations de création de partie, fin de partie, ajout de joueur, recave, suppression et upload de photo sont bien persistées

---

## Contraintes
- Ne pas recréer l'application
- Modifier uniquement le projet existant
- Ne pas casser les fonctionnalités déjà en place
- Conserver Supabase comme backend principal
- Garder le code propre et cohérent

---

## Travail demandé
1. Corriger la logique de calcul des résultats de partie selon les règles ci-dessus
2. Corriger la persistance des données et la synchronisation entre utilisateurs
3. Vérifier que le refresh de page ne fait plus perdre l'historique
4. Vérifier que l'application lit et écrit correctement dans Supabase
5. Si nécessaire, corriger la structure des données ou les appels Supabase existants
6. Expliquer brièvement à la fin ce qui a été corrigé

Implémente directement dans le code existant.