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
        const maxTrailLength = 60; // Number of trail points
        
        this.flights.forEach((flight, id) => {
            const trail = this.trails.get(id);
            if (!trail) return;
            
            // Add current position to trail
            const pos = { 
                lat: flight.lat, 
                lon: flight.lon, 
                altitude: flight.altitude,
                timestamp: Date.now()
            };
            
            // Only add if moved significantly
            if (trail.length === 0 || 
                Math.abs(trail[trail.length - 1].lat - pos.lat) > 0.001 ||
                Math.abs(trail[trail.length - 1].lon - pos.lon) > 0.001) {
                trail.push(pos);
            }
            
            // Trim old trail points
            while (trail.length > maxTrailLength) {
                trail.shift();
            }
        });
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.showTrails) return;
        
        // Draw trails for each flight
        this.trails.forEach((trail, id) => {
            if (trail.length < 2) return;
            
            const flight = this.flights.get(id);
            if (!flight) return;
            
            this.drawContrail(trail, flight);
        });
    }
    
    drawContrail(trail, flight) {
        const ctx = this.ctx;
        
        // Convert trail points to screen coordinates
        const points = trail.map(p => this.latLonToPixel(p.lat, p.lon));
        
        if (points.length < 2) return;
        
        // Draw multiple layers for the contrail effect
        this.drawTrailLayer(points, flight.altitude, 0.15, 12);  // Outer glow
        this.drawTrailLayer(points, flight.altitude, 0.25, 8);   // Mid glow
        this.drawTrailLayer(points, flight.altitude, 0.5, 4);    // Inner glow
        this.drawTrailLayer(points, flight.altitude, 0.8, 2);    // Core
    }
    
    drawTrailLayer(points, altitude, baseAlpha, lineWidth) {
        const ctx = this.ctx;
        
        // Altitude affects trail brightness (higher = more visible)
        const altFactor = Math.min(1, altitude / 35000);
        
        for (let i = 1; i < points.length; i++) {
            const progress = i / points.length;
            const alpha = baseAlpha * progress * (0.5 + altFactor * 0.5);
            
            // Fade width toward tail
            const width = lineWidth * (0.3 + progress * 0.7);
            
            ctx.beginPath();
            ctx.moveTo(points[i - 1].x, points[i - 1].y);
            ctx.lineTo(points[i].x, points[i].y);
            
            // Blue contrail color with altitude variation
            const hue = 200 + altFactor * 20; // 200-220 (blue range)
            const lightness = 60 + altFactor * 20;
            ctx.strokeStyle = `hsla(${hue}, 90%, ${lightness}%, ${alpha})`;
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        
        // Add sparkle effect at the head
        if (points.length > 0) {
            const head = points[points.length - 1];
            const sparkleAlpha = 0.3 + Math.sin(Date.now() / 200) * 0.2;
            
            ctx.beginPath();
            ctx.arc(head.x, head.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${sparkleAlpha})`;
            ctx.fill();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FlightTrailsApp();
});
