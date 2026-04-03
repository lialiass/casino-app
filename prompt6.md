Le projet existe déjà.
Tu dois corriger une régression introduite récemment.
Ne recrée pas l'application.
Ne refactor pas tout.
Corrige uniquement les bugs actuels sans casser les fonctionnalités qui marchent déjà.

## Contexte
La sauvegarde fonctionne maintenant correctement, donc il ne faut pas casser la persistance Supabase.
En revanche, plusieurs régressions UI / UX importantes ont été introduites dans le flow de partie.

---

## Bug 1 — Le flow de partie est cassé

Avant, pendant une partie, j'avais un vrai flow pour gérer la partie en cours.
Je pouvais avancer dans l'interface normalement, gérer les recaves, puis terminer la partie proprement.

Maintenant, il y a un problème :
- une page intermédiaire ou un écran saute trop vite
- l'application passe directement à une autre étape
- je n'ai pratiquement plus que deux choix :
  - terminer la partie
  - abandonner la partie

Ce comportement est mauvais.

### Attendu
Je veux retrouver le comportement d'avant :
- pendant la partie, je dois pouvoir gérer le déroulement normalement
- la recave doit rester accessible et utilisable avant la fin
- l'interface ne doit pas sauter directement à l'étape finale
- le flow doit être fluide et cohérent

---

## Bug 2 — La sélection des gagnants / classements est incorrecte

Quand je suis à l'étape où je dois choisir le gagnant et le deuxième joueur :
- l'application ne me propose pas correctement les joueurs qui ont réellement participé à la partie
- je clique, mais la sélection ne correspond pas correctement aux joueurs de la partie
- il y a un bug dans la liste des joueurs affichés ou dans le composant de sélection

### Attendu
- seuls les joueurs de la partie en cours doivent être proposés
- la liste doit être correcte, stable et utilisable
- la sélection du 1er et du 2e doit fonctionner normalement
- il ne doit pas y avoir d'ambiguïté entre les joueurs présents dans l'application et les joueurs réellement dans la partie

---

## Ce qu'il faut préserver absolument
Ne pas casser :
- la sauvegarde Supabase
- la persistance au refresh
- l'upload des photos
- la logique métier corrigée récemment sur les résultats :
  - le 2e récupère uniquement sa mise initiale
  - ses recaves sont perdues
  - le gagnant récupère les pertes des autres + les recaves perdues du 2e

---

## Travail demandé
1. Identifier précisément la cause de la régression dans le flow de partie
2. Restaurer le flow correct de partie en cours
3. Réparer l'étape de sélection du gagnant et du deuxième
4. Vérifier que les listes affichées utilisent bien les joueurs de la partie active
5. Vérifier que les handlers, états React, props et navigation n'ont pas été cassés par les dernières modifications async
6. Appliquer la correction minimale nécessaire sans casser le reste

---

## Fichiers à inspecter en priorité
- src/pages/GameInProgress.tsx
- src/pages/NewGame.tsx
- src/pages/Results.tsx
- src/store.tsx
- tout composant lié au choix des joueurs, à la recave, à la fin de partie ou à la navigation

---

## Important
- Commence par analyser la régression
- N'écrase pas les fonctionnalités existantes
- Ne fais pas de refactor global
- Corrige les bugs de manière ciblée
- Vérifie que l'UX correspond bien à un déroulement de partie normal

---

## Sortie attendue
Implémente directement dans le projet existant.
À la fin, fais un résumé bref :
- cause du bug
- correction appliquée
- composants modifiés
- ce qui a été préservé