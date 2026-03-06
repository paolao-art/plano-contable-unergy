# AGENTS.md - Style Guide & Project Overview

This document serves as a foundational guide for any AI agent or developer working on the **Panel Contable Unergy** project. Adhere strictly to these patterns to maintain consistency.

---

## 🌟 Vision & Design System: "Unergy Glass"

The project follows a **Glassmorphism / Apple-inspired** aesthetic. The goal is to make the interface feel light, airy, and modern, appearing to float over a soft, decorative background.

### UI Standards (Tailwind CSS)
- **Glass Effect**: Use `bg-white/60` (Light) or `bg-zinc-900/60` (Dark) combined with `backdrop-blur-md` or `backdrop-blur-xl`.
- **Borders**: Subtle borders are mandatory to define glass edges. Use `border-white/40` (Light) or `border-zinc-800/50` (Dark).
- **Shadows**: Use `shadow-lg` or `shadow-xl`. Avoid harsh shadows.
- **Color Palette**: Primary Blue-600 (`#2563eb`), Status colors (Green-600, Red-500, Orange-500).

---

## 🛠 Tech Stack
- **Framework**: Next.js 16 (Pages Router)
- **Language**: TypeScript (Strict typing required)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Notifications**: Sileo (Always pass an object with `title` and `description`).
- **Drag & Drop**: `@dnd-kit` for the sortable dashboard layout.
- **Linting/Formatting**: Biome (Run `npm run lint` and `npm run format`).

---

## 🔐 Authentication
The application uses a **Proxy-based Authentication** system (Next.js 16 standard).
- **Shared Secret**: A master password defined in `APP_PASSWORD`.
- **Logic**: Handled in `src/proxy.ts` and `src/pages/api/auth/*`.
- **Session**: HTTP-only `auth_token` cookie.

---

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
1. Define the logic in the `compute` block in `/api/sheets.ts`.
2. Update the `ProjectMetrics` interface in `src/types/sheets.ts`.
3. Add the new metric to the `items` array in `ProjectSummary.tsx`.
4. Add the initial zero value to `INITIAL_DATA.projectMetrics` in `SheetContext.tsx`.
5. Apply changes to **both** the main dir and the worktree (see Dual-Directory section).

---

## 📁 Project Structure
- `/src/components`: Modular UI blocks (Sidebar, Modal, Toolbar, etc.)
- `/src/context`: `SheetContext` for global data state.
- `/src/pages/api`: Backend logic (Auth and Google Sheets integration).
- `/src/proxy.ts`: Network boundary and route protection.
- `/src/types`: Shared TypeScript interfaces.

---

## 📝 Coding & Naming Conventions
1. **Language**:
   - **Code**: All code (variables, functions, files) must be in **English**.
   - **UI Labels**: All user-facing text and labels must be in **Spanish**.
   - **Sheet Data**: Headers ("Concepto", "Inversionista", "Proyecto", "Total") are expected in **Spanish**.
2. **Safety**:
   - Never log sensitive environment variables.
   - Always use `?? 0` or defensive checks when formatting numbers.
3. **Deployment (Vercel)**:
   - **OpenSSL 3**: Private keys must be cleaned of escaped characters and quotes before initializing JWT.
   - **Env Vars**: Required: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `SPREADSHEET_ID`, `APP_PASSWORD`.

---

## 🚀 Efficiency Guidelines
- **High Density**: Avoid excessive padding. Keep the layout compact and professional.
- **Responsiveness**: Mobile-first. The sidebar becomes a drawer and the Toolbar stacks vertically.
- **Stale-While-Revalidate**: Prefer showing cached data while new data is fetching to avoid empty states.

---

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

---

## ⚠️ CRITICAL: Dual-Directory Architecture

This is the most important operational rule when making changes to this project.

### The Problem
The project uses a **git worktree** (PR branch) at:
```
C:\Users\paola\Documents\Los mejores\panel-contable-unergy\.claude\worktrees\frosty-chaum\
```
The dev server, however, runs from the **main directory**:
```
C:\Users\paola\Documents\Los mejores\panel-contable-unergy\
```

### The Rule
**Any change to a shared backend or component file MUST be applied to BOTH paths.**

