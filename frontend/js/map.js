// Map visualization for Live Global Cyber Threat Map
// Using Globe.GL with 3D globe visualization

let globe = null;
let isAutoRotate = false;
let isAutoFocus = false;
let autoFocusInterval = null;
let isFocusMode = false;  // True when showing only critical/high
let rotateInterval = null;
let currentArcs = [];
let hitRingsQueue = [];  // Queue for hit animations

// Auto Focus configuration
const AUTO_FOCUS_CONFIG = {
    focusDuration: 15000,  // Show only critical/high for 15 seconds
    normalDuration: 5000,  // Show all for 5 seconds
    focusArcMultiplier: 2.5,  // Make focused arcs larger
    fadeOpacity: 0.15  // Opacity for faded low/medium arcs
};

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
                .arcLabel(d => {
                    // Show more info during focus mode for critical/high
                    const severity = (d.threat.severity || 'medium').toLowerCase();
                    if (isFocusMode && (severity === 'critical' || severity === 'high')) {
                        return `${d.threat.eventname}\n${d.threat.sourcename || 'Unknown'} → ${d.threat.destinationname || 'Unknown'}`;
                    }
                    return d.threat.eventname;
                })
                .arcStartLat(d => d.threat.sourcelat)
                .arcStartLng(d => d.threat.sourcelon)
                .arcEndLat(d => d.threat.destlat)
                .arcEndLng(d => d.threat.destlon)
                .arcDashLength(0.4)   // Longer dash for better visibility
                .arcDashGap(0.2)      // Smaller gap for more continuous look
                .arcDashInitialGap(() => Math.random())  // Random start position
                .arcDashAnimateTime(() => MAP_CONFIG.arcDuration)  // Animation speed
                .arcColor(d => {
                    // Use severity-based coloring for clearer threat visualization
                    const severity = (d.threat.severity || 'medium').toLowerCase();
                    const severityColors = {
                        'critical': '#ff0000',  // Bright red
                        'high': '#ff6600',      // Orange
                        'medium': '#ffaa00',    // Yellow-orange
                        'low': '#888888'        // Gray
                    };
                    const color = severityColors[severity] || '#ffaa00';
                    
                    // Opacity based on severity and focus mode
                    let alphaMap = {
                        'critical': 0.9,
                        'high': 0.7,
                        'medium': 0.5,
                        'low': 0.4
                    };
                    
                    // In focus mode, fade out low/medium and boost critical/high
                    if (isFocusMode) {
                        if (severity === 'critical' || severity === 'high') {
                            alphaMap = { 'critical': 1.0, 'high': 0.9, 'medium': 0.5, 'low': 0.4 };
                        } else {
                            // Fade out low and medium
                            return [`rgba(${hexToRgb(color)}, ${AUTO_FOCUS_CONFIG.fadeOpacity})`, `rgba(${hexToRgb(color)}, ${AUTO_FOCUS_CONFIG.fadeOpacity * 0.5})`];
                        }
                    }
                    
                    const alpha = alphaMap[severity] || 0.5;
                    return [`rgba(${hexToRgb(color)}, ${alpha})`, `rgba(${hexToRgb(color)}, ${alpha * 0.7})`];
                })
                .arcStroke(d => {
                    const baseStroke = calculateArcStroke(d.threat);
                    const severity = (d.threat.severity || 'medium').toLowerCase();
                    
                    // In focus mode, make critical/high arcs larger
                    if (isFocusMode && (severity === 'critical' || severity === 'high')) {
                        return baseStroke * AUTO_FOCUS_CONFIG.focusArcMultiplier;
                    }
                    // In focus mode, make low/medium arcs smaller
                    if (isFocusMode && (severity === 'low' || severity === 'medium')) {
                        return baseStroke * 0.3;
                    }
                    return baseStroke;
                })
                .arcAltitude(d => {
                    // Height based on volume (higher volume = higher arc)
                    const volume = d.threat.volume || 50;
                    const severity = (d.threat.severity || 'medium').toLowerCase();
                    let baseAltitude = 0.15 + (volume / 100) * 0.25;
                    
                    // In focus mode, raise critical/high arcs higher
                    if (isFocusMode && (severity === 'critical' || severity === 'high')) {
                        baseAltitude *= 1.5;
                    }
                    return baseAltitude;
                })
                .arcAltitudeAutoScale(0.4)
                .arcsTransitionDuration(1000)  // 1 second smooth fade transition

                // Ring configuration for hit animations
                .ringColor(() => t => `rgba(255,100,50,${1 - t})`)
                .ringMaxRadius(3)
                .ringPropagationSpeed(2)
                .ringRepeatPeriod(800)

                // Point configuration (impact points)
                .pointColor(d => d.type === 'destination' ? '#ff4444' : getCategoryColor(d.threat ? d.threat.category : 'default'))
                .pointAltitude(0.01)
                .pointRadius(d => d.type === 'destination' ? 0.4 : 0.2)
                .pointsMerge(true)

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

            console.log('✓ Map initialized successfully with Globe.GL (3D Globe mode)');
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
    displayThreats.forEach(threat => {
        // Source point (smaller)
        points.push({
            lat: threat.sourcelat,
            lng: threat.sourcelon,
            type: 'source',
            threat: threat
        });

        // Destination point (larger - this is what we're defending)
        points.push({
            lat: threat.destlat,
            lng: threat.destlon,
            type: 'destination',
            threat: threat
        });
    });

    // Update points data with smooth transition
    globe.pointsData(points);

    // Add hit animation rings at destinations (for high/critical threats)
    const rings = displayThreats
        .filter(t => t.severity.toLowerCase() === 'critical' || t.severity.toLowerCase() === 'high')
        .slice(0, 10)  // Limit to 10 rings for performance
        .map(threat => ({
            lat: threat.destlat,
            lng: threat.destlon,
            maxR: threat.severity.toLowerCase() === 'critical' ? 4 : 2,
            propagationSpeed: 3,
            repeatPeriod: threat.severity.toLowerCase() === 'critical' ? 600 : 1000
        }));

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
 * Toggle auto focus mode
 * Cycles between showing only critical/high (15s) and all attacks (5s)
 */
