# Solid FM 5-Aside Football — Frontend

The official web platform for the **Solid FM 5-Aside Football League**. This is a high-performance, modern web application designed to provide live tournament updates, professional standings, and a robust administrative dashboard for match management.

### 🌟 High-Impact Features
*   **🏆 Professional Standings**: Dynamic, multi-tournament league tables with automated tie-breaking (Goals > Assists).
*   **🛰️ Broadcast Engine**: Integrated SMTP alert system to notify every team captain in real-time.
*   **🔒 Secure Admin Shield**: Advanced role-based access control with account verification and hydration-aware auth flow.

---

## 🚀 Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Real-time**: [Socket.io Client](https://socket.io/) (Live match & standings updates)
- **Fonts**: [Outfit](https://fonts.google.com/specimen/Outfit) (Main Display) & [Inter](https://fonts.google.com/specimen/Inter) (Body)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **API Client**: [Axios](https://axios-http.com/)

- **Icons**: [Lucide React](https://lucide.dev/)
- **Notifications**: [Sonner](https://sonner.stevenly.me/)

---

## 📂 Project Architecture

```text
src/
├── app/            # Next.js App Router (Public & Admin Routes)
├── components/     # UI Components (shared, admin, and public)
├── hooks/          # Custom React hooks (Live updates, Scroll reveal)
├── lib/            # Configuration (API Client, Socket instances)
├── store/          # Zustand global state (Auth, UI, Tournament data)
├── types/          # Global TypeScript interfaces
└── utils/          # Helper functions (Formatting, cards)

public/
└── assets/         # Project assets (Publicity banners, Team logos)
```


---

## 🔌 Backend Communication

The frontend communicates with the Node.js/Express backend via a centralized `apiClient` located in `src/lib/api-client.ts`.

### Key Features:
- **Base URL**: Configurable via `NEXT_PUBLIC_API_URL`.
- **JWT Authentication**: Automatically attaches the Access Token from Zustand store to the `Authorization` header.
- **Interceptors**:
    - **Request**: Injects the Bearer token if the user is authenticated.
    - **Response**: Simplifies data access and handles 
    **Automatic Logout** if a `401 Unauthorized` error is detected.
- **Cross-Origin**: Configured with `withCredentials: true` to support secure cookie handling.

---

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 2. Environment Setup
Create a `.env.local` file in the root directory:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### 3. Installation
```bash
npm install
```

### 4. Development
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

---

## 🏆 Key Features

- **Live Standings**: High-fidelity Flashscore-style table with real-time goal and point calculations synchronized via WebSockets.
- **Player Statistics**: Detailed tracking for the "Golden Boot" race, including Goals and Assists as a primary tie-breaker.
- **Admin Suite**: Secure dashboard for tournament lifecycle management, team registrations, and live match event broadcasting.
- **SEO Optimized**: Fully configured metadata with OpenGraph support, dynamic sitemaps, and canonical URL handling in `src/app/layout.tsx`.
- **Premium Aesthetics**: Dark-mode focused UI with smooth reveal animations and responsive typography.


---

## 👨‍💻 For Developers

When contributing to this project, please ensure:
1.  **Type Safety**: Always define interfaces for API responses in `src/types`.
2.  **Shared Components**: Re-use UI components from `src/components/ui` for visual consistency.
3.  **Reveal Hooks**: Use the `useRevealOnScroll` hook for entrance animations.

---

## 📄 License
This project is private and intended for the Solid FM 5-Aside Football League.
