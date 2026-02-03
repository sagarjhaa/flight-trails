# ✈️ California Flight Trails

A beautiful real-time flight visualization showing aircraft over California with animated contrail effects.

![Flight Trails Screenshot](screenshot.png)

## Features

- **Live Flight Data**: Fetches real-time flight positions from OpenSky Network API
- **Beautiful Contrails**: Glowing blue trails that fade like real contrails
- **610+ Active Flights**: Visualizes all aircraft in California airspace
- **Interactive Map**: Pan and zoom with Leaflet.js on dark CartoDB tiles
- **Flight Info**: Hover over planes to see callsign, altitude, speed, and heading
- **Controls**:
  - 🔄 Refresh flight data
  - 💨 Toggle trails on/off
  - ⚡ Speed multiplier (1x, 2x, 5x, 10x)

## Tech Stack

- **HTML5 Canvas** - Contrail rendering with multi-layer glow effect
- **Leaflet.js** - Interactive map with CartoDB dark tiles
- **OpenSky Network API** - Free real-time flight data
- **Vanilla JavaScript** - No frameworks, pure performance

## How It Works

1. Fetches flight data for California bounding box (lat 32.5-42, lon -124.5 to -114)
2. Renders plane icons on Leaflet map with correct heading
3. Draws contrails on Canvas overlay using:
   - 5-layer glow effect (outer soft → inner bright)
   - Altitude-based brightness (higher = more visible)
   - Velocity-based trail length
   - Subtle wobble animation for realism
4. Engine glow effect with pulsing radial gradient
5. Auto-refreshes every 30 seconds

## Running Locally

```bash
cd flight-trails
python3 -m http.server 8888
# Open http://localhost:8888
```

## API

Uses OpenSky Network's free API:
```
https://opensky-network.org/api/states/all?lamin=32.5&lomin=-124.5&lamax=42&lomax=-114
```

Falls back to simulated flights if API is unavailable.

## Files

- `index.html` - App structure and layout
- `styles.css` - Dark theme UI styling
- `app.js` - All the magic (flight data, animation, contrails)

## License

MIT - Have fun! ✈️
