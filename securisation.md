# Sécurisation de l'Application VerQR

Ce document détaille les mesures de sécurité mises en œuvre pour protéger l'application, les données des utilisateurs et garantir l'authenticité des documents émis.

## 1. Protection de l'Infrastructure et du Réseau

### Protection de l'Infrastructure et du Réseau

*   **Tunnel Sécurisé (Ngrok)** : L'application est exposée via un tunnel sécurisé Ngrok, fournissant un point d'accès HTTPS chiffré. Cela permet de masquer l'adresse IP réelle du serveur local et de bénéficier des protections de bordure de Ngrok.
*   **Limitation de Charge (Rate Limiting)** : Supabase Auth intègre des mécanismes de limitation pour prévenir les attaques par force brute sur les points de terminaison d'authentification.
*   **Limitation de Taille des Requêtes** : Le serveur API restreint la taille des corps de requête JSON à 2 Mo pour prévenir les attaques par épuisement de mémoire.

### Sécurité du Serveur (Middleware & Base de données)
*   **Protection contre l'Injection SQL** : L'application utilise le client Supabase (PostgREST) qui utilise systématiquement des requêtes paramétrées. Aucune concaténation de chaînes brute n'est utilisée pour construire les requêtes SQL, ce qui neutralise les tentatives d'injection SQL à la source.
*   **Validation des Entrées** : Utilisation de `express-validator` pour valider et assainir (sanitize) toutes les données entrantes. Cela garantit que seuls les formats de données attendus sont traités par le serveur.
*   **Helmet.js** : Utilisation de `helmet` pour configurer des en-têtes HTTP sécurisés (Content Security Policy, XSS Filter, Strict-Transport-Security, etc.).
*   **CORS (Cross-Origin Resource Sharing)** : Les requêtes sont restreintes aux domaines autorisés, empêchant les scripts malveillants sur d'autres sites d'interagir avec notre API.

## 2. Authentification et Contrôle d'Accès

### Authentification Sécurisée
*   **Supabase Auth** : Utilisation d'un système d'authentification robuste basé sur les standards JWT (JSON Web Tokens).
*   **Vérification d'Email** : L'inscription nécessite une validation par email. Cela garantit que chaque utilisateur possède une identité vérifiée et limite la création de comptes automatisés (bots).

### Contrôle d'Accès Granulaire (RBAC)
*   **Rôles Applicatifs** : Système de rôles (Administrateur, Agent Administratif, Bénéficiaire, Vérificateur Externe) assurant que les utilisateurs ne peuvent accéder qu'aux fonctionnalités nécessaires à leur mission.
*   **Row Level Security (RLS)** : Au niveau de la base de données PostgreSQL, des politiques de sécurité (RLS) garantissent que les utilisateurs ne peuvent lire ou modifier que leurs propres données, même en cas de faille dans l'application.

## 3. Sécurisation des Documents (Attestations)

### Protection contre la Fraude
*   **Identifiants Uniques** : Chaque attestation générée possède un identifiant unique universel (UUID) et un numéro de série distinct.
*   **Vérification par QR Code** : Chaque PDF contient un code QR unique. Ce code ne contient pas de données sensibles, mais un **token de vérification cryptographique aléatoire** (24 octets).
*   **Lien d'Authenticité** : Le scan du QR code dirige vers une page officielle de l'application (`/verify/[token]`) qui confirme si le document est authentique, actif ou révoqué, en interrogeant directement la base de données sécurisée.

### Sécurité du Stockage
*   **Stockage Privé** : Les fichiers PDF sont stockés dans des "buckets" privés sur Supabase Storage. Ils ne sont pas accessibles publiquement via une URL directe.
*   **URLs Signées Temporaires** : Lorsqu'un utilisateur autorisé souhaite télécharger une attestation, l'API génère une URL signée avec une **durée de vie limitée (120 secondes)**. Une fois ce délai expiré, l'accès au fichier est automatiquement révoqué.

## 4. Audit et Traçabilité

### Journaux d'Audit (Audit Logs)
Toutes les actions sensibles sont enregistrées dans une table d'audit dédiée, incluant :
*   L'identifiant de l'utilisateur ayant effectué l'action.
*   Le type d'action (Connexion, Émission d'attestation, Téléchargement, Révocation).
*   L'adresse IP source.
*   L'horodatage précis.

Cette traçabilité permet de détecter les comportements suspects et de reconstituer l'historique des modifications en cas d'incident.
