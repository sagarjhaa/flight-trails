// Flight Trails Visualization App
// Animated flights from source to destination with live map updates

class FlightTrailsApp {
    constructor() {
        // State
        this.flights = new Map();
        this.showTrails = true;
        this.animationSpeed = 1;
        
        // Current view bounds
        this.currentBounds = null;
        
        // Region presets
        this.regions = {
            'california': { center: [37.5, -119.5], zoom: 6, name: 'California' },
            'usa': { center: [39.8, -98.5], zoom: 4, name: 'United States' },
            'india': { center: [22.5, 78.9], zoom: 5, name: 'India' },
            'europe': { center: [50.0, 10.0], zoom: 4, name: 'Europe' },
            'uk': { center: [54.0, -2.0], zoom: 6, name: 'United Kingdom' },
            'japan': { center: [36.5, 138.0], zoom: 6, name: 'Japan' },
            'australia': { center: [-25.0, 135.0], zoom: 4, name: 'Australia' },
            'china': { center: [35.0, 105.0], zoom: 4, name: 'China' },
            'brazil': { center: [-14.0, -52.0], zoom: 4, name: 'Brazil' },
            'middle-east': { center: [25.0, 45.0], zoom: 5, name: 'Middle East' }
        };
        
        this.currentRegion = 'california';
        
        // Initialize
        this.initMap();
        this.initCanvas();
        this.initControls();
        
        // Start animation loop
        this.animate();
    }
    
