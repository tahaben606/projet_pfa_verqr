# VerQR Application Architecture

This application is built using a modern **Client-Server architecture** (specifically, a Single Page Application communicating with a REST API). While it incorporates principles from traditional MVC (Model-View-Controller) architecture, it adapts them to fit modern web development standards.

Below is a breakdown of how the architecture is organized across the backend and frontend.

---

## 1. The Backend (`server/` folder)

The backend follows an architecture heavily inspired by MVC, adapted specifically for building REST APIs:

*   **M (Model):** The data layer is handled by **Supabase** (PostgreSQL). While the application does not use a traditional ORM like Mongoose or Prisma with dedicated model files, the Supabase database acts as the model layer. Data access is managed through the Supabase JS client (`server/src/lib/supabase.js`).
*   **V (View):** Because this is a REST API backend, there are no HTML "views". Instead, the views are simply the **JSON responses** sent back to the client application.
*   **C (Controller):** The `server/src/controllers/` folder acts as the controller. This is where incoming HTTP requests are handled, data is requested from the database, and the correct responses are formulated.

### The Route-Controller-Service Pattern
In addition to standard MVC, the backend uses a best-practice extension known as the **Route-Controller-Service** pattern to keep code clean and modular:
*   **Routes (`server/src/routes/`):** Map incoming URLs to specific controller functions.
*   **Services (`server/src/services/`):** Handle complex business logic (e.g., generating PDFs in `pdf.service.js`, sending emails in `email.service.js`). This keeps the controllers slim and focused only on handling the HTTP request/response cycle.

---

## 2. The Frontend (`client/` folder)

The frontend uses **React**, which does not adhere to strict MVC. Instead, it follows a **Component-Based Architecture**:

*   **View Layer:** The `components/` and `pages/` folders serve as the visual UI elements that the user interacts with. Each piece of the UI is modularized into reusable React components.
*   **State Management / Logic:** Files like `AuthContext.jsx` (and various React Hooks) act as the logic layer that manages the "state" (data) for the views and handles communication with the backend API. 

---

## 3. Architecture Analysis: Pros and Limitations

This SPA + API architecture (using React and Node.js/Express) comes with its own set of advantages and tradeoffs.

### Pros (Advantages)
1. **Clear Separation of Concerns:** The frontend (UI) and backend (business logic/database) are completely decoupled. This makes it easier to manage, scale, and update each part independently.
2. **Reusability (API):** The backend serves JSON data via a REST API. This means the same backend could easily be used to power a mobile app (like React Native or Flutter) in the future without changing the server code.
3. **Enhanced User Experience (SPA):** React loads the application once, and subsequent interactions only request necessary data (JSON) from the server. This results in faster page transitions and a native app-like experience for the user.
4. **Modular & Maintainable Backend:** The Route-Controller-Service pattern keeps controllers lightweight. Business logic is centralized in services, making it easier to test, debug, and reuse (e.g., calling the email service from multiple different controllers).
5. **Component Reusability:** React's component-based structure allows for high UI reusability (e.g., reusing buttons, form inputs, or cards across multiple pages), reducing code duplication.

### Limitations (Disadvantages)
1. **Initial Load Time:** Single Page Applications require the browser to download a large JavaScript bundle on the first visit before the site becomes fully interactive. This can lead to slower initial load times compared to traditional server-rendered apps.
2. **SEO Complexity:** Because content is rendered dynamically on the client-side using JavaScript, Search Engine Optimization (SEO) can be more challenging. While search engines have improved at reading SPAs, traditional HTML-rendered pages (like Next.js/SSR) are generally better for SEO out of the box.
3. **State Management Overhead:** In a component-based frontend, passing data between components can become complex (prop drilling). You have to rely on Context APIs (like `AuthContext`) or state libraries (like Redux/Zustand) to manage global application state.
4. **Security Considerations (Frontend):** Because the entire frontend code is sent to the client, sensitive business logic or secrets cannot be stored there. The API must thoroughly validate and authorize every single request, increasing the burden on the backend controllers and middleware.
5. **Two Codebases to Maintain:** Even if both are written in JavaScript, you have to manage dependencies, environments, and deployments for two distinct applications (Client and Server) instead of a single monolith.