| File | Main dir | Worktree |
|------|----------|----------|
| `src/pages/api/sheets.ts` | ✅ Edit | ✅ Edit |
| `src/types/sheets.ts` | ✅ Edit | ✅ Edit |
| `src/components/MonthlyStats.tsx` | ✅ Edit | ✅ Edit |
| `src/context/SheetContext.tsx` | ✅ Edit | ✅ Edit |
| `src/components/MetricModal.tsx` | ✅ Edit | ✅ Edit |

### Verifying the Right Server is Running
The server typically runs on port `:3001` (port 3000 is often in use by other processes).

```bash
curl -s "http://localhost:3001/api/sheets?month=Enero&investor=Total&project=Total"
```

---

## 📊 Google Sheets Data Model

### Sheet Structure
- Each **month** is a separate sheet tab (e.g., `Enero`, `Febrero`).
- Row 1 is the **header row**. Data starts at row 2.
- The API reads range `A1:Z10000` to capture all investors and all rows. **Do not lower this limit** — investors at the bottom of the sheet will be silently excluded.

### Known Column Headers (case-sensitive, trimmed)
| Header | Purpose |
|--------|---------|
| `Concepto` | Category/concept of the row |
| `Inversionista` | Investor name |
| `Proyecto` | Project name |
| `Total` | Numeric value used for metric calculation |
| `Documento contable` | Accounting document type (e.g., `"Costos"`) |

### Global Row Exclusion
Rows where `Concepto == "Valor a pagar"` are **always excluded** before any calculation. This filter is applied at the `dataRows` level in `api/sheets.ts`:

```typescript
const dataRows = allRows.slice(1).filter(row =>
  conceptoIdx === -1 || String(row[conceptoIdx] || "").trim() !== "Valor a pagar"
);
```

### Exact Concepto Values (verified from live sheet)
| Metric | Filter | Notes |
|--------|--------|-------|
| Energía | `Concepto` matches `/^Ingreso/` + `"Redistribución de ingresos de acuerdo al Protocolo"` + `"Despacho"` + `"Ventas en bolsa"` | Multi-filter sum |
| Comercialización | `Concepto == "Comercialización"` | Exact match — NOT `"Costos de comercialización"` |
| CAPEX | `Concepto == "Inversion Inicial"` | |
| ROI | `Concepto == "% Rendimiento de la Inversion"` | |
| Costos | `Documento contable == "Costos"` | Filters by a *different* column |
| Utilidad | Computed: `Energía − Comercialización − Costos` | NOT a lookup row — calculated from other metrics |

> **Warning**: Concepto values are case-sensitive and exact. A mismatch returns 0 silently. Use the debug technique in the Debugging section if a metric is unexpectedly 0.

---

## 🔬 Calculation Engine Reference

### `MetricDetail` Type
Every metric is a `MetricDetail` (`src/types/sheets.ts`):
```typescript
type MetricDetail = {
  value: number;
  sourceRows: SourceRow[];
};

type SourceRow = {
  proyecto: string;
  concepto: string;
  valor: number;
};
```

### `ProjectMetrics` Interface
All fields must exist in `types/sheets.ts` and `SheetContext.tsx` (`INITIAL_DATA`):
```typescript
interface ProjectMetrics {
  capex: MetricDetail;
  energyIncome: MetricDetail;
  marketingCosts: MetricDetail;
  monthlyUtility: MetricDetail;
  roi: MetricDetail;
  costs: MetricDetail;
}
```

### `compute` Utility Patterns

```typescript
const compute = createCalculator(dataRows, headers, "Total"); // "Total" = default value column

// Single filter — exact string match
const marketingCosts = compute(get => get({ ...baseFilter, Concepto: "Comercialización" }));

// Regex filter
const ingresos = compute(get => get({ ...baseFilter, Concepto: /^Ingreso/ }));

// Multi-part sum with merged sourceRows
const energyIncome = compute(get => {
  const ingresos      = get({ ...baseFilter, Concepto: /^Ingreso/ });
  const redistribucion = get({ ...baseFilter, Concepto: "Redistribución de ingresos de acuerdo al Protocolo" });
  const despacho      = get({ ...baseFilter, Concepto: "Despacho" });
  const ventasBolsa   = get({ ...baseFilter, Concepto: "Ventas en bolsa" });
  return {
    value: ingresos.value + redistribucion.value + despacho.value + ventasBolsa.value,
    sourceRows: [...ingresos.sourceRows, ...redistribucion.sourceRows, ...despacho.sourceRows, ...ventasBolsa.sourceRows],
  };
});

// Computed metric (arithmetic between other metrics — no sheet lookup)
const monthlyUtility: MetricDetail = {
  value: energyIncome.value - marketingCosts.value - costs.value,
  sourceRows: [...energyIncome.sourceRows, ...marketingCosts.sourceRows, ...costs.sourceRows],
};
```

