# Flight Trails Visualization App
## Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** January 2025  
**Status:** Draft  
**Author:** Product Team  

---

## 1. Product Overview & Goals

### 1.1 Vision
Create a visually stunning, interactive web application that displays animated flight paths over California with elegant contrail effects, transforming complex flight data into an engaging visual experience.

### 1.2 Problem Statement
Flight data is publicly available but presented in dry, tabular formats that fail to convey the beauty and complexity of air traffic. Users interested in aviation, data visualization, or California air traffic have no easy way to see the "dance" of planes across the sky.

### 1.3 Goals

| Goal | Description | Success Indicator |
|------|-------------|-------------------|
| **Visualize** | Display 24 hours of California flight data as animated paths | All major CA airports represented |
| **Delight** | Create a mesmerizing visual experience with smooth animations | Users spend >2 min average session |
| **Educate** | Help users understand flight patterns and air traffic | Users can identify major routes |
| **Perform** | Handle thousands of flights without lag | 60fps on modern browsers |

### 1.4 Target Audience
- **Primary:** Aviation enthusiasts, data visualization lovers, educators
- **Secondary:** Travelers curious about flight routes, developers seeking inspiration
- **Tertiary:** General public looking for ambient/relaxing visualizations

---

## 2. User Stories

### 2.1 Core User Stories (MVP)

| ID | As a... | I want to... | So that... | Priority |
|----|---------|--------------|------------|----------|
| US-01 | Visitor | See animated planes flying across a California map | I can visualize air traffic patterns | P0 |
| US-02 | Visitor | See blue contrail effects fading behind each plane | The visualization feels dynamic and realistic | P0 |
| US-03 | Visitor | Watch flights from the last 24 hours replay | I understand daily flight patterns | P0 |
| US-04 | Visitor | Control playback speed | I can watch at my preferred pace | P1 |
| US-05 | Visitor | Click on a plane to see flight details | I can learn about specific flights | P1 |
| US-06 | Visitor | See major California airports labeled | I understand origin/destination points | P1 |

### 2.2 Extended User Stories (Future)

| ID | As a... | I want to... | So that... | Priority |
|----|---------|--------------|------------|----------|
| US-07 | Visitor | Filter by airline | I can track specific carriers | P2 |
| US-08 | Visitor | See real-time flights | I can watch live traffic | P2 |
| US-09 | Visitor | View different regions (US, World) | I can explore beyond California | P2 |
| US-10 | Visitor | Toggle between day/night themes | I can customize my experience | P3 |
| US-11 | Visitor | See flight statistics | I understand traffic volume | P2 |
| US-12 | Developer | Access an API for flight paths | I can build my own visualizations | P3 |

---

## 3. Technical Requirements

### 3.1 Frontend Stack

| Component | Recommendation | Rationale |
|-----------|---------------|-----------|
| **Framework** | React + Vite | Fast dev experience, component reusability |
| **Map Library** | Mapbox GL JS or Leaflet | Vector tiles, smooth zoom, customizable |
| **Animation** | Canvas/WebGL via deck.gl or custom | GPU-accelerated for thousands of objects |
| **Styling** | Tailwind CSS | Rapid UI development |
| **State** | Zustand or React Context | Lightweight, sufficient for this scope |

### 3.2 Visualization Requirements

```
┌─────────────────────────────────────────────────────────────┐
│                     VISUALIZATION LAYER                      │
├─────────────────────────────────────────────────────────────┤
│  • Plane icons: Small airplane SVG, rotated to heading       │
│  • Trail effect: Gradient line (solid blue → transparent)    │
│  • Trail length: ~50-100 data points, fading over distance   │
│  • Animation: Interpolate positions for smooth movement      │
│  • Frame rate: Target 60fps, degrade gracefully              │
│  • Zoom levels: 5 (state view) to 12 (airport detail)        │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Contrail Effect Specification

```css
/* Trail gradient concept */
.contrail {
  stroke: linear-gradient(
    to left,
    rgba(59, 130, 246, 0.8),   /* Bright blue at plane */
    rgba(59, 130, 246, 0.4),   /* Mid fade */
    rgba(59, 130, 246, 0.0)    /* Fully transparent tail */
  );
  stroke-width: 2px;
  filter: blur(1px);           /* Soft glow effect */
}
```

### 3.4 Data Processing Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   OpenSky    │────▶│   Backend    │────▶│   Frontend   │
│   API Call   │     │   Process    │     │   Render     │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
  Raw flight data    Filter to CA bbox    Animate paths
  (lat, lon, alt,    Interpolate gaps     Draw contrails
   heading, speed)   Cache results        Handle interaction
```

### 3.5 Backend Requirements (Optional for MVP)

| Component | Purpose | MVP Approach |
|-----------|---------|--------------|
| API Proxy | Handle rate limits, caching | Serverless function (Vercel/Netlify) |
| Data Store | Historical flight data | JSON files or SQLite |
| Scheduler | Periodic data fetch | Cron job or GitHub Actions |

