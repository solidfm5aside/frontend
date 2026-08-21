# Solid FM 5-Aside Football — Frontend

The official web platform for the **Solid FM 5-Aside Football League**. This is a high-performance, modern web application designed to provide live tournament updates, professional standings, and a robust administrative dashboard for match management.

### 🌟 High-Impact Features
*   **🏆 Fixed Competition Workflow**: Fourteen teams, two manually assigned groups of seven, six group matches per team, top-four qualification, and the approved fixed quarter-final bracket.
*   **📊 Auditable Rankings**: Points, goal difference, goals scored, head-to-head, then an explicit competition-committee decision when a tie still remains.
*   **🛰️ Live Match Updates**: Socket.IO refreshes fixtures, results, standings, and match events without a page reload.
*   **🔒 Secure Administration**: HttpOnly cookie sessions, server-validated role access, and super-admin-only administrator role changes.

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
- **Authentication**: Access and refresh JWTs stay in HttpOnly cookies; the browser does not persist them in local storage.
- **Session Bootstrap**: `/auth/me` validates the signed-in administrator before protected UI is shown.
- **Refresh Handling**: One coordinated refresh request retries an expired authenticated request; a failed refresh clears local session state.
- **Cross-Origin Cookies**: Axios uses `withCredentials: true`, and the backend must list the frontend's exact origin.

---

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js 20.9 or newer
- npm or yarn

### 2. Environment Setup
Create a `.env.local` file in the root directory:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

Set both values in the deployment environment before building. The backend's
`CLIENT_URL` must contain the frontend's exact browser origin so cookies,
origin checks, and Socket.IO agree; the localhost fallbacks are development-only.

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

- **Live Standings**: Separate Group A and Group B tables synchronized with completed group-stage results and committee tie decisions.
- **Player Statistics**: Goals, assists, and cards rebuilt from recorded match events.
- **Admin Suite**: Guided tournament setup, team/group assignment, fixture preview and publication, match control, bracket progression, team/player editing, and administrator access management.
- **Responsive Public Site**: Accessible navigation, empty/error/retry states, reduced-motion support, optimized images, and layouts tested from mobile through desktop.
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
