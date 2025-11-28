// Map visualization for Live Global Cyber Threat Map
// Using Globe.GL with proper arc animations

let globe = null;
let is3DMode = true;  // Start in 3D mode (globe view)
let isAutoRotate = false;
let rotateInterval = null;
let currentArcs = [];
let hitRingsQueue = [];  // Queue for hit animations

// Map configuration
const MAP_CONFIG = {
    centerLat: -25.0,  // Center on Australia
    centerLon: 133.0,
    defaultZoom: 4000000,
    globeZoom: 20000000,
    rotationSpeed: 0.75,  // Increased by 1.5x (was 0.5)
    arcDuration: 4000,  // Normal speed: 4 seconds (in ms)
    arcStagger: 200,    // Normal stagger: 200ms
    maxArcsDisplayed: 50,

    // Speed presets
    speeds: {
        slow: { duration: 6000, stagger: 400 },
        normal: { duration: 4000, stagger: 200 },
        fast: { duration: 2000, stagger: 100 }
    },
    currentSpeed: 'normal'
};

/**
 * Calculate arc stroke width based on volume AND severity
 * Higher volume + higher severity = thicker lines
 * Made narrower minimum width for better visual variety
 */
function calculateArcStroke(threat) {
    const volume = threat.volume || 50;
    const severity = (threat.severity || 'medium').toLowerCase();

    // Base width from volume (0.1 to 0.6) - narrower range
    let baseWidth = 0.1 + (volume / 100) * 0.5;

    // Severity multiplier
    const severityMultipliers = {
        'low': 0.6,
        'medium': 1.0,
        'high': 1.4,
        'critical': 1.8
    };

    const multiplier = severityMultipliers[severity] || 1.0;

    return baseWidth * multiplier;
}

// Australian major cities for labels
const AUSTRALIAN_CITIES = [
    { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
    { name: 'Melbourne', lat: -37.8136, lng: 144.9631 },
    { name: 'Brisbane', lat: -27.4698, lng: 153.0251 },
    { name: 'Perth', lat: -31.9505, lng: 115.8605 },
    { name: 'Adelaide', lat: -34.9285, lng: 138.6007 },
    { name: 'Canberra', lat: -35.2809, lng: 149.1300 }
];

/**
 * Convert hex color to RGB string for rgba() usage
 */
function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
}

/**
 * Initialize Globe.GL map with proper arc animation
 */
function initMap() {
    return new Promise((resolve, reject) => {
        try {
            const container = document.getElementById('globeViz');

            // Create Globe instance using the working pattern
            globe = new Globe(container)
                // Use a brighter, clearer Earth texture
                .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
                .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
                .backgroundColor('#000000')  // Pure black background
                .atmosphereColor('#4488ff')
                .atmosphereAltitude(0.15)
                .showAtmosphere(true)

                // Arc configuration with dash animation
                .arcLabel(d => d.threat.eventname)
                .arcStartLat(d => d.threat.sourcelat)
                .arcStartLng(d => d.threat.sourcelon)
                .arcEndLat(d => d.threat.destlat)
                .arcEndLng(d => d.threat.destlon)
                .arcDashLength(0.4)   // Longer dash for better visibility
                .arcDashGap(0.2)      // Smaller gap for more continuous look
                .arcDashInitialGap(() => Math.random())  // Random start position
                .arcDashAnimateTime(() => MAP_CONFIG.arcDuration)  // Animation speed
                .arcColor(d => {
                    const color = getCategoryColor(d.threat.category);
                    const severity = d.threat.severity.toLowerCase();
                    // Opacity based on severity for better visual hierarchy
                    const alphaMap = {
                        'critical': 0.7,
                        'high': 0.5,
                        'medium': 0.35,
                        'low': 0.35
                    };
                    const alpha = alphaMap[severity] || 0.35;
                    return [`rgba(${hexToRgb(color)}, ${alpha})`, `rgba(${hexToRgb(color)}, ${alpha * 0.6})`];
                })
                .arcStroke(d => calculateArcStroke(d.threat))
                .arcAltitude(d => {
                    // Height based on volume (higher volume = higher arc)
                    // Also ensure arcs don't go too low (to avoid passing through Antarctica)
                    const volume = d.threat.volume || 50;
                    // Minimum altitude 0.15 to keep arcs above Antarctica region
                    return 0.15 + (volume / 100) * 0.25;
                })
                .arcAltitudeAutoScale(0.4)
                .arcsTransitionDuration(1000)  // 1 second smooth fade transition

                // Ring configuration for hit animations
                // Dynamic color based on severity (set per ring in updateMapData)
                .ringColor(d => {
                    // If ring has severity info, use dynamic colors
                    if (d.severity) {
                        const isCritical = d.severity.toLowerCase() === 'critical';
                        const baseColor = isCritical ? '255,50,50' : '255,150,50'; // Red for critical, orange for high
                        return t => `rgba(${baseColor},${Math.pow(1 - t, 0.5)})`; // Slower fade
                    }
                    // Default color
                    return t => `rgba(255,100,50,${1 - t})`;
                })
                .ringMaxRadius(d => d.maxR || 3)
                .ringPropagationSpeed(d => d.propagationSpeed || 2)
                .ringRepeatPeriod(d => d.repeatPeriod || 800)

                // Point configuration (impact points)
                .pointColor(d => {
                    if (d.type === 'destination' && d.threat) {
                        const severity = d.threat.severity.toLowerCase();
                        // Brighter colors for high/critical destinations
                        if (severity === 'critical') return '#ff0000'; // Bright red
                        if (severity === 'high') return '#ff6600'; // Orange-red
                    }
                    return d.type === 'destination' ? '#ff4444' : getCategoryColor(d.threat ? d.threat.category : 'default');
                })
                .pointAltitude(d => {
                    // Slightly elevated for high/critical to stand out
                    if (d.type === 'destination' && d.threat) {
                        const severity = d.threat.severity.toLowerCase();
                        if (severity === 'critical') return 0.02;
                        if (severity === 'high') return 0.015;
                    }
                    return 0.01;
                })
                .pointRadius(d => {
                    if (d.type === 'destination' && d.threat) {
                        const severity = d.threat.severity.toLowerCase();
                        // Larger points for high/critical threats
                        if (severity === 'critical') return 0.6; // Much larger
                        if (severity === 'high') return 0.5; // Larger
                    }
                    return d.type === 'destination' ? 0.4 : 0.2;
                })
                .pointsMerge(true)  // Merge points at same location to prevent Z-fighting

                // Label configuration for Australian cities (smaller font)
                .labelsData(AUSTRALIAN_CITIES)
                .labelLat(d => d.lat)
                .labelLng(d => d.lng)
                .labelText(d => d.name)
                .labelSize(0.8)  // Smaller labels
                .labelDotRadius(0.3)
                .labelColor(() => '#00ffff')
                .labelResolution(2)
                .labelAltitude(0.01)

                // Click handler
                .onArcClick((arc) => {
                    if (arc && arc.threat && typeof showAttackDetails === 'function') {
                        showAttackDetails(arc.threat);
                    }
                })
                .onPointClick((point) => {
                    if (point && point.threat && typeof showAttackDetails === 'function') {
                        showAttackDetails(point.threat);
                    }
                });

            // Set initial view centered on Australia (3D globe mode)
            globe.pointOfView({
                lat: MAP_CONFIG.centerLat,
                lng: MAP_CONFIG.centerLon,
                altitude: 2.5
            }, 0);

            // Configure controls
            globe.controls().enableZoom = true;
            globe.controls().autoRotate = false;
            globe.controls().autoRotateSpeed = MAP_CONFIG.rotationSpeed;

            // Update button to reflect initial state (3D mode)
            updateViewButton();

            console.log('✓ Map initialized successfully with Globe.GL');
            resolve();
        } catch (error) {
            console.error('✗ Error initializing map:', error);
            reject(error);
        }
    });
}

/**
 * Update map with new threat data
 * Uses smooth transitions - arcs fade in/out instead of blinking
 */
function updateMapData(threats) {
    if (!globe) return;

    console.log(`🎯 Updating map with ${threats.length} threats`);

    // Filter by visible categories
    // Filtering is now done in data.js, so we use threats directly (which is filteredData)
    const visibleThreats = threats;

    // Limit the number of displayed arcs
    const displayThreats = visibleThreats.slice(0, MAP_CONFIG.maxArcsDisplayed);

    // Convert threats to arc data format
    const arcs = displayThreats.map(threat => ({
        threat: threat
    }));

    currentArcs = arcs;

    // Update arcs data with transition duration for smooth fade
    // The arcsTransitionDuration is set in initMap to 300ms for smooth transitions
    globe.arcsData(arcs);

    // Create points for source and destination
    const points = [];

    // Track destination points to avoid flickering when multiple threats target same location
    const destinationMap = new Map();

    displayThreats.forEach(threat => {
        // Source point (smaller)
        points.push({
            lat: threat.sourcelat,
            lng: threat.sourcelon,
            type: 'source',
            threat: threat
        });

        // Destination point - deduplicate by location, keep highest severity
        const destKey = `${threat.destlat.toFixed(6)},${threat.destlon.toFixed(6)}`;
        const existingDest = destinationMap.get(destKey);

        if (!existingDest) {
            // New destination
            destinationMap.set(destKey, {
                lat: threat.destlat,
                lng: threat.destlon,
                type: 'destination',
                threat: threat
            });
        } else {
            // Destination already exists - keep the higher severity
            const severityWeight = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
            const currentWeight = severityWeight[threat.severity.toLowerCase()] || 0;
            const existingWeight = severityWeight[existingDest.threat.severity.toLowerCase()] || 0;

            if (currentWeight > existingWeight) {
                // Replace with higher severity threat
                destinationMap.set(destKey, {
                    lat: threat.destlat,
                    lng: threat.destlon,
                    type: 'destination',
                    threat: threat
                });
            }
        }
    });

    // Add all unique destination points to the points array
    destinationMap.forEach(point => points.push(point));

    // Update points data with smooth transition
    globe.pointsData(points);

    // Add hit animation rings at destinations (for high/critical threats)
    // Create multi-layered rings for enhanced visual impact
    const rings = [];

    displayThreats
        .filter(t => t.severity.toLowerCase() === 'critical' || t.severity.toLowerCase() === 'high')
        .slice(0, 10)  // Limit to prevent performance issues
        .forEach(threat => {
            const isCritical = threat.severity.toLowerCase() === 'critical';

            if (isCritical) {
                // CRITICAL: Triple-ring burst effect with large radius and fast propagation
                // Outer ring - large and dramatic
                rings.push({
                    lat: threat.destlat,
                    lng: threat.destlon,
                    maxR: 8,  // Much larger radius
                    propagationSpeed: 4,  // Very fast
                    repeatPeriod: 500,  // Very frequent
                    severity: threat.severity
                });

                // Middle ring - medium size, offset timing
                rings.push({
                    lat: threat.destlat,
                    lng: threat.destlon,
                    maxR: 5,
                    propagationSpeed: 3.5,
                    repeatPeriod: 550,  // Slightly offset
                    severity: threat.severity
                });

                // Inner ring - smaller, creates layered effect
                rings.push({
                    lat: threat.destlat,
                    lng: threat.destlon,
                    maxR: 3,
                    propagationSpeed: 3,
                    repeatPeriod: 600,  // More offset
                    severity: threat.severity
                });
            } else {
                // HIGH: Double-ring effect with moderate impact
                // Outer ring
                rings.push({
                    lat: threat.destlat,
                    lng: threat.destlon,
                    maxR: 4,
                    propagationSpeed: 2.5,
                    repeatPeriod: 800,
                    severity: threat.severity
                });

                // Inner ring
                rings.push({
                    lat: threat.destlat,
                    lng: threat.destlon,
                    maxR: 2.5,
                    propagationSpeed: 2,
                    repeatPeriod: 900,  // Slightly offset
                    severity: threat.severity
                });
            }
        });

    globe.ringsData(rings);

    // Update category counts in legend
    // We don't need to update counts here as they should be updated by the UI based on filtered data
    // But we might want to update the numbers in the legend to reflect current view
    if (typeof updateCategoryCounts === 'function') {
        updateCategoryCounts(threats);
    }

    // Update map labels for top source cities
    updateMapLabels(threats);

    console.log(`✓ Displayed ${arcs.length} attack arcs, ${points.length} markers, ${rings.length} hit rings`);
}

/**
 * Update map labels for top 10 source cities
 */
