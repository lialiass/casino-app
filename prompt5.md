Le projet existe déjà.
Tu dois corriger une régression introduite par les dernières modifications.
Ne recrée pas l'application.
Ne change pas inutilement l'architecture.
Corrige uniquement ce qui est cassé sans dégrader les fonctionnalités qui marchaient avant.

## Problème principal
La dernière correction a cassé le fonctionnement de la recave pendant la partie.

Avant :
- pendant une partie, je pouvais gérer les recaves normalement
- l'interface permettait de proposer / enregistrer les recaves avant de terminer la partie
- le flow de partie fonctionnait

Maintenant :
- la gestion des recaves bug
- l'expérience de fin de partie est plus cassée qu'avant
- une correction métier a probablement introduit une régression dans le flow existant

## Ce que tu dois faire
1. Analyser précisément pourquoi la dernière modification a cassé la gestion des recaves
2. Restaurer le comportement qui existait avant pour la recave pendant la partie
3. Garder la nouvelle règle métier correcte de calcul final :
   - le 2e récupère seulement sa mise initiale
   - ses recaves sont perdues
   - le gagnant récupère les pertes des autres + les recaves perdues du 2e
4. Ne pas casser :
   - l'ajout de recave
   - l'affichage pendant la partie
   - l'écran de fin de partie
   - la navigation
   - la sauvegarde Supabase

## Attendu fonctionnel
- Je peux lancer une partie normalement
- Pendant la partie, je peux ajouter des recaves comme avant
- Le flow reste fluide
- Au moment de terminer la partie, le calcul final respecte la bonne logique métier
- L'aperçu avant validation doit être cohérent avec le résultat final
- Aucune régression UX ne doit être introduite

## Ce que je veux concrètement
- Corrige la régression sur la recave
- Garde la correction de calcul
- Garde la persistance Supabase
- Si une modification précédente a cassé un composant ou un handler, répare-le proprement
- Vérifie les composants liés à :
  - GameInProgress
  - NewGame
  - Results
  - store
- Vérifie aussi que les fonctions async nouvellement introduites n'ont pas cassé le flow UI

## Important
Avant de modifier, identifie clairement la cause de la régression.
Ensuite applique la correction minimale nécessaire.
Ne fais pas de refactor global.
Ne casse pas les parties déjà fonctionnelles.

## Sortie attendue
Implémente directement dans le projet existant.
À la fin, donne un résumé bref :
- cause du bug
- correction appliquée
- composants modifiés