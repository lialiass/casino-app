# CONTEXTE
Je développe une application de gestion de parties de poker / casino.
L'application existe déjà en frontend avec Vite + TypeScript.
Je veux qu'elle soit utilisable par plusieurs utilisateurs sur téléphone, avec synchronisation en temps réel et sauvegarde complète.

# OBJECTIF
Transformer cette application en une vraie application multi-utilisateurs, installable sur mobile, avec sauvegarde en ligne, temps réel, et gestion des photos des joueurs.

# FONCTIONNALITÉS À AJOUTER

## 1. Backend et base de données
- Mettre en place une base de données en ligne
- Stocker :
  - joueurs
  - parties
  - résultats
  - historique
  - caves / recaves
  - images de profil des joueurs

## 2. Synchronisation temps réel
- Quand un utilisateur modifie les données, tous les autres utilisateurs voient la mise à jour instantanément
- Les modifications doivent être visibles en direct sur tous les téléphones connectés

## 3. Sauvegarde automatique
- Toutes les données doivent être sauvegardées automatiquement en ligne
- Aucune perte de données après fermeture ou réouverture de l’application
- Les images des joueurs doivent aussi être sauvegardées de manière persistante

## 4. Multi-utilisateurs
- Plusieurs utilisateurs peuvent rejoindre une partie
- Les données sont partagées en direct
- Chaque utilisateur voit les mises à jour faites par les autres

## 5. Gestion des photos des joueurs
- Ajouter une fonctionnalité permettant d’associer une photo à chaque joueur
- Permettre :
  - de prendre une photo avec l’appareil photo du téléphone
  - ou de choisir une image depuis la galerie
- L’image doit être uploadée et sauvegardée en ligne
- L’URL de l’image doit être enregistrée en base de données
- La photo doit s’afficher comme avatar du joueur dans l’application
- Prévoir une fonctionnalité pour modifier ou supprimer la photo
- Gérer proprement les permissions mobile si nécessaire
- Compresser/redimensionner l’image côté client si utile pour éviter des fichiers trop lourds

## 6. PWA
- Rendre l’application installable sur mobile iPhone et Android sans App Store
- Ajouter manifest + icônes + service worker
- L’application doit être agréable à utiliser sur téléphone

## 7. Déploiement
- Préparer le projet pour un déploiement simple sur Vercel
- Configurer les variables d’environnement proprement

# CHOIX TECHNIQUES
- Frontend : Vite + TypeScript
- Backend recommandé : Supabase
- Utiliser :
  - base de données Supabase
  - Supabase Realtime pour la synchronisation
  - Supabase Storage pour stocker les photos des joueurs

# CONTRAINTES
- Ne pas utiliser App Store
- Ne pas utiliser Xcode
- Tout doit fonctionner via navigateur mobile
- L’application doit être simple, propre et robuste
- Priorité à la sauvegarde, au temps réel et à la fiabilité

# CONSIGNE
Implémente directement les modifications dans le projet.
Crée et modifie les fichiers nécessaires.
Structure proprement le code.
Ne réponds pas avec du texte explicatif.
Passe directement à l’implémentation.