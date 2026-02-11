# SmartEdu Question Bank System

## Project Overview
This project is a comprehensive Smart Education Question Bank System designed to manage educational resources, student performance, and teacher-student interactions. It features a modern web interface and a backend API.

**Current Status:** The project is in a transitional phase.
*   **Frontend:** A functional React application currently using **internal mock data** for demonstration purposes.
*   **Backend:** A Go (Gin) API server is scaffolded and contains parallel mock data logic, but it is **not yet connected** to the frontend.

## Tech Stack

### Frontend
*   **Framework:** React 19
*   **Build Tool:** Vite
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (inferred from usage), Lucide React (Icons)
*   **Routing:** React Router v7

### Backend
*   **Language:** Go
*   **Framework:** Gin Gonic
*   **Authentication:** JWT (implemented in backend handlers)

## Key Directories

*   **`/` (Root):** Contains configuration files for both frontend (`vite.config.ts`, `package.json`) and backend (`go.mod`, `main.go`).
*   **`src/views/` (implied structure from file list, actual paths are at root level in file list but logically `views/`):**
    *   `views/Student/`: Student-facing features (History, Homework, Practice, Stats).
    *   `views/Teacher/`: Teacher-facing features (Assign, Papers, Questions, Reinforcements).
    *   `views/Admin/`: Administrative features (Monitoring, Permissions, Users).
*   **`components/`:** Reusable UI components (e.g., `Layout.tsx`).
*   **`models.go`, `handlers.go`, `middleware.go`:** Backend logic files.

## Building and Running

### Frontend (Primary Interface)
To run the web application (currently uses local mock data):
```bash
npm install
npm run dev
```
Access the app at `http://localhost:3000`.

### Backend (API Server)
To run the backend API (currently standalone):
```bash
go run .
```
Runs on `http://localhost:8080`.

## Development Conventions
*   **Mock Data:** Both frontend (`App.tsx`, `utils.ts`) and backend (`handlers.go`) currently rely on hardcoded mock data for users and stats.
*   **Authentication:** The frontend uses `localStorage` to simulate session management. The backend implements JWT-based auth but it is not yet utilized by the client.
*   **Routing:** The frontend uses `HashRouter`.
*   **Environment Variables:** Frontend uses `.env.local` for `GEMINI_API_KEY`.

## Future Tasks (Inferred)
*   Connect the React frontend to the Go backend API.
*   Replace mock data with a real database (e.g., PostgreSQL, MongoDB).
*   Implement real authentication flows.
