# Globeplot "Travel Intelligence" Implementation Plan

## Goal Description
Evolve Globeplot from a simple itinerary tool into a "travel intelligence" system. The goal is to allow users to define a geographic region, automatically find and rank POIs based on preferences, and generate multi-day itineraries that support **multi-modal transport** (planes, trains, buses, etc.) alongside road trips.

## User Review Required
> [!IMPORTANT]
> **Mobile Strategy (PWA)**:
> - **Decision**: We will build a **Progressive Web App (PWA)**.
> - **Why**: As a solo developer, maintaining separate native apps (iOS/Android) is too much overhead. A PWA allows your React app to be "installed" on phones, work offline, and look like a native app, all from the same codebase.
> - **Tech**: We will use `vite-plugin-pwa` to handle the manifest and service workers automatically.

> [!IMPORTANT]
> **Database Strategy (Hybrid)**:
> - **Development**: Use **Docker** to run PostgreSQL + PostGIS locally.
> - **Production**: Use a **Managed Service** (e.g., **Supabase** or **Render Managed Postgres**).
> - **Schema**: Mirrors `trip.ts` types (`TravelEvent`, `AccommodationEvent`, etc.).

## Proposed Changes

### Architecture
- **Database**: PostgreSQL + PostGIS (Docker local, Managed prod).
- **Backend**: Node.js + Prisma.
- **Frontend**: React + Vite + **PWA Plugin**.

### Backend (`globe-plot-api`)

#### [NEW] [schema.prisma](file:///c:/Users/zakia/Documents/Coding%20Projects/globe-plot/globe-plot-api/prisma/schema.prisma)
- Define models mirroring `trip.ts`.

#### [NEW] [poiService.ts](file:///c:/Users/zakia/Documents/Coding%20Projects/globe-plot/globe-plot-api/src/services/poiService.ts)
- Fetch & Cache POIs.

#### [NEW] [rankingService.ts](file:///c:/Users/zakia/Documents/Coding%20Projects/globe-plot/globe-plot-api/src/services/rankingService.ts)
- Heuristic scoring.

#### [NEW] [itineraryService.ts](file:///c:/Users/zakia/Documents/Coding%20Projects/globe-plot/globe-plot-api/src/services/itineraryService.ts)
- Multi-modal routing logic.

### Frontend (`globe-plot-react`)

#### [MODIFY] [vite.config.ts](file:///c:/Users/zakia/Documents/Coding%20Projects/globe-plot/globe-plot-react/vite.config.ts)
- Add `VitePWA` plugin configuration.
    - **Manifest**: Name, icons, theme_color, background_color.
    - **Workbox**: Caching strategy for offline access (critical for travel).

#### [NEW] [DrawControl.tsx](file:///c:/Users/zakia/Documents/Coding%20Projects/globe-plot/globe-plot-react/src/components/map/DrawControl.tsx)
- Wrapper for `mapbox-gl-draw`.

#### [MODIFY] [Map.tsx](file:///c:/Users/zakia/Documents/Coding%20Projects/globe-plot/globe-plot-react/src/components/map/Map.tsx)
- Integrate `DrawControl`.

## Verification Plan

### Automated Tests
- **Database**: Verify PostGIS spatial queries.
- **Routing**: Test multi-modal suggestions.

### Manual Verification
1.  **Mobile Install**:
    - Open app in Chrome DevTools "Mobile" view.
    - Verify "Install App" prompt (or Lighthouse PWA check pass).
    - Verify offline load works (Service Worker).
2.  **Docker Setup**: Run `docker-compose up`.
3.  **Multi-Modal Test**: Generate plan and check for flight suggestions.
