# Production Intelligence Dashboard — Backend Integration Plan

## Current State

- **Frontend component** (`ProductionIntelligence.tsx`) — complete UI with 5 tabs, filters, summary stats
- **Mock data manager** (`ProductionIntelligenceManager.ts`) — singleton class generating 150 random signals, with all analytics computation methods (camera trends, crew trends, cast demand, scale distribution, territory forecasts)
- **Backend endpoint** — `GET /api/admin/production-signals` exists, queries `production_signals` Supabase table with optional `territory`, `start_date`, `end_date` filters
- **Backend response** — `{ items: dict[], total: int }` — returns raw signal records (generic dicts, no typed schema)
- **URL constant** — `ADMIN_PRODUCTION_SIGNALS_URL` already defined in `admin.apiurl.ts` but unused

## Architecture Decision

The backend returns **raw signal records** — it has no aggregation/analytics endpoints.
All analytics (camera trends, crew distribution, cast demand, etc.) are computed **client-side** in `ProductionIntelligenceManager`.

**Approach**: Keep analytics logic client-side, but feed it real data from the API instead of mock data.

## Backend Column Mapping

Backend uses snake_case, frontend uses camelCase. The API response needs mapping:

| Backend (snake_case) | Frontend (camelCase) |
|---------------------|---------------------|
| `id` | `id` |
| `script_id` | `scriptId` |
| `territory` | `territory` |
| `state` | `state` |
| `submission_date` | `submissionDate` |
| `camera_equipment` | `cameraEquipment` |
| `crew_size` | `crewSize` |
| `principal_cast` | `principalCast` |
| `supporting_cast` | `supportingCast` |
| `background_extras` | `backgroundExtras` |
| `budget_range` | `budgetRange` |
| `format` | `format` |
| `genres` | `genres` |

## Files to Modify

### 1. `src/services/admin.types.ts`
- Add `ProductionSignal` interface (move from manager file)
- Add `ProductionSignalsResponse` type (`{ items: ProductionSignal[], total: number }`)

### 2. `src/services/admin.api.ts`
- Import `ADMIN_PRODUCTION_SIGNALS_URL` from `admin.apiurl.ts`
- Import new types from `admin.types.ts`
- Add `getProductionSignals(territory?, startDate?, endDate?, signal?)` method
- Include snake_case → camelCase mapping in the method
- Export in `adminApi` object

### 3. `src/app/data/ProductionIntelligenceManager.ts`
- Remove mock data generation (`initializeMockData`)
- Convert constructor to accept signals externally via `setSignals(signals)`
- Keep all analytics computation methods unchanged (they're pure logic)
- Remove singleton export; export the class instead for instantiation in the component

### 4. `src/app/components/admin/ProductionIntelligence.tsx`
- Replace synchronous mock manager calls with async API fetch
- Add `useState` for signals, loading, error states
- Add `useEffect` + `useRef` for initial data fetch (following FestivalsManager pattern)
- Re-fetch when territory or date range filters change
- Instantiate manager locally with fetched data
- Add `CircularProgress` loading state and `Alert` error state

### 5. No changes to `src/services/admin.apiurl.ts`
- `ADMIN_PRODUCTION_SIGNALS_URL` already exists

## Implementation Steps

1. Add `ProductionSignal` + `ProductionSignalsResponse` types to `admin.types.ts`
2. Add `getProductionSignals()` API method to `admin.api.ts` with snake→camel mapping
3. Refactor `ProductionIntelligenceManager.ts` — remove mock data, accept external signals
4. Rewrite `ProductionIntelligence.tsx` — fetch from API, handle loading/error, feed data to manager
5. Verify TypeScript compilation passes