### `baseFilter` — Investor/Project Scoping
```typescript
const baseFilter: Record<string, string> = {};
if (currentInvestor !== "Total") baseFilter.Inversionista = currentInvestor;
if (currentProject !== "Total") baseFilter.Proyecto = currentProject;
// Always spread into every get() call: get({ ...baseFilter, Concepto: "..." })
```

---

## 🧩 Key Components Reference

### `MetricModal.tsx`
- Always rendered via `createPortal(content, document.body)`.
- Props: `{ isOpen: boolean, onClose: () => void, title: string, detail: MetricDetail | null }`.
- Shows a table: **Proyecto · Concepto · Valor** columns.
- If any `sourceRow` has an `inversionista` field, adds an **Inversionista** column automatically (conditional rendering).

### `MonthlyStats.tsx`
Displays three summary cards: **Ingresos · Costos · Neto**.
- **Costos** card: reads `data.projectMetrics?.costs`, is **clickable**, opens `MetricModal` with full row detail.
- **Ingresos** and **Neto**: not clickable.
- Neto card turns `text-orange-500` when value is negative.
- Card footer shows "Click para ver detalle" when `onClick` is defined, otherwise "Mes".

### `ProjectSummary.tsx`
Full project metrics panel (Energía, Comercialización, CAPEX, ROI, Utilidad).
- All metrics with `sourceRows` are clickable and open `MetricModal`.
- No changes needed when adding new computed metrics — only update the API and types.

### `SheetContext.tsx`
Global state holder. `INITIAL_DATA.projectMetrics` must include a `{ value: 0, sourceRows: [] }` entry for every field in `ProjectMetrics`. Missing fields cause runtime errors.

---

## 🐛 Debugging Techniques

### Metric Returns 0 Unexpectedly
Add a **temporary** debug field to the API response to inspect actual Concepto values from the live sheet:
```typescript
// In api/sheets.ts, temporarily add to the response object:
__debug_conceptos: [...new Set(dataRows.map(r => String(r[conceptoIdx] || "").trim()))].sort(),
```
Call the API, inspect the list, find the exact string, fix the filter.
**Always remove the debug field before committing.**

### Next.js Dev Lock Error
```
⨯ Unable to acquire lock at .next/dev/lock
```
Fix:
```bash
# Kill whatever is holding the port
kill -9 $(lsof -ti :3001)
# Delete the stale lock
rm -f .next/dev/lock
# Restart
npm run dev -- -p 3001
```

---

## 🔄 Development Workflow

### Making Changes
1. Edit files in **both** the main dir and the worktree.
2. Test via `curl` or browser on port `:3001`.
3. Run `npm run lint` and `npm run format` (Biome).
4. Commit changes inside the **worktree directory** for the PR branch.

### Git Setup (first time in worktree)
```bash
cd ".claude/worktrees/frosty-chaum"
git config user.email "paola@unergy.co"
git config user.name "Paola Ortiz"
```

### Commit & Push
```bash
git add src/
git commit -m "feat: description of change"
git push origin HEAD
```

### If Push Fails with 403 (stale credentials)
```bash
git credential reject <<'EOF'
protocol=https
host=github.com
EOF
# Retry push — browser auth prompt will appear
git push origin HEAD
```

---

## 🔌 MCP Odoo Server

A separate MCP server connects Claude Code to Odoo via XML-RPC.

### Location
```
C:\Users\paola\Documents\Los mejores\mcp_odoo\
```