    initMap() {
        // Create map centered on California
        this.map = L.map('map', {
            center: [37.5, -119.5],
            zoom: 6,
            zoomControl: true
        });
        
        // Dark map tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap © CARTO',
            maxZoom: 19
        }).addTo(this.map);
        
        // Handle map events
        this.map.on('moveend', () => this.onMapMove());
        this.map.on('zoomend', () => this.onMapMove());
        this.map.on('resize', () => this.resizeCanvas());
        
        // Initial load
        this.onMapMove();
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
    
    initControls() {
        // Region selector
        const regionSelect = document.getElementById('region-select');
        regionSelect.addEventListener('change', (e) => {
            this.changeRegion(e.target.value);
        });
        
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadFlights();
        });
        
        const trailsBtn = document.getElementById('toggle-trails');
        trailsBtn.classList.add('active');
        trailsBtn.addEventListener('click', () => {
            this.showTrails = !this.showTrails;
            trailsBtn.classList.toggle('active');
        });
        
        const speedBtn = document.getElementById('speed-btn');
        const speeds = [1, 2, 5, 10];
        let speedIndex = 0;
        speedBtn.addEventListener('click', () => {
            speedIndex = (speedIndex + 1) % speeds.length;
            this.animationSpeed = speeds[speedIndex];
            speedBtn.textContent = `⚡ ${speeds[speedIndex]}x`;
        });
    }
    
    changeRegion(regionKey) {
        const region = this.regions[regionKey];
        if (!region) return;
        
        this.currentRegion = regionKey;
        
        // Clear existing flights
        this.flights.clear();
        
        // Update map view - this triggers moveend which loads flights
        this.map.setView(region.center, region.zoom);
        
        // Update title
        document.querySelector('#header h1').textContent = `✈️ ${region.name} Flight Trails`;
        
        // Force reload flights for new region
        setTimeout(() => this.loadFlights(), 100);
    }
    
    onMapMove() {
        // Get current map bounds
        const bounds = this.map.getBounds();
        this.currentBounds = {
            lamin: bounds.getSouth(),
            lamax: bounds.getNorth(),
            lomin: bounds.getWest(),
            lomax: bounds.getEast()
        };
        
        // Load flights for this area
        this.loadFlights();
    }
    
    async loadFlights() {
        if (!this.currentBounds) return;
        
        const loading = document.getElementById('loading');
        loading.classList.remove('hidden');
        
        try {
            const { lamin, lamax, lomin, lomax } = this.currentBounds;
            const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('API request failed');
            
            const data = await response.json();
            this.processFlightData(data);
            
        } catch (error) {
            console.error('Failed to load flights:', error);
            this.generateSimulatedFlights();
        }
        
        loading.classList.add('hidden');
    }
    
    processFlightData(data) {
        if (!data.states) {
            this.generateSimulatedFlights();
            return;
        }
        
        // Clear old flights not in new data
        const newIds = new Set();
        
        data.states.forEach(state => {
            const [
                icao24, callsign, originCountry, timePosition, lastContact,
                longitude, latitude, baroAltitude, onGround, velocity,
                trueTrack, verticalRate
            ] = state;
            
            // Skip if no position or on ground (arrived)
            if (!latitude || !longitude || onGround) return;
            
            const id = icao24;
            newIds.add(id);
            
            const existing = this.flights.get(id);
            
            if (existing) {
                // Update destination - plane is still flying
                existing.destLat = latitude;
                existing.destLon = longitude;
                existing.heading = trueTrack || existing.heading;
                existing.velocity = (velocity || 0) * 1.944;
                existing.altitude = Math.round((baroAltitude || 0) * 3.28084);
            } else {
                // New flight - calculate source position (behind current position based on heading)
                const heading = trueTrack || 0;
                const headingRad = (heading - 180) * Math.PI / 180;
                
                // Source is behind current position
                const offset = 0.5; // degrees back
                const sourceLat = latitude + Math.cos(headingRad) * offset;
                const sourceLon = longitude + Math.sin(headingRad) * offset;
                
                this.flights.set(id, {
                    id,
                    callsign: (callsign || 'N/A').trim(),
                    // Source (starting point)
                    sourceLat,
                    sourceLon,
                    // Current animated position
                    currentLat: sourceLat,
                    currentLon: sourceLon,
                    // Destination (current real position, will update)
                    destLat: latitude,
                    destLon: longitude,
                    // Flight info
                    altitude: Math.round((baroAltitude || 0) * 3.28084),
                    velocity: (velocity || 0) * 1.944,
                    heading: heading,
                    // Animation progress 0-1
                    progress: 0,
                    // Trail history
                    trail: []
                });
            }
        });
        
        // Remove flights that have landed or left the area
        this.flights.forEach((flight, id) => {
            if (!newIds.has(id)) {
                this.flights.delete(id);
            }
        });
        
        this.updateStats();
    }
    
    generateSimulatedFlights() {
        // Fallback simulated data
        const airports = [
            { name: 'LAX', lat: 33.9425, lon: -118.408 },
            { name: 'SFO', lat: 37.6213, lon: -122.379 },
            { name: 'SAN', lat: 32.7336, lon: -117.190 },
            { name: 'SJC', lat: 37.3639, lon: -121.929 },
            { name: 'LAS', lat: 36.0840, lon: -115.152 }
        ];
        
        for (let i = 0; i < 30; i++) {
            const id = `sim_${i}`;
            if (this.flights.has(id)) continue;
            
            const origin = airports[Math.floor(Math.random() * airports.length)];
            const dest = airports[Math.floor(Math.random() * airports.length)];
            if (origin === dest) continue;
            
            const heading = Math.atan2(dest.lon - origin.lon, dest.lat - origin.lat) * 180 / Math.PI;
            
            this.flights.set(id, {
                id,
                callsign: `SIM${1000 + i}`,
                sourceLat: origin.lat,
                sourceLon: origin.lon,
                currentLat: origin.lat,
                currentLon: origin.lon,
                destLat: dest.lat,
                destLon: dest.lon,
                altitude: 30000 + Math.random() * 10000,
                velocity: 400 + Math.random() * 100,
                heading: (heading + 360) % 360,
                progress: 0,
                trail: []
            });
        }
        
        this.updateStats();
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
    
    latLonToPixel(lat, lon) {
        const point = this.map.latLngToContainerPoint([lat, lon]);
        return { x: point.x, y: point.y };
    }
    
    animate() {
        // Update flight positions
        this.flights.forEach((flight, id) => {
            // Advance progress based on speed
            const speedFactor = 0.002 * this.animationSpeed;
            flight.progress = Math.min(1, flight.progress + speedFactor);
            
            // Interpolate position from source to destination
            flight.currentLat = flight.sourceLat + (flight.destLat - flight.sourceLat) * flight.progress;
            flight.currentLon = flight.sourceLon + (flight.destLon - flight.sourceLon) * flight.progress;
            
            // Add to trail
            flight.trail.push({
                lat: flight.currentLat,
                lon: flight.currentLon,
                time: Date.now()
            });
            
            // Keep trail limited
            const maxTrailPoints = 80;
            while (flight.trail.length > maxTrailPoints) {
                flight.trail.shift();
            }
            
            // Remove if reached destination
            if (flight.progress >= 1) {
                this.flights.delete(id);
            }
        });
        
        // Draw
        this.draw();
        
        requestAnimationFrame(() => this.animate());
    }
    
    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw trails FIRST (behind planes)
        if (this.showTrails) {
            this.flights.forEach(flight => {
                if (flight.trail.length > 1) {
                    this.drawTrail(flight);
                }
            });
        }
        
        // Draw planes ON TOP
        this.flights.forEach(flight => {
            this.drawPlane(flight);
        });
    }
    
    drawTrail(flight) {
        const ctx = this.ctx;
        const trail = flight.trail;
        
        if (trail.length < 2) return;
        
        // Draw one straight line from oldest point to plane
        const start = this.latLonToPixel(trail[0].lat, trail[0].lon);
        const end = this.latLonToPixel(flight.currentLat, flight.currentLon);
        
        // Create gradient from faint (tail) to visible (plane)
        const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
        gradient.addColorStop(0, 'rgba(100, 180, 255, 0)');      // Invisible at tail
        gradient.addColorStop(0.5, 'rgba(100, 180, 255, 0.15)'); // Faint middle
        gradient.addColorStop(0.85, 'rgba(120, 200, 255, 0.4)'); // More visible
        gradient.addColorStop(1, 'rgba(150, 220, 255, 0.6)');    // Visible near plane
        
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
    
    drawPlane(flight) {
        const ctx = this.ctx;
        const pos = this.latLonToPixel(flight.currentLat, flight.currentLon);
        
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate((flight.heading + 90) * Math.PI / 180);
        
        // Simple plane triangle
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(-4, 6);
        ctx.lineTo(4, 6);
        ctx.closePath();
        
        ctx.fillStyle = '#4fc3f7';
        ctx.fill();
        
        // Engine glow
        const pulse = 0.7 + Math.sin(Date.now() / 150) * 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.8})`;
        ctx.fill();
        
        ctx.restore();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FlightTrailsApp();
});
