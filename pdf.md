# Cycle de Vie et Génération des PDFs

Ce document explique le processus technique de création d'une attestation PDF, de la demande initiale jusqu'à la génération du fichier final sécurisé.

## 1. Soumission de la Demande
Tout commence lorsqu'un **Bénéficiaire** soumet un formulaire de demande d'attestation via l'interface client.
*   Le client envoie un `form_payload` (données du formulaire) et un `attestation_type_id`.
*   Le serveur enregistre la demande dans la table `attestation_requests` avec le statut `pending`.

## 2. Approbation Administrative
Un **Agent Administratif** ou un **Administrateur** examine la demande. S'il l'approuve :
*   L'API déclenche la fonction `approveRequest` dans le contrôleur des requêtes.

## 3. Génération des Identifiants Uniques
Avant de créer le PDF, le système génère des éléments de sécurité cruciaux :
*   **UUID d'Attestation** : Un identifiant unique pour l'entrée en base de données.
*   **Identifiant Document (UID)** : Un numéro de série lisible (ex: `VERQR-2024-XXXX`).
*   **Token QR** : Une chaîne aléatoire cryptographique de 24 octets utilisée pour le lien de vérification.

## 4. Création du Code QR
*   Le système construit l'URL de vérification : `https://[app-url]/verify/[token]`.
*   Le service `qr.service.js` utilise la bibliothèque `qrcode` pour générer un tampon (Buffer) d'image PNG contenant ce code QR.

## 5. Composition du Contenu Textuel
*   Le service `attestationCopy.service.js` génère le texte officiel du certificat (en français).
*   Il injecte dynamiquement les données du bénéficiaire (Nom, Prénom, Filière, etc.) dans des modèles de phrases pré-définis.

## 6. Assemblage du PDF (Moteur PDFKit)
Le service `pdf.service.js` prend le relais pour construire le document :
1.  **En-tête** : Ajout du nom de l'organisation et du titre du document.
2.  **Métadonnées** : Insertion de l'identifiant unique et de la date d'émission.
3.  **Corps du texte** : Insertion du paragraphe officiel généré à l'étape 5.
4.  **Code QR** : L'image PNG générée à l'étape 4 est positionnée en bas du document.
5.  **Signature** : Ajout d'une zone pour la signature manuscrite ou électronique.

## 7. Stockage et Finalisation
1.  **Upload** : Le tampon PDF final est envoyé vers le bucket de stockage privé de **Supabase Storage**.
2.  **Mise à jour DB** : Le chemin du fichier (path) est enregistré dans la table `attestations`.
3.  **Statut** : La demande d'origine passe au statut `approved`.
4.  **Audit** : Une entrée est créée dans les journaux d'audit pour tracer la génération du document.

## 8. Consultation
Lorsqu'un utilisateur souhaite voir le PDF :
*   L'API vérifie les permissions de l'utilisateur.
*   Elle génère une **URL signée temporaire** (expire après 120 secondes) permettant de visualiser ou télécharger le fichier en toute sécurité depuis le stockage privé.
