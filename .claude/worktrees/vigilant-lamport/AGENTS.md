# AGENTS.md - Style Guide & Project Overview

This document serves as a foundational guide for any AI agent or developer working on the **Panel Contable Unergy** project. Adhere strictly to these patterns to maintain consistency.

## 🌟 Vision & Design System: "Unergy Glass"

The project follows a **Glassmorphism / Apple-inspired** aesthetic. The goal is to make the interface feel light, airy, and modern, appearing to float over a soft, decorative background.

### UI Standards (Tailwind CSS)
- **Glass Effect**: Use `bg-white/60` (Light) or `bg-zinc-900/60` (Dark) combined with `backdrop-blur-md` or `backdrop-blur-xl`.
- **Borders**: Subtle borders are mandatory to define glass edges. Use `border-white/40` (Light) or `border-zinc-800/50` (Dark).
- **Shadows**: Use `shadow-lg` or `shadow-xl`. Avoid harsh shadows.
- **Color Palette**: Primary Blue-600 (`#2563eb`), Status colors (Green-600, Red-500, Orange-500).

## 🛠 Tech Stack
- **Framework**: Next.js 16 (Pages Router)
- **Language**: TypeScript (Strict typing required)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Notifications**: Sileo (Always pass an object with `title` and `description`).
- **Drag & Drop**: `@dnd-kit` for the sortable dashboard layout.
- **Linting/Formatting**: Biome (Run `npm run lint` and `npm run format`).

## 🔐 Authentication
The application uses a **Proxy-based Authentication** system (Next.js 16 standard).
- **Shared Secret**: A master password defined in `APP_PASSWORD`.
- **Logic**: Handled in `src/proxy.ts` and `src/pages/api/auth/*`.
- **Session**: HTTP-only `auth_token` cookie.

## 🏗 Architecture & Data Flow

### 1. Data Management
- **Centralized State**: All sheet data is managed via `SheetContext.tsx`.
- **Consumer Hook**: Components MUST use `useSheet()` to access data and filters.
- **Caching**: Investor/Project lists and Dashboard order are cached in `localStorage`.

### 2. Calculation Engine (Backend)
- Located in `/src/pages/api/sheets.ts`.
- **`compute` Utility**: Handles mathematical operations between cells using functional filters.
- **Traceability**: Every metric returned includes `sourceRows` (Concepto, Valor, Proyecto) for auditing.
- **Regex Support**: Filters support regular expressions (e.g., `/^Ingreso/`).

### 3. Metric Customization Guide
To add or modify a metric in the Project Summary:
1.  Define the logic in the `compute` block in `/api/sheets.ts`.
2.  Update the `ProjectMetrics` interface in `src/types/sheets.ts`.
3.  Add the new metric to the `items` array in `ProjectSummary.tsx`.

## 📁 Project Structure
- `/src/components`: Modular UI blocks (Sidebar, Modal, Toolbar, etc.)
- `/src/context`: `SheetContext` for global data state.
- `/src/pages/api`: Backend logic (Auth and Google Sheets integration).
- `/src/proxy.ts`: Network boundary and route protection.
- `/src/types`: Shared TypeScript interfaces.

## 📝 Coding & Naming Conventions
1.  **Language**: 
    - **Code**: All code (variables, functions, files) must be in **English**.
    - **UI Labels**: All user-facing text and labels must be in **Spanish**.
    - **Sheet Data**: Headers ("Concepto", "Inversionista", "Proyecto", "Total") are expected in **Spanish**.
2.  **Safety**: 
    - Never log sensitive environment variables.
    - Always use `?? 0` or defensive checks when formatting numbers.
3.  **Deployment (Vercel)**:
    - **OpenSSL 3**: Private keys must be cleaned of escaped characters and quotes before initializing JWT.
    - **Env Vars**: Required: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `SPREADSHEET_ID`, `APP_PASSWORD`.

## 🚀 Efficiency Guidelines
- **High Density**: Avoid excessive padding. Keep the layout compact and professional.
- **Responsiveness**: Mobile-first. The sidebar becomes a drawer and the Toolbar stacks vertically.
- **Stale-While-Revalidate**: Prefer showing cached data while new data is fetching to avoid empty states.

## 🎨 UI/UX Features

### Reactive Sortable Layout
- **Library**: Uses `@dnd-kit/core` and `@dnd-kit/sortable` for a fluid, reactive experience.
- **Logic**: Elements push each other and reorder automatically. Movement is restricted to the dashboard content area.
- **Persistence**: The *order* of elements is saved to `localStorage` (`dashboard-order`).

### Component Best Practices
1. **Modularity**: Extract logical UI blocks into `src/components/`.
2. **Independence**: Components should consume the `useSheet()` hook directly rather than receiving large data props (Prop Drilling).
3. **Atomic Metrics**: Use small sub-components or render functions for repeated patterns like individual metric items.
4. **Modals & Portals**: ALWAYS use `createPortal(content, document.body)` for modals (e.g., `MetricModal.tsx`). This prevents CSS stacking context issues caused by `transform` properties in draggable/sortable parent elements.