### Setup (already completed)
- **Python**: `C:\Users\paola\AppData\Local\Programs\Python\Python312\python.exe` (v3.12.10)
- **Package installed**: `pip install -e .` inside `mcp_odoo\`

### Claude Code Configuration (`C:\Users\paola\.claude\settings.json`)
```json
{
  "mcpServers": {
    "odoo": {
      "command": "C:\\Users\\paola\\AppData\\Local\\Programs\\Python\\Python312\\python.exe",
      "args": ["-m", "odoo_mcp_server"],
      "cwd": "C:\\Users\\paola\\Documents\\Los mejores\\mcp_odoo"
    }
  }
}
```
After updating settings, **restart Claude Code** to activate the MCP tools.

### Odoo Credentials
Stored in `mcp_odoo/odoo_config.json` (not committed to git). Alternatively via env vars:
```bash
ODOO_URL=https://your-instance.odoo.com
ODOO_DB=your-database
ODOO_USERNAME=user@example.com
ODOO_PASSWORD=your_api_key
```

### Available MCP Tools (after restart)
| Tool | Description |
|------|-------------|
| `mcp__odoo__execute_method` | Execute any XML-RPC method on any Odoo model |
| `mcp__odoo__search_invoices` | Search vendor/customer invoices by product keyword, with supplier, analytic account and subtotals |
| `mcp__odoo__get_employee_leaves` | Get vacation assignments, approved leaves and available balance |
| `mcp__odoo__export_to_csv` | Export any Odoo model to a CSV file (`;` separator, UTF-8 BOM for Excel) |

---

## 🗄️ Odoo Data Model — Sun Money Instance

### Credentials (env vars in `.env.local`)
```
ODOO_URL=https://unergy-20260302-29219831.dev.odoo.com
ODOO_DB=unergy-20260302-29219831
ODOO_USERNAME=juliana@solenium.co
ODOO_PASSWORD=<api_key in .env.local>
```

### REST API (Next.js routes in `src/pages/api/odoo/`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET  /api/odoo/invoices/asociados` | GET | Facturas de cliente (`out_invoice`) del periodo seleccionado |
| `POST /api/odoo/execute` | POST | Ejecuta cualquier método XML-RPC en cualquier modelo |
| `POST /api/odoo/invoices/search` | POST | Busca líneas de factura por keyword |
| `GET  /api/odoo/employees/[name]/leaves` | GET | Vacaciones de un empleado |
| `POST /api/odoo/export` | POST | Exporta un modelo a CSV descargable |

The XML-RPC client lives in `src/lib/odoo.ts` — no external dependencies, uses native `fetch`.

### Partner Categories (`res.partner.category`)
| id | name | Meaning |
|----|------|---------|
| 1 | Partícipe Plataforma | **Inversionistas / Asociados** — main investors |
| 2 | Propietario de terreno | Landowners |
| 3–11 | Individual names | Tags for specific investor groups |

### Key Models
| Model | Use |
|-------|-----|
| `account.move` | Invoices. `move_type='out_invoice'` = customer invoice (= factura al inversionista). `move_type='in_invoice'` = vendor invoice. |
| `account.move.line` | Invoice lines. Links to `analytic_distribution` for analytic accounts. |
| `res.partner` | Contacts / customers. Investors have `category_id = 1` (Partícipe Plataforma). |
| `res.partner.category` | Partner tags / categories. |
| `hr.employee` | Employees. |
| `hr.leave` | Approved absences (vacations). |
| `hr.leave.allocation` | Vacation day allocations. |
| `account.analytic.account` | Analytic accounts — linked to invoice lines via `analytic_distribution` (dict of `{account_id: percentage}`). |

### Invoice Numbers
Customer invoices use prefixes `SUFV` and `UNFV`, e.g. `SUFV507`, `UNFV1834`.

### `GET /api/odoo/invoices/asociados` — Query Params
| Param | Default | Description |
|-------|---------|-------------|
| `investor` | — | Partner name (`ilike` match). Omit or `"Total"` for all. |
| `months` | current month | Comma-separated Spanish month names, e.g. `"Enero,Febrero"` |
| `year` | current year | 4-digit year |

Month filtering builds an Odoo domain using prefix OR notation:
- 1 month → `['&', [date>=from], [date<=to]]`
- N months → `[N-1× '|', '&', from1, to1, '&', from2, to2, …]`

### Domain Tips
```typescript
// All customer invoices for a specific investor (partial name match)
[["move_type", "=", "out_invoice"], ["partner_id.name", "ilike", "GARCIA"]]

// All invoices for Partícipe Plataforma category
[["move_type", "=", "out_invoice"], ["partner_id.category_id", "=", 1]]

// Filter by date range
[["invoice_date", ">=", "2026-01-01"], ["invoice_date", "<=", "2026-01-31"]]
```