function toggleAutoFocus() {
    isAutoFocus = !isAutoFocus;

    if (isAutoFocus) {
        startAutoFocus();
    } else {
        stopAutoFocus();
    }

    updateFocusButton();
}

/**
 * Start auto focus cycling
 */
function startAutoFocus() {
    console.log('🎯 Auto Focus enabled - cycling between focus and normal mode');
    
    // Start in focus mode
    setFocusMode(true);

    // Set up the cycling
    runFocusCycle();
}

/**
 * Run the focus cycle
 */
function runFocusCycle() {
    if (!isAutoFocus) return;

    if (isFocusMode) {
        // Currently in focus mode, wait 15 seconds then switch to normal
        autoFocusInterval = setTimeout(() => {
            setFocusMode(false);
            runFocusCycle();
        }, AUTO_FOCUS_CONFIG.focusDuration);
    } else {
        // Currently in normal mode, wait 5 seconds then switch to focus
        autoFocusInterval = setTimeout(() => {
            setFocusMode(true);
            runFocusCycle();
        }, AUTO_FOCUS_CONFIG.normalDuration);
    }
}

/**
 * Set focus mode on or off with smooth fade transition
 */
function setFocusMode(focused) {
    const previousMode = isFocusMode;
    isFocusMode = focused;
    
    if (focused) {
        console.log('🔴 Focus Mode: Highlighting CRITICAL and HIGH threats');
    } else {
        console.log('🟢 Normal Mode: Showing all threats');
    }

    // Smoothly transition arcs by using the built-in transition duration
    if (globe && currentArcs.length > 0) {
        // Set longer transition for smooth fade effect
        globe.arcsTransitionDuration(800);
        
        // Re-apply arcs data to trigger re-render with new styling
        // The arcs will smoothly transition to new colors/sizes
        globe.arcsData(currentArcs);
        
        // Reset transition duration after animation
        setTimeout(() => {
            globe.arcsTransitionDuration(1000);
        }, 850);
    }

    // Update feed styling with CSS transitions
    updateFeedFocusMode(focused);
}

/**
 * Update feed items to match focus mode
 */
function updateFeedFocusMode(focused) {
    const feedItems = document.querySelectorAll('.attack-item');
    feedItems.forEach(item => {
        if (focused) {
            if (item.classList.contains('critical') || item.classList.contains('high')) {
                item.classList.add('focused');
                item.classList.remove('faded');
            } else {
                item.classList.add('faded');
                item.classList.remove('focused');
            }
        } else {
            item.classList.remove('focused', 'faded');
        }
    });
}

/**
 * Stop auto focus cycling
 */
function stopAutoFocus() {
    console.log('🎯 Auto Focus disabled');
    
    if (autoFocusInterval) {
        clearTimeout(autoFocusInterval);
        autoFocusInterval = null;
    }
    
    // Reset to normal mode
    setFocusMode(false);
}

/**
 * Update focus button text
 */
function updateFocusButton() {
    const focusText = document.getElementById('focus-text');
    const focusBtn = document.getElementById('toggle-focus');

    if (focusText) {
        focusText.textContent = isAutoFocus ? 'Disable' : 'Enable';
    }
    
    if (focusBtn) {
        if (isAutoFocus) {
            focusBtn.classList.add('active');
        } else {
            focusBtn.classList.remove('active');
        }
    }
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
    window.toggleAutoRotate = toggleAutoRotate;
    window.toggleAutoFocus = toggleAutoFocus;
    window.highlightNewAttack = highlightNewAttack;
    window.MAP_CONFIG = MAP_CONFIG;
    window.AUTO_FOCUS_CONFIG = AUTO_FOCUS_CONFIG;
    window.calculateArcStroke = calculateArcStroke;
    window.updateCategoryCounts = updateCategoryCounts;
    window.isFocusMode = isFocusMode;
}