### 3.6 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial Load | < 3s | Lighthouse |
| Animation FPS | 60fps | Chrome DevTools |
| Memory Usage | < 200MB | Chrome Task Manager |
| Flights Rendered | 500+ simultaneous | Manual test |

---

## 4. Data Source Recommendations

### 4.1 Primary: OpenSky Network API

**Endpoint:** `https://opensky-network.org/api`

| Pros | Cons |
|------|------|
| ✅ Free and open source | ⚠️ Rate limited (anonymous: 400 req/day) |
| ✅ Real-time state vectors | ⚠️ No historical data in free tier |
| ✅ Good coverage globally | ⚠️ Some gaps in remote areas |
| ✅ Well-documented API | |

**Key Endpoints:**
```
GET /states/all?lamin=32.5&lomin=-124.5&lamax=42&lomax=-114
    → Returns all flights in California bounding box

Response fields:
- icao24: Aircraft identifier
- callsign: Flight number
- origin_country: Country of registration
- longitude, latitude: Current position
- baro_altitude: Altitude in meters
- velocity: Ground speed (m/s)
- true_track: Heading (degrees clockwise from north)
```

### 4.2 Alternative: ADS-B Exchange

**Endpoint:** `https://adsbexchange.com/api/`

| Pros | Cons |
|------|------|
| ✅ Includes military/blocked flights | ⚠️ Paid API ($10+/month) |
| ✅ Faster updates | ⚠️ More complex integration |
| ✅ Historical data available | |

### 4.3 Alternative: FlightAware (AeroAPI)

**Endpoint:** `https://aeroapi.flightaware.com/`

| Pros | Cons |
|------|------|
| ✅ Very reliable data | ⚠️ Expensive for hobby use |
| ✅ Includes flight plans | ⚠️ Commercial-focused |
| ✅ Historical queries | |

### 4.4 Recommended Approach for MVP

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA STRATEGY (MVP)                       │
├─────────────────────────────────────────────────────────────┤
│  1. Use OpenSky Network (free tier)                          │
│  2. Collect data every 15 minutes via scheduled job          │
│  3. Store last 24 hours in static JSON files                 │
│  4. Serve from CDN (no backend needed for demo)              │
│  5. Interpolate positions client-side for smooth animation   │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 California Bounding Box

```javascript
const CALIFORNIA_BBOX = {
  north: 42.0,      // Oregon border
  south: 32.5,      // Mexico border  
  west: -124.5,     // Pacific coast
  east: -114.0      // Nevada/Arizona border
};
```

### 4.6 Major California Airports (Reference Points)

| Code | Name | Coordinates |
|------|------|-------------|
| LAX | Los Angeles International | 33.9425, -118.4081 |
| SFO | San Francisco International | 37.6213, -122.3790 |
| SAN | San Diego International | 32.7336, -117.1897 |
| SJC | San Jose International | 37.3626, -121.9291 |
| OAK | Oakland International | 37.7213, -122.2208 |
| SMF | Sacramento International | 38.6954, -121.5908 |
| BUR | Hollywood Burbank | 34.2007, -118.3585 |
| ONT | Ontario International | 34.0560, -117.6012 |

---

## 5. MVP Scope vs Future Features

### 5.1 MVP Scope (v1.0) — Target: 2-3 weeks

