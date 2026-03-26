Le projet existe déjà.
Tu dois modifier le code existant sans recréer l'application.

Corrige la logique de calcul des résultats d'une partie.

Règle métier voulue :
- Le joueur classé 1er ne doit pas gagner tout le pot moins sa propre mise.
- Le joueur classé 2e récupère sa mise et a donc un résultat net de 0.
- Le ou les autres joueurs perdent leur mise totale, y compris les recaves.
- Le gain net du 1er est égal à la somme des pertes nettes des joueurs classés "other".

Exemple attendu :
- Joueur A : 5 €
- Joueur B : 10 € (avec une recave)
- Joueur C : 5 €
- Si A finit 1er, C finit 2e, B finit dernier :
  - A = +10
  - C = 0
  - B = -10

Implémente cette logique dans le calcul de fin de partie.
Vérifie que la somme totale des résultats nets de tous les joueurs est toujours égale à 0.
Ne casse pas le reste de l'application.