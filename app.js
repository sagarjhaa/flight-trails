// Flight Trails Visualization App
// California bounds: lat 32.5-42, lon -124.5 to -114

class FlightTrailsApp {
    constructor() {
        // California center and bounds
        this.californiaCenter = [37.5, -119.5];
        this.californiaBounds = {
            lamin: 32.5,
            lamax: 42,
            lomin: -124.5,
            lomax: -114
        };
        
        // State
        this.flights = new Map();
        this.trails = new Map();
        this.markers = new Map();
        this.showTrails = true;
        this.animationSpeed = 1;
        this.lastUpdate = 0;
        
        // Animation
        this.animationFrame = null;
        this.lastFrameTime = 0;
        
        // Initialize
        this.initMap();
        this.initCanvas();
        this.initControls();
        this.loadFlights();
        
        // Start animation loop
        this.animate();
        
        // Auto-refresh every 30 seconds
        setInterval(() => this.loadFlights(), 30000);
    }
    
    initMap() {
        // Create map centered on California
        this.map = L.map('map', {
            center: this.californiaCenter,
            zoom: 6,
            zoomControl: true,
            attributionControl: true
        });
        
        // Dark map tiles (CartoDB Dark Matter)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);
        
        // Handle map events for canvas sync
        this.map.on('move', () => this.updateCanvasTransform());
        this.map.on('zoom', () => this.updateCanvasTransform());
        this.map.on('resize', () => this.resizeCanvas());
    }
    
    initCanvas() {
        this.canvas = document.getElementById('trails-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    updateCanvasTransform() {
        // Canvas coordinates will be recalculated in draw loop
    }
    
    initControls() {
        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadFlights();
        });
        
        // Toggle trails
        const trailsBtn = document.getElementById('toggle-trails');
        trailsBtn.classList.add('active');
        trailsBtn.addEventListener('click', () => {
            this.showTrails = !this.showTrails;
            trailsBtn.classList.toggle('active');
        });
        
