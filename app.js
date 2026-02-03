// Flight Trails Visualization App
// Live flights with straight line contrails

class FlightTrailsApp {
    constructor() {
        this.flights = new Map();
        this.showTrails = true;
        this.animationSpeed = 1;
        
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
        
        this.initMap();
        this.initCanvas();
        this.initControls();
        this.animate();
    }
    
    initMap() {
        this.map = L.map('map', {
            center: [37.5, -119.5],
            zoom: 6
        });
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap © CARTO',
            maxZoom: 19
        }).addTo(this.map);
        
        this.map.on('moveend', () => this.loadFlights());
        this.map.on('zoomend', () => this.loadFlights());
        
        // Initial load
        setTimeout(() => this.loadFlights(), 500);
        
        // Refresh every 10 seconds
        setInterval(() => this.loadFlights(), 10000);
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
        document.getElementById('region-select').addEventListener('change', (e) => {
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
        
        this.flights.clear();
        this.map.setView(region.center, region.zoom);
        document.querySelector('#header h1').textContent = `✈️ ${region.name} Flight Trails`;
    }
    
    async loadFlights() {
        const bounds = this.map.getBounds();
        const params = {
            lamin: bounds.getSouth(),
            lamax: bounds.getNorth(),
            lomin: bounds.getWest(),
            lomax: bounds.getEast()
        };
        
        const loading = document.getElementById('loading');
        loading.classList.remove('hidden');
        
        try {
            const url = `https://opensky-network.org/api/states/all?lamin=${params.lamin}&lomin=${params.lomin}&lamax=${params.lamax}&lomax=${params.lomax}`;
            const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
            const data = await response.json();
            
            if (data.states) {
                this.processFlights(data.states);
            }
        } catch (e) {
            console.error('API error:', e);
        }
        
        loading.classList.add('hidden');
    }
    
    processFlights(states) {
        const seen = new Set();
        
        states.forEach(s => {
            const [icao, callsign, country, , , lon, lat, alt, onGround, vel, heading] = s;
            
            if (!lat || !lon || onGround) return;
            
            seen.add(icao);
            const existing = this.flights.get(icao);
            
            if (existing) {
                // Update position
                existing.prevLat = existing.lat;
                existing.prevLon = existing.lon;
                existing.lat = lat;
                existing.lon = lon;
                existing.heading = heading || existing.heading;
                existing.velocity = (vel || 0) * 1.944;
                existing.altitude = Math.round((alt || 0) * 3.28084);
            } else {
                // New flight - calculate trail start behind plane
                const hdg = (heading || 0) * Math.PI / 180;
                const trailLen = 0.3; // degrees behind
                
                this.flights.set(icao, {
                    id: icao,
                    callsign: (callsign || '').trim() || icao,
                    lat: lat,
                    lon: lon,
                    // Trail starts behind the plane
                    trailStartLat: lat - Math.cos(hdg) * trailLen,
                    trailStartLon: lon - Math.sin(hdg) * trailLen,
                    heading: heading || 0,
                    velocity: (vel || 0) * 1.944,
                    altitude: Math.round((alt || 0) * 3.28084)
                });
            }
        });
        
        // Remove flights no longer in data
        this.flights.forEach((_, id) => {
            if (!seen.has(id)) this.flights.delete(id);
        });
        
        this.updateStats();
    }
    
    updateStats() {
        document.getElementById('flight-count').textContent = this.flights.size;
        if (this.flights.size > 0) {
            const avg = Array.from(this.flights.values()).reduce((s, f) => s + f.altitude, 0) / this.flights.size;
            document.getElementById('avg-altitude').textContent = Math.round(avg).toLocaleString();
        }
    }
    
    latLonToPixel(lat, lon) {
        const pt = this.map.latLngToContainerPoint([lat, lon]);
        return { x: pt.x, y: pt.y };
    }
    
    animate() {
        // Animate trail starts moving toward planes
        this.flights.forEach(f => {
            const speed = 0.003 * this.animationSpeed;
            const dx = f.lat - f.trailStartLat;
            const dy = f.lon - f.trailStartLon;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Keep trail a certain length behind
            const maxDist = 0.15 + (f.velocity / 2000);
            if (dist > maxDist) {
                f.trailStartLat += dx * speed;
                f.trailStartLon += dy * speed;
            }
        });
        
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
    
    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw trails first
        if (this.showTrails) {
            this.flights.forEach(f => this.drawTrail(f));
        }
        
        // Draw planes on top
        this.flights.forEach(f => this.drawPlane(f));
    }
    
    drawTrail(f) {
        const ctx = this.ctx;
        const start = this.latLonToPixel(f.trailStartLat, f.trailStartLon);
        const end = this.latLonToPixel(f.lat, f.lon);
        
        // Gradient: invisible at tail, visible near plane
        const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
        grad.addColorStop(0, 'rgba(100, 180, 255, 0)');
        grad.addColorStop(0.7, 'rgba(100, 180, 255, 0.2)');
        grad.addColorStop(1, 'rgba(140, 210, 255, 0.5)');
        
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
    
    drawPlane(f) {
        const ctx = this.ctx;
        const pos = this.latLonToPixel(f.lat, f.lon);
        
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate((f.heading + 90) * Math.PI / 180);
        
        // Plane shape
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(-3, 5);
        ctx.lineTo(3, 5);
        ctx.closePath();
        ctx.fillStyle = '#4fc3f7';
        ctx.fill();
        
        // Glow
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fill();
        
        ctx.restore();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new FlightTrailsApp();
});