```
┌─────────────────────────────────────────────────────────────┐
│                         MVP FEATURES                         │
├─────────────────────────────────────────────────────────────┤
│  ✅ California map with dark theme                           │
│  ✅ Animated plane icons flying source → destination         │
│  ✅ Blue contrail effect with fade                           │
│  ✅ Last 24 hours of flight data (pre-collected)             │
│  ✅ Play/Pause controls                                      │
│  ✅ Speed controls (0.5x, 1x, 2x, 5x, 10x)                   │
│  ✅ Time indicator showing current playback time             │
│  ✅ Major airport markers                                    │
│  ✅ Basic responsive design (desktop-first)                  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Post-MVP Features (v1.x)

| Version | Features | Effort |
|---------|----------|--------|
| **v1.1** | Click flight for details popup | 1 week |
| **v1.1** | Filter by altitude (high/low) | 3 days |
| **v1.2** | Airline color coding | 1 week |
| **v1.2** | Flight count statistics | 3 days |
| **v1.3** | Real-time mode (live data) | 2 weeks |
| **v1.3** | Mobile responsive improvements | 1 week |

### 5.3 Future Features (v2.0+)

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Multi-region** | Expand to US, Europe, World | Medium |
| **3D View** | Globe visualization | High |
| **Time Machine** | Pick any historical date | Medium |
| **Heatmaps** | Traffic density overlay | Medium |
| **Route Analysis** | Most popular routes | Low |
| **Weather Overlay** | Show weather affecting flights | High |
| **Shareable Links** | URL state for specific times/views | Low |
| **Embed Mode** | iframe for other websites | Low |

### 5.4 Out of Scope (Won't Do)

- Real-time flight tracking alerts
- Flight booking integration
- User accounts/authentication
- Native mobile apps
- Predictive analytics

---

## 6. Success Metrics

### 6.1 Launch Metrics (Week 1)

| Metric | Target | Measurement Tool |
|--------|--------|-----------------|
| Page Loads | 1,000+ | Analytics |
| Avg Session Duration | > 2 minutes | Analytics |
| Bounce Rate | < 50% | Analytics |
| Social Shares | 50+ | Share button clicks |

### 6.2 Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Lighthouse Performance | > 80 | Lighthouse CI |
| Animation FPS | 60fps on 90% of frames | Performance monitor |
| Error Rate | < 0.1% | Error tracking (Sentry) |
| Accessibility Score | > 90 | Lighthouse |

### 6.3 Engagement Metrics (Month 1)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Return Visitors | 20%+ | Analytics |
| Feature Usage: Speed Controls | 40%+ use | Event tracking |
| Feature Usage: Pause | 30%+ use | Event tracking |
| Avg Flights Watched | > 100 per session | Event tracking |

### 6.4 Growth Metrics (Ongoing)

| Metric | Target | Measurement |
|--------|--------|-------------|
| GitHub Stars | 100+ (if open source) | GitHub |
| Hacker News / Reddit Posts | 3+ organic mentions | Social monitoring |
| Press/Blog Mentions | 5+ | Google Alerts |

---

## 7. Wireframes / Visual Concept

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Flight Trails: California                                    [⚙️] [?]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                          ✈️- - - - - - ✈️                               │
│                    ·                        ╲                           │
│               ✈️- -·                          ╲    ✈️                   │
│              ╱    ·                        [SFO]   ╲                    │
│             ╱    ·    ✈️══════════════        ●     ╲                   │
│            ╱    ·              ╲                      ╲                 │
│       [SAC]●   ·                ╲                 ✈️══════              │
│              ·                    ╲                  ║                  │
│             ·       CALIFORNIA      ╲               [SJC]●              │
│            ·                          ╲                                 │
│           ·                             ╲                               │
│          ·                                ╲                             │
│         ·                                   ╲      ✈️- - - -            │
│        ·                              [LAX]● ╲            ╲             │
│       ·                                   ✈️═══════════════╲            │
│                                                              ╲          │
│                                                         [SAN]●          │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  [⏮️] [▶️ Play] [⏭️]    ●━━━━━━━━━━━━━━━○───────────    [1x ▼]         │
│                          12:00 PM                 Now                   │
│                                                                         │
│  🛫 2,847 flights  ┃  ✈️ 156 in air  ┃  📊 LAX: 423 departures          │
└─────────────────────────────────────────────────────────────────────────┘

Legend:
  ✈️═══  Active flight with contrail (solid = recent, fading behind)
  ✈️- -  Older flight (trail mostly faded)
  ●      Airport marker
```

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OpenSky rate limits | High | Medium | Pre-fetch & cache data; use registered account |
| Poor performance with many flights | Medium | High | Virtualization; LOD reduction; WebGL |
| Data gaps in flight paths | Medium | Low | Interpolation; show gaps gracefully |
| Map tile costs | Low | Medium | Use free tier (Mapbox/Stadia/OSM) |
| Browser compatibility | Low | Medium | Target modern browsers only (Chrome, Firefox, Safari) |

---

## 9. Open Questions

1. **Branding:** What should we call this app? (Flight Trails? SkyDance? Contrails?)
2. **Monetization:** Should we add a "Pro" tier for real-time data?
3. **Open Source:** Do we want to open source the codebase?
4. **Data Retention:** How long should we keep historical data?
5. **Privacy:** Any concerns with displaying flight data publicly?

---

## 10. Appendix

### A. API Rate Limit Strategy

```javascript
// OpenSky rate limits
const RATE_LIMITS = {
  anonymous: {
    requests_per_day: 400,
    requests_per_10_seconds: 1
  },
  registered: {
    requests_per_day: 4000,
    requests_per_5_seconds: 1
  }
};

// Strategy: Fetch every 15 min = 96 requests/day (well under limit)
const FETCH_INTERVAL_MS = 15 * 60 * 1000;
```

### B. Flight Data Schema

```typescript
interface Flight {
  id: string;              // icao24
  callsign: string;        // e.g., "UAL123"
  origin: Airport | null;  // Derived from path
  destination: Airport | null;
  path: Position[];        // Array of timestamped positions
  airline: string | null;  // Extracted from callsign
  aircraftType: string | null;
}

interface Position {
  timestamp: number;       // Unix epoch
  latitude: number;
  longitude: number;
  altitude: number;        // meters
  heading: number;         // degrees
  velocity: number;        // m/s
}

interface Airport {
  code: string;            // ICAO or IATA
  name: string;
  latitude: number;
  longitude: number;
}
```

### C. Color Palette

```css
:root {
  --bg-dark: #0a0a0f;
  --map-land: #1a1a2e;
  --map-water: #0f0f1a;
  --contrail-bright: #3b82f6;
  --contrail-mid: rgba(59, 130, 246, 0.4);
  --contrail-fade: rgba(59, 130, 246, 0);
  --airport-marker: #fbbf24;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
}
```

---

*Document maintained by Product Team. Last updated: January 2025*