        // Speed control
        const speedBtn = document.getElementById('speed-btn');
        const speeds = [1, 2, 5, 10];
        let speedIndex = 0;
        speedBtn.addEventListener('click', () => {
            speedIndex = (speedIndex + 1) % speeds.length;
            this.animationSpeed = speeds[speedIndex];
            speedBtn.textContent = `⚡ ${speeds[speedIndex]}x`;
        });
    }
    
    async loadFlights() {
        const loading = document.getElementById('loading');
        loading.classList.remove('hidden');
        
        try {
            // OpenSky API endpoint with California bounding box
            const { lamin, lamax, lomin, lomax } = this.californiaBounds;
            const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
            
            // Use CORS proxy for browser compatibility
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('API request failed');
            
            const data = await response.json();
            this.processFlightData(data);
            
        } catch (error) {
            console.error('Failed to load flights:', error);
            // Use simulated data as fallback
            this.generateSimulatedFlights();
        }
        
        loading.classList.add('hidden');
    }
    
    processFlightData(data) {
        if (!data.states) {
            this.generateSimulatedFlights();
            return;
        }
        
        const newFlights = new Map();
        
        data.states.forEach(state => {
            const [
                icao24, callsign, originCountry, timePosition, lastContact,
                longitude, latitude, baroAltitude, onGround, velocity,
                trueTrack, verticalRate, sensors, geoAltitude, squawk,
                spi, positionSource
            ] = state;
            
            // Skip if no position or on ground
            if (!latitude || !longitude || onGround) return;
            
            const id = icao24;
            const existingFlight = this.flights.get(id);
            
            const flight = {
                id,
                callsign: (callsign || 'N/A').trim(),
                origin: originCountry,
                lat: latitude,
                lon: longitude,
                altitude: Math.round((baroAltitude || geoAltitude || 0) * 3.28084), // m to ft
                velocity: Math.round((velocity || 0) * 1.944), // m/s to knots
                heading: trueTrack || 0,
                verticalRate: verticalRate || 0,
                // Animation state
                prevLat: existingFlight?.lat || latitude,
                prevLon: existingFlight?.lon || longitude,
                targetLat: latitude,
                targetLon: longitude,
                interpolation: 0
            };
            
            newFlights.set(id, flight);
            
            // Initialize or update trail
            if (!this.trails.has(id)) {
                this.trails.set(id, []);
            }
        });
        
        // Remove old flights
        this.flights.forEach((_, id) => {
            if (!newFlights.has(id)) {
                this.removeFlightMarker(id);
                this.trails.delete(id);
            }
        });
        
        this.flights = newFlights;
        this.updateMarkers();
        this.updateStats();
    }
    
    generateSimulatedFlights() {
        // Generate realistic simulated flights when API fails
        const numFlights = 40 + Math.floor(Math.random() * 20);
        const newFlights = new Map();
        
        // California airports/waypoints
        const airports = [
            { name: 'LAX', lat: 33.9425, lon: -118.408 },
            { name: 'SFO', lat: 37.6213, lon: -122.379 },
            { name: 'SAN', lat: 32.7336, lon: -117.190 },
            { name: 'SJC', lat: 37.3639, lon: -121.929 },
            { name: 'OAK', lat: 37.7213, lon: -122.221 },
            { name: 'BUR', lat: 34.2007, lon: -118.359 },
            { name: 'SMF', lat: 38.6954, lon: -121.591 },
            { name: 'LAS', lat: 36.0840, lon: -115.152 },
            { name: 'PHX', lat: 33.4373, lon: -112.008 },
            { name: 'SEA', lat: 47.4502, lon: -122.309 }
        ];
        
        const airlines = ['UAL', 'AAL', 'DAL', 'SWA', 'ASA', 'JBU', 'SKW', 'FFT'];
        
        for (let i = 0; i < numFlights; i++) {
            const id = `sim_${i}`;
            const existing = this.flights.get(id);
            
            let flight;
            if (existing) {
                // Update existing simulated flight
                const speed = 0.002 * this.animationSpeed;
                const headingRad = existing.heading * Math.PI / 180;
                
                let newLat = existing.lat + Math.cos(headingRad) * speed;
                let newLon = existing.lon + Math.sin(headingRad) * speed;
                
                // Wrap around if out of bounds
                if (newLat < 32 || newLat > 43 || newLon < -126 || newLon > -113) {
                    const origin = airports[Math.floor(Math.random() * 6)];
                    newLat = origin.lat + (Math.random() - 0.5) * 2;
                    newLon = origin.lon + (Math.random() - 0.5) * 2;
                }
                
                flight = {
                    ...existing,
                    prevLat: existing.lat,
                    prevLon: existing.lon,
                    lat: newLat,
                    lon: newLon,
                    targetLat: newLat,
                    targetLon: newLon
                };
            } else {
                // Create new simulated flight
                const origin = airports[Math.floor(Math.random() * airports.length)];
                const dest = airports[Math.floor(Math.random() * airports.length)];
                
                // Random position between origin and destination
                const t = Math.random();
                const lat = origin.lat + (dest.lat - origin.lat) * t + (Math.random() - 0.5) * 2;
                const lon = origin.lon + (dest.lon - origin.lon) * t + (Math.random() - 0.5) * 2;
                
                // Calculate heading toward destination
                const heading = Math.atan2(dest.lon - lon, dest.lat - lat) * 180 / Math.PI;
                
                const airline = airlines[Math.floor(Math.random() * airlines.length)];
                const flightNum = Math.floor(Math.random() * 9000) + 100;
                
                flight = {
                    id,
                    callsign: `${airline}${flightNum}`,
                    origin: 'United States',
                    lat,
                    lon,
                    altitude: 25000 + Math.floor(Math.random() * 16000),
                    velocity: 350 + Math.floor(Math.random() * 200),
                    heading: (heading + 360) % 360,
                    verticalRate: (Math.random() - 0.5) * 20,
                    prevLat: lat,
                    prevLon: lon,
                    targetLat: lat,
                    targetLon: lon,
                    interpolation: 0
                };
            }
            
            newFlights.set(id, flight);
            
            if (!this.trails.has(id)) {
                this.trails.set(id, []);
            }
        }
        
        this.flights = newFlights;
        this.updateMarkers();
        this.updateStats();
    }
    
    updateMarkers() {
        this.flights.forEach((flight, id) => {
            if (this.markers.has(id)) {
                // Update existing marker position
                const marker = this.markers.get(id);
                marker.setLatLng([flight.lat, flight.lon]);
                
                // Update rotation
                const icon = marker.getElement();
                if (icon) {
                    const svg = icon.querySelector('svg');
                    if (svg) {
                        svg.style.transform = `rotate(${flight.heading}deg)`;
                    }
                }
            } else {
                // Create new marker
                this.createFlightMarker(flight);
            }
        });
    }
    
    createFlightMarker(flight) {
        const planeIcon = L.divIcon({
            className: 'plane-marker',
            html: `<svg viewBox="0 0 24 24" style="transform: rotate(${flight.heading}deg)">
                <path fill="#4fc3f7" d="M21,16V14L13,9V3.5A1.5,1.5,0,0,0,11.5,2A1.5,1.5,0,0,0,10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z"/>
            </svg>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        const marker = L.marker([flight.lat, flight.lon], { icon: planeIcon })
            .addTo(this.map);
        
        // Hover events
        marker.on('mouseover', (e) => this.showTooltip(flight, e));
        marker.on('mouseout', () => this.hideTooltip());
        marker.on('mousemove', (e) => this.moveTooltip(e));
        
        this.markers.set(flight.id, marker);
    }
    
    removeFlightMarker(id) {
        const marker = this.markers.get(id);
        if (marker) {
            this.map.removeLayer(marker);
            this.markers.delete(id);
        }
    }
    
    showTooltip(flight, e) {
        const tooltip = document.getElementById('tooltip');
        tooltip.innerHTML = `
            <div class="flight-callsign">${flight.callsign}</div>
            <div class="flight-info">
                <span class="label">Origin</span>
                <span class="value">${flight.origin}</span>
                <span class="label">Altitude</span>
                <span class="value">${flight.altitude.toLocaleString()} ft</span>
                <span class="label">Speed</span>
                <span class="value">${flight.velocity} kts</span>
                <span class="label">Heading</span>
                <span class="value">${Math.round(flight.heading)}°</span>
            </div>
        `;
        tooltip.classList.remove('hidden');
        this.moveTooltip(e);
    }
    
    moveTooltip(e) {
        const tooltip = document.getElementById('tooltip');
        const x = e.originalEvent.clientX + 15;
        const y = e.originalEvent.clientY + 15;
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }
    
    hideTooltip() {
        document.getElementById('tooltip').classList.add('hidden');
    }
    
    updateStats() {
        const count = this.flights.size;
        document.getElementById('flight-count').textContent = count;
        
        if (count > 0) {
            const totalAlt = Array.from(this.flights.values())
                .reduce((sum, f) => sum + f.altitude, 0);
            document.getElementById('avg-altitude').textContent = 
                Math.round(totalAlt / count).toLocaleString();
        }
    }
    
    // Convert lat/lon to canvas pixel coordinates
    latLonToPixel(lat, lon) {
        const point = this.map.latLngToContainerPoint([lat, lon]);
        return { x: point.x, y: point.y };
    }
    
    animate(timestamp = 0) {
        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;
        
        // Update flight positions (interpolation for smooth movement)
        this.flights.forEach(flight => {
            flight.interpolation = Math.min(1, flight.interpolation + 0.02 * this.animationSpeed);
        });
        
        // Update trails
        if (this.showTrails) {
            this.updateTrails();
        }
        
        // Draw
        this.draw();
        
        // Request next frame
        this.animationFrame = requestAnimationFrame((t) => this.animate(t));
    }
    
    updateTrails() {
        const maxTrailLength = 100; // Number of trail points
        
        this.flights.forEach((flight, id) => {
            const trail = this.trails.get(id);
            if (!trail) return;
            
            // Simulate movement based on heading and velocity
            // Scale factor adjusted for zoom level visibility
            const zoomLevel = this.map.getZoom();
            const zoomScale = Math.pow(2, zoomLevel - 6) * 0.3; // Scale with zoom
            const speedFactor = 0.00005 * this.animationSpeed * (flight.velocity / 400);
            const headingRad = flight.heading * Math.PI / 180;
            
            // Calculate projected position based on heading
            const projectedLat = flight.lat + Math.cos(headingRad) * speedFactor;
            const projectedLon = flight.lon + Math.sin(headingRad) * speedFactor;
            
            const pos = { 
                lat: projectedLat, 
                lon: projectedLon, 
                altitude: flight.altitude,
                timestamp: Date.now()
            };
            
            // Initialize with a trail behind the plane
            if (trail.length === 0) {
                for (let i = 50; i >= 0; i--) {
                    trail.push({
                        lat: flight.lat - Math.cos(headingRad) * speedFactor * i * 1.5,
                        lon: flight.lon - Math.sin(headingRad) * speedFactor * i * 1.5,
                        altitude: flight.altitude,
                        timestamp: Date.now() - i * 50
                    });
                }
            }
            
            trail.push(pos);
            
            // Trim old trail points
            while (trail.length > maxTrailLength) {
                trail.shift();
            }
            
            // Update flight position for smooth animation
            flight.lat = projectedLat;
            flight.lon = projectedLon;
        });
        
        // Update marker positions to match animated positions
        this.updateMarkerPositions();
    }
    
    updateMarkerPositions() {
        this.flights.forEach((flight, id) => {
            const marker = this.markers.get(id);
            if (marker) {
                marker.setLatLng([flight.lat, flight.lon]);
            }
        });
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.showTrails) return;
        
        // Draw contrails for each flight
        this.flights.forEach((flight, id) => {
            this.drawContrail(null, flight);
        });
    }
    
    drawContrail(trail, flight) {
        const ctx = this.ctx;
        
        // Get current plane position in screen coordinates
        const planePos = this.latLonToPixel(flight.lat, flight.lon);
        
        // Calculate trail length based on velocity and zoom
        const zoomLevel = this.map.getZoom();
        const trailLength = 25 + (flight.velocity / 15) + (zoomLevel * 5);
        
        // Calculate direction (opposite of heading for trail behind)
        const headingRad = (flight.heading - 90) * Math.PI / 180;
        
        // Create trail points in screen space going backwards from plane
        const numPoints = 50;
        const points = [];
        
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            // Trail curves slightly and gets thinner
            const wobble = Math.sin(t * 4 + Date.now() / 500) * t * 3;
            const x = planePos.x - Math.cos(headingRad) * trailLength * t + Math.sin(headingRad) * wobble;
            const y = planePos.y - Math.sin(headingRad) * trailLength * t - Math.cos(headingRad) * wobble;
            points.push({ x, y, t });
        }
        
        // Draw multiple layers for the contrail effect - beautiful fading glow
        this.drawTrailLayer(points, flight.altitude, 0.05, 24);  // Outer soft glow
        this.drawTrailLayer(points, flight.altitude, 0.12, 16);  // Mid glow  
        this.drawTrailLayer(points, flight.altitude, 0.25, 10);  // Inner glow
        this.drawTrailLayer(points, flight.altitude, 0.5, 5);    // Bright core
        this.drawTrailLayer(points, flight.altitude, 0.8, 2);    // Hot center
        
        // Draw engine glow at plane position
        this.drawEngineGlow(planePos, flight);
    }
    
    drawTrailLayer(points, altitude, baseAlpha, maxWidth) {
        const ctx = this.ctx;
        
        // Altitude affects trail brightness (higher = more visible contrails)
        const altFactor = Math.min(1, Math.max(0.3, altitude / 38000));
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const progress = 1 - curr.t; // Fade from plane to tail
            
            // Alpha fades out toward tail
            const alpha = baseAlpha * Math.pow(progress, 0.7) * (0.5 + altFactor * 0.5);
            
            // Width tapers toward tail
            const width = maxWidth * (0.1 + Math.pow(progress, 0.5) * 0.9);
            
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(curr.x, curr.y);
            
            // Blue contrail color - ice crystal appearance
            const hue = 200 + altFactor * 15;
            const saturation = 80 + progress * 20;
            const lightness = 60 + altFactor * 25;
            
            ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
            ctx.lineWidth = width;
            ctx.stroke();
        }
    }
    
    drawEngineGlow(pos, flight) {
        const ctx = this.ctx;
        const pulse = 0.6 + Math.sin(Date.now() / 100 + flight.heading) * 0.4;
        
        // Outer glow
        const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 12);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${pulse * 0.9})`);
        gradient.addColorStop(0.3, `rgba(180, 220, 255, ${pulse * 0.5})`);
        gradient.addColorStop(0.7, `rgba(100, 180, 255, ${pulse * 0.2})`);
        gradient.addColorStop(1, 'rgba(80, 160, 255, 0)');
        
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FlightTrailsApp();
});