function updateMapLabels(threats) {
    if (!globe) return;

    // Group by source location
    const locationCounts = {};
    threats.forEach(t => {
        // Use sourcename if available (City, Country), otherwise fallback to coords
        const locKey = t.sourcename || `${t.sourcelat},${t.sourcelon}`;

        if (!locationCounts[locKey]) {
            locationCounts[locKey] = {
                count: 0,
                lat: t.sourcelat,
                lng: t.sourcelon,
                name: locKey
            };
        }
        locationCounts[locKey].count++;
    });

    // Sort by count and take top 10
    const topLocations = Object.values(locationCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Combine with static Australian cities
    // We want to keep Australian cities always visible as they are destinations?
    // Or just show top sources? The requirement says "Top 10 source cities".
    // I'll merge them but maybe prioritize source cities.

    const labels = [
        ...AUSTRALIAN_CITIES.map(c => ({ ...c, color: '#00ffff', size: 0.8 })), // Keep AU cities blue
        ...topLocations.map(l => ({
            name: l.name,
            lat: l.lat,
            lng: l.lng,
            color: '#ff4444', // Red for attackers
            size: 1.0
        }))
    ];

    globe.labelsData(labels)
        .labelColor(d => d.color)
        .labelSize(d => d.size);
}

/**
 * Update category counts in the legend
 */
function updateCategoryCounts(threats) {
    const categories = {
        'Infiltration Attempts': 0,
        'Phishing Emails': 0,
        'Botnet Activity': 0,
        'Scanning Activity': 0,
        'Antivirus Malware': 0,
        'Web Gateway Threats': 0
    };

    threats.forEach(t => {
        if (categories.hasOwnProperty(t.category)) {
            categories[t.category]++;
        }
    });

    // Update DOM elements
    Object.keys(categories).forEach(category => {
        const countEl = document.getElementById(`count-${category.replace(/\s+/g, '-').toLowerCase()}`);
        if (countEl) {
            countEl.textContent = `(${categories[category]})`;
        }
    });

    // Also update severity counts
    const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    threats.forEach(t => {
        const sev = t.severity.toLowerCase();
        if (severityCounts.hasOwnProperty(sev)) {
            severityCounts[sev]++;
        }
    });

    Object.keys(severityCounts).forEach(sev => {
        const countEl = document.getElementById(`count-severity-${sev}`);
        if (countEl) {
            countEl.textContent = `(${severityCounts[sev]})`;
        }
    });
}

/**
 * Toggle between 3D globe and flat map view
 */
function toggleView() {
    is3DMode = !is3DMode;

    if (is3DMode) {
        // Switch to 3D globe view
        globe.globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
            .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
            .showAtmosphere(true);

        globe.pointOfView({
            lat: MAP_CONFIG.centerLat,
            lng: MAP_CONFIG.centerLon,
            altitude: 2.5
        }, 1500);
    } else {
        // Switch to Flat Map view
        // We disable atmosphere and zoom very close to simulate a flat projection
        globe.showAtmosphere(false);

        globe.pointOfView({
            lat: MAP_CONFIG.centerLat,
            lng: MAP_CONFIG.centerLon,
            altitude: 0.01 // Very close to surface to simulate flat map
        }, 1500);
    }

    updateViewButton();
}

/**
 * Toggle auto-rotation mode
 */
function toggleAutoRotate() {
    isAutoRotate = !isAutoRotate;

    if (isAutoRotate) {
        startAutoRotation();
    } else {
        stopAutoRotation();
    }

    updateRotateButton();
}

/**
 * Start automatic rotation
 */
function startAutoRotation() {
    if (!globe) return;

    // Enable continuous rotation with 1.5x speed
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = MAP_CONFIG.rotationSpeed;

    console.log('Auto-rotation enabled at speed:', MAP_CONFIG.rotationSpeed);
}

/**
 * Stop automatic rotation
 */
function stopAutoRotation() {
    if (!globe) return;

    // Disable rotation
    globe.controls().autoRotate = false;

    console.log('Auto-rotation disabled');
}

/**
 * Highlight a new attack with animation
 */
function highlightNewAttack(threat) {
    if (!globe) return;

    // Add temporary highlight ring at destination
    const currentRings = globe.ringsData() || [];
    const newRing = {
        lat: threat.destlat,
        lng: threat.destlon,
        maxR: 6,
        propagationSpeed: 4,
        repeatPeriod: 500
    };

    globe.ringsData([...currentRings, newRing]);

    // Remove the highlight ring after 3 seconds
    setTimeout(() => {
        const rings = globe.ringsData().filter(r =>
            r.lat !== threat.destlat || r.lng !== threat.destlon || r.maxR !== 6
        );
        globe.ringsData(rings);
    }, 3000);
}

/**
 * Update view toggle button text
 */
function updateViewButton() {
    const viewIcon = document.getElementById('view-icon');
    const viewText = document.getElementById('view-text');

    if (viewIcon && viewText) {
        if (is3DMode) {
            // Currently in 3D mode, button shows option to switch to flat map
            viewIcon.textContent = '🗺️';
            viewText.textContent = 'Flat Map';
        } else {
            // Currently in flat map mode, button shows option to switch to 3D
            viewIcon.textContent = '🌍';
            viewText.textContent = '3D Globe';
        }
    }
}

/**
 * Update rotate button text
 */
function updateRotateButton() {
    const rotateText = document.getElementById('rotate-text');

    if (rotateText) {
        rotateText.textContent = isAutoRotate ? 'Disable' : 'Enable';
    }
}

/**
 * Resize globe when window resizes
 */
window.addEventListener('resize', () => {
    if (globe) {
        const container = document.getElementById('globeViz');
        if (container) {
            globe.width(container.clientWidth);
            globe.height(container.clientHeight);
        }
    }
});

// Export functions
if (typeof window !== 'undefined') {
    window.initMap = initMap;
    window.updateMapData = updateMapData;
    window.toggleView = toggleView;
    window.toggleAutoRotate = toggleAutoRotate;
    window.highlightNewAttack = highlightNewAttack;
    window.MAP_CONFIG = MAP_CONFIG;
    window.calculateArcStroke = calculateArcStroke;
    window.updateCategoryCounts = updateCategoryCounts;
}
