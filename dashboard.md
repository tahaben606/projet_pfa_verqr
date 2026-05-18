# Documentation du Tableau de Bord (Dashboard) - VerQR

Ce document explique le fonctionnement technique et visuel du tableau de bord graphique de l'application VerQR.

## 1. Vue d'ensemble
Le Dashboard est le centre de contrôle de l'utilisateur après sa connexion. Il offre une vue synthétique de l'activité du système, adaptée selon le **rôle** de l'utilisateur (Administrateur, Agent, Bénéficiaire ou Vérificateur).

Il combine :
-   **Indicateurs clés (KPIs)** : Cartes statistiques affichant des nombres globaux.
-   **Graphiques dynamiques** : Visualisation des tendances (ex: pipeline de demandes).
-   **Listes d'activité récente** : Historique des dernières actions ou demandes.

---

## 2. Architecture Frontend (`DashboardPage.jsx`)

Le composant principal se trouve dans `client/src/pages/DashboardPage.jsx`.

### Logique de chargement
Le composant utilise le hook `useEffect` pour interroger l'API `/api/dashboard` dès que la session est active.
```javascript
useEffect(() => {
  async function load() {
    setDashLoading(true);
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setDashLoading(false);
    }
  }
  load();
}, [session]);
```

### Visualisation Graphique (Recharts)
L'application utilise la bibliothèque **Recharts** pour les rendus graphiques. Trois variantes de données sont préparées selon le rôle (`variant`) :

1.  **Staff (Admin/Agent)** : Affiche le pipeline des demandes (En attente, Approuvées, Rejetées).
2.  **Bénéficiaire** : Affiche l'état de ses propres demandes.
3.  **Vérificateur** : Affiche la répartition des attestations dans le système (Actives, Révoquées, Expirées).

Exemple de configuration du graphique :
```jsx
<ResponsiveContainer width="100%" height="100%">
  <BarChart data={staffChart}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis allowDecimals={false} />
    <Tooltip />
    <Bar dataKey="v" fill="#3293fa" radius={[6, 6, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

---

## 3. Architecture Backend (`dashboard.controller.js`)

Le backend gère l'agrégation des données depuis Supabase via `server/src/controllers/dashboard.controller.js`.

### Fonctions d'agrégation
Le contrôleur utilise `Promise.all` pour exécuter plusieurs requêtes de comptage en parallèle, ce qui optimise les performances.

-   **`fetchStaffStats()`** : Compte toutes les demandes et attestations du système + récupère les logs d'audit.
-   **`fetchBeneficiaryDashboard(userId)`** : Filtre les statistiques pour un utilisateur spécifique.
-   **`fetchVerifierDashboard()`** : Se concentre sur l'état global des documents émis.

### Sécurité des données
Les données sont filtrées côté serveur selon le rôle extrait du token JWT :
```javascript
const role = req.user.role;
if (role === 'administrator') {
  // Accès aux stats globales
} else if (role === 'beneficiary') {
  // Accès uniquement à ses propres données
}
```

---

## 4. Composants UI Réutilisables

### StatCard
Un composant stylisé avec **Tailwind CSS** qui affiche un titre, une valeur et une icône avec un dégradé de couleur spécifique (le "tone").
-   `amber` : Pour les éléments en attente.
-   `green` : Pour les succès/approbations.
-   `red` : Pour les rejets/révocations.
-   `blue` : Pour les informations générales.

### RoleBadge
Affiche un badge visuel indiquant le rôle actuel de l'utilisateur, facilitant l'orientation immédiate.

---

## 5. Flux de données résumé
1.  **Utilisateur se connecte** -> Le frontend demande les stats.
2.  **Backend reçoit la requête** -> Vérifie le rôle de l'utilisateur.
3.  **Supabase** -> Exécute les comptages (`count: 'exact'`).
4.  **Backend renvoie JSON** -> Contenant les nombres et les listes récentes.
5.  **Frontend (Recharts)** -> Transforme les nombres en barres graphiques interactives.
