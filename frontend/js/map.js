// Map visualization for Live Global Cyber Threat Map
// Using Globe.GL with 3D globe visualization

let globe = null;
let isAutoRotate = true;  // Enabled by default
let isAutoFocus = false;   // Disabled by default - Risk Focus toggle
let rotateInterval = null;
let currentArcs = [];
let hitRingsQueue = [];  // Queue for hit animations
let highlightedArcIndex = null;  // Track which arc is currently highlighted

// Risk Focus: When ON shows only residual risk (allowed threats), when OFF shows all threats

// Defensive cities - loaded from config or use defaults
let DEFENSIVE_CITIES = [
    { name: 'Adelaide', lat: -34.9285, lng: 138.6007, size: 0.8 },
    { name: 'Melbourne', lat: -37.8136, lng: 144.9631, size: 0.8 },
    { name: 'Sydney', lat: -33.8688, lng: 151.2093, size: 0.6 },
    { name: 'Brisbane', lat: -27.4698, lng: 153.0251, size: 0.6 },
    { name: 'Perth', lat: -31.9505, lng: 115.8605, size: 0.6 },
    { name: 'Canberra', lat: -35.2809, lng: 149.1300, size: 0.5 },
    { name: 'Hobart', lat: -42.8821, lng: 147.3272, size: 0.5 },
    { name: 'Darwin', lat: -12.4634, lng: 130.8456, size: 0.5 }
];

// Legacy getter for backwards compatibility (returns current DEFENSIVE_CITIES)
function getDefensiveCities() {
    return DEFENSIVE_CITIES;
}

// Load defensive cities and map config from config.json
async function loadDefensiveCitiesFromConfig() {
    try {
        const response = await fetch('/config.json');
        if (response.ok) {
            const config = await response.json();
            if (config.map && config.map.defensiveCities && Array.isArray(config.map.defensiveCities)) {
                DEFENSIVE_CITIES = config.map.defensiveCities;
                console.log('📍 Loaded defensive cities from config:', DEFENSIVE_CITIES.length);
            }
            // Load arc display percentage from config
            if (config.map && config.map.arcDisplayPercentage !== undefined) {
                MAP_CONFIG.arcDisplayPercentage = config.map.arcDisplayPercentage;
                console.log(`📍 Loaded arc display percentage from config: ${MAP_CONFIG.arcDisplayPercentage}%`);
            }
        }
    } catch (e) {
        console.log('ℹ️ Using default defensive cities and arc display percentage');
    }
}

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
    attackerCitiesToShow: 20,  // Number of attacker cities to show on map
    arcDisplayPercentage: 100,  // Percentage of arcs to display (25, 50, or 100)

    // Speed presets
    speeds: {
        slow: { duration: 6000, stagger: 400 },
        normal: { duration: 4000, stagger: 200 },
        fast: { duration: 2000, stagger: 100 }
    },
    currentSpeed: 'normal'
};

// Current arc display stats (for debug console)
let arcDisplayStats = {
    total: 0,
    displayed: 0,
    percentage: 100
};

/**
 * Calculate arc stroke width based on volume AND severity
 * Higher volume + higher severity = thicker lines
 * Critical and High have significantly more emphasis
 */
function calculateArcStroke(threat) {
    const volume = threat.volume || 50;
    const severity = (threat.severity || 'medium').toLowerCase();

    // Base width from volume (0.2 to 0.8) - wider range
    let baseWidth = 0.2 + (volume / 100) * 0.6;

    // Severity multiplier - more emphasis on critical/high
    const severityMultipliers = {
        'low': 0.5,
        'medium': 0.8,
        'high': 2.0,      // Increased from 1.4
        'critical': 3.0   // Increased from 1.8
    };

    const multiplier = severityMultipliers[severity] || 1.0;

    return baseWidth * multiplier;
}


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
                .arcColor((d, i) => {
                    // Use severity-based coloring for clearer threat visualization
                    const severity = (d.threat.severity || 'medium').toLowerCase();
                    const severityColors = {
                        'critical': '#ff0000',  // Bright red
                        'high': '#ff6600',      // Orange
                        'medium': '#cc8844',    // Muted brown/tan (less yellow)
                        'low': '#888888'        // Gray
                    };
                    const color = severityColors[severity] || '#ffaa00';

                    // Check if this arc is highlighted
                    const isHighlighted = highlightedArcIndex !== null && highlightedArcIndex === i;
                    const someArcHighlighted = highlightedArcIndex !== null;

                    if (isHighlighted) {
                        // Make highlighted arc fully opaque and brighter
                        return [`rgba(${hexToRgb(color)}, 1.0)`, `rgba(${hexToRgb(color)}, 1.0)`];
                    }

                    // If another arc is highlighted, fade this one significantly
                    if (someArcHighlighted && !isHighlighted) {
                        return [`rgba(${hexToRgb(color)}, 0.1)`, `rgba(${hexToRgb(color)}, 0.05)`];
                    }

                    // Opacity based on severity and focus mode
                    let alphaMap = {
                        'critical': 0.9,
                        'high': 0.7,
                        'medium': 0.5,
                        'low': 0.4
                    };

                    const alpha = alphaMap[severity] || 0.5;
                    return [`rgba(${hexToRgb(color)}, ${alpha})`, `rgba(${hexToRgb(color)}, ${alpha * 0.7})`];
                })
                .arcStroke((d, i) => {
                    const baseStroke = calculateArcStroke(d.threat);

                    // Check if this arc is highlighted
                    const isHighlighted = highlightedArcIndex !== null && highlightedArcIndex === i;

                    if (isHighlighted) {
                        // Make highlighted arc wider
                        return baseStroke * 2.5;
                    }

                    return baseStroke;
                })
                .arcAltitude(d => {
                    // Height based on volume (higher volume = higher arc)
                    const volume = d.threat.volume || 50;
                    // Increased minimum altitude from 0.15 to 0.25 to prevent clipping
                    return 0.25 + (volume / 100) * 0.3;
                })
                .arcAltitudeAutoScale(0.3)
                .arcsTransitionDuration(1000)  // 1 second smooth fade transition

                // Ring configuration for hit animations
                .ringColor(() => t => `rgba(255,100,50,${1 - t})`)
                .ringMaxRadius(3)
                .ringPropagationSpeed(2)
                .ringRepeatPeriod(800)

                // Point configuration (impact points) - use severity colors only, no cyan
                .pointColor(d => {
                    if (!d.threat) return '#ff4444';
                    const severity = (d.threat.severity || 'medium').toLowerCase();
                    const colors = {
                        'critical': '#ff0000',
                        'high': '#ff6600',
                        'medium': '#cc8844',
                        'low': '#666666'
                    };
                    return colors[severity] || '#ff4444';
                })
                .pointAltitude(0.005)
                .pointRadius(d => d.type === 'destination' ? 0.3 : 0.25)
                .pointsMerge(false)

                // Label configuration for defensive cities (loaded from config)
                .labelsData(DEFENSIVE_CITIES)
                .labelLat(d => d.lat)
                .labelLng(d => d.lng)
                .labelText(d => d.name)
                .labelSize(d => d.size)  // Variable label sizes
                .labelDotRadius(0.3)
                .labelColor(() => '#00aaff')  // Blue for Australian destination cities
                .labelResolution(2)
                .labelAltitude(0.01)

                // Click handlers for points and labels
                .onPointClick((point) => {
                    if (point && point.threat) {
                        // Get the correct city name based on point type
                        const cityName = point.type === 'source' 
                            ? point.threat.sourcecity 
                            : point.threat.destinationcity;
                        if (cityName && typeof getAttacksByCity === 'function' && typeof showCityAttacks === 'function') {
                            const cityAttacks = getAttacksByCity(cityName);
                            const type = point.type === 'destination' ? 'destination' : 'source';
                            // Always show modal, even if empty
                            showCityAttacks(cityName, cityAttacks, type);
                        }
                    }
                })
                .onLabelClick((label) => {
                    // Make cities clickable - show attacks to/from that city
                    console.log('🏙️ Label clicked:', label);

                    if (!label || !label.name) {
                        console.error('Invalid label object:', label);
                        return;
                    }

                    console.log(`Attempting to fetch attacks for city: ${label.name}`);

                    if (typeof getAttacksByCity !== 'function') {
                        console.error('❌ getAttacksByCity is not defined');
                        console.log('Available window functions:', Object.keys(window).filter(k => k.includes('Attack') || k.includes('City')));
                        return;
                    }

                    if (typeof showCityAttacks !== 'function') {
                        console.error('❌ showCityAttacks is not defined');
                        return;
                    }

                    const cityAttacks = getAttacksByCity(label.name);
                    console.log(`✓ Found ${cityAttacks.length} attacks for ${label.name}`);

                    if (cityAttacks.length > 0) {
                        // Determine if this is a source or destination city
                        // Australian cities are destinations, others are sources
                        const isAustralianCity = DEFENSIVE_CITIES.some(c => c.name === label.name);
                        const type = isAustralianCity ? 'destination' : 'source';
                        console.log(`Showing ${type} attacks for ${label.name}`);
                        showCityAttacks(label.name, cityAttacks, type);
                    } else {
                        console.warn(`⚠️ No attacks found for ${label.name}`);
                        // Show modal anyway with empty message
                        if (typeof showCityAttacks === 'function') {
                            const isAustralianCity = DEFENSIVE_CITIES.some(c => c.name === label.name);
                            const type = isAustralianCity ? 'destination' : 'source';
                            showCityAttacks(label.name, [], type);
                        }
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
            globe.controls().autoRotate = isAutoRotate;  // Use default value (true)
            globe.controls().autoRotateSpeed = MAP_CONFIG.rotationSpeed;

            console.log('✓ Map initialized successfully with Globe.GL (3D Globe mode)');
            
            // Enable auto-rotate by default if it's set to true
            if (isAutoRotate) {
                startAutoRotation();
                updateRotateButton();
            }
            
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
    console.log(`🎯 Updating map with ${threats.length} threats`);
    
    // Always update category/severity counts in the legend, even without globe
    updateCategoryCounts(threats);
    
    if (!globe) return;

    // Filter by visible categories
    // Filtering is now done in data.js, so we use threats directly (which is filteredData)
    const visibleThreats = threats;

    // Apply arc display percentage
    const totalThreats = visibleThreats.length;
    const percentage = MAP_CONFIG.arcDisplayPercentage || 100;
    const displayCount = Math.floor(totalThreats * (percentage / 100));
    const displayThreats = visibleThreats.slice(0, displayCount);
    
    // Update stats for debug console
    arcDisplayStats = {
        total: totalThreats,
        displayed: displayThreats.length,
        percentage: percentage
    };
    
    // Update global reference for debug console
    if (typeof window !== 'undefined') {
        window.arcDisplayStats = arcDisplayStats;
    }
    
    if (displayThreats.length < totalThreats) {
        console.log(`⚠️ Displaying ${displayThreats.length} of ${totalThreats} threats as arcs (${percentage}%)`);
    } else {
        console.log(`✓ Displaying all ${displayThreats.length} threats as arcs (${percentage}%)`);
    }

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

    // Schedule single shockwave effects to trigger when arcs arrive at destination
    // Clear any existing ring timers
    if (window.ringTimers) {
        window.ringTimers.forEach(timer => clearTimeout(timer));
    }
    window.ringTimers = [];

    // Start with no rings
    globe.ringsData([]);

    // For each threat, schedule a ring to appear after arc duration
    displayThreats
        .filter(t => {
            const sev = t.severity.toLowerCase();
            return sev === 'critical' || sev === 'high' || sev === 'medium';
        })
        .slice(0, 15)  // Limit to 15 rings for performance
        .forEach((threat, index) => {
            const sev = threat.severity.toLowerCase();
            let maxR, speed;

            if (sev === 'critical') {
                maxR = 5;
                speed = 4;
            } else if (sev === 'high') {
                maxR = 3;
                speed = 3;
            } else { // medium
                maxR = 2;
                speed = 2;
            }

            // Calculate actual arc travel distance in degrees
            const distance = calculateArcDistance(
                threat.sourcelat, threat.sourcelon,
                threat.destlat, threat.destlon
            );

            // Globe.GL arc duration is proportional to distance
            // Base duration from config, scaled by normalized distance
            // Typical max distance on globe is ~180 degrees (half circumference)
            const normalizedDistance = Math.min(distance / 180, 1.0);
            const calculatedArcDuration = MAP_CONFIG.arcDuration * (0.5 + normalizedDistance * 0.5);

            // Schedule ring to appear when arc arrives
            // Add stagger based on index to spread out the effects
            const arcArrivalTime = calculatedArcDuration + (index * MAP_CONFIG.arcStagger);

            const timer = setTimeout(() => {
                const currentRings = globe.ringsData() || [];
                const newRing = {
                    lat: threat.destlat,
                    lng: threat.destlon,
                    maxR: maxR,
                    propagationSpeed: speed,
                    repeatPeriod: 99999999  // Very long period = shows once
                };

                // Add ring
                globe.ringsData([...currentRings, newRing]);

                // Remove ring after it completes (maxR / speed * 1000ms)
                const ringDuration = (maxR / speed) * 1000;
                setTimeout(() => {
                    const rings = globe.ringsData() || [];
                    const filtered = rings.filter(r =>
                        r.lat !== newRing.lat ||
                        r.lng !== newRing.lng ||
                        r.maxR !== newRing.maxR
                    );
                    globe.ringsData(filtered);
                }, ringDuration);
            }, arcArrivalTime);

            window.ringTimers.push(timer);
        });

    // Update map labels for top source cities
    updateMapLabels(threats);

    console.log(`✓ Displayed ${arcs.length} attack arcs, ${points.length} markers`);
}

/**
 * Calculate distance between two points in degrees (simple approximation)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
}

/**
 * Calculate arc distance using Haversine formula (great circle distance)
 * Returns distance in degrees (0-180)
 */
function calculateArcDistance(lat1, lng1, lat2, lng2) {
    const toRad = deg => deg * Math.PI / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Convert radians back to degrees
    return c * 180 / Math.PI;
}

/**
 * Adjust overlapping labels by filtering out nearby duplicates
 * Keeps the label with higher priority (more attacks)
 */
function deduplicateNearbyLabels(labels, minDistance = 3) {
    const filtered = [];
    const sorted = [...labels].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const label of sorted) {
        // Check if this label is too close to any already accepted label
        const tooClose = filtered.some(existing =>
            calculateDistance(label.lat, label.lng, existing.lat, existing.lng) < minDistance
        );

        if (!tooClose) {
            filtered.push(label);
        }
    }

    return filtered;
}

/**
 * Update map labels for top N source cities (based on config)
 */
function updateMapLabels(threats) {
    if (!globe) return;

    // Group by source city (use sourcecity for matching with getAttacksByCity)
    const locationCounts = {};
    threats.forEach(t => {
        // Use sourcecity for the label name (matches getAttacksByCity search)
        const cityName = t.sourcecity || 'Unknown';
        const locKey = `${cityName}|${t.sourcelat}|${t.sourcelon}`;

        if (!locationCounts[locKey]) {
            locationCounts[locKey] = {
                count: 0,
                lat: t.sourcelat,
                lng: t.sourcelon,
                name: cityName  // Use just city name for click matching
            };
        }
        locationCounts[locKey].count++;
    });

    // Sort by count and take top N (from config)
    const numCities = MAP_CONFIG.attackerCitiesToShow || 10;
    const topLocations = Object.values(locationCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, numCities);

    // Combine with static Australian cities
    // Australian cities get highest priority (always shown)
    const australianLabels = DEFENSIVE_CITIES.map(c => ({
        name: c.name,
        lat: c.lat,
        lng: c.lng,
        color: '#00aaff', // Blue for Australian destination cities
        size: c.size,  // Use individual city size
        priority: 1000000 // Highest priority
    }));

    const attackerLabels = topLocations.map(l => ({
        name: l.name,
        lat: l.lat,
        lng: l.lng,
        color: '#ff4444', // Red for attackers
        size: 1.0,
        priority: l.count // Priority based on attack count
    }));

    // Deduplicate nearby labels (keeps higher priority ones)
    const allLabels = [...australianLabels, ...attackerLabels];
    const filteredLabels = deduplicateNearbyLabels(allLabels, 5); // 5 degree minimum spacing

    globe.labelsData(filteredLabels)
        .labelLat(d => d.lat)
        .labelLng(d => d.lng)
        .labelText(d => d.name)
        .labelColor(d => d.color)
        .labelSize(d => d.size)
        .labelDotRadius(0.3)
        .labelResolution(2)
        .labelAltitude(0.01);
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

    // Update severity counts - Residual Risk (RR) and Threat Risk (TR)
    const threatRiskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    const residualRiskCounts = { low: 0, medium: 0, high: 0, critical: 0 };

    threats.forEach(t => {
        // Threat Risk (TR) - all detected threats at their original severity
        const sev = t.severity.toLowerCase();
        if (threatRiskCounts.hasOwnProperty(sev)) {
            threatRiskCounts[sev]++;
        }

        // Residual Risk (RR) - only allowed attacks keep their severity level
        // Blocked attacks don't contribute to residual risk counts
        const isAllowed = (t.blocked === 'No' || t.blocked === false || !t.blocked);
        if (isAllowed && residualRiskCounts.hasOwnProperty(sev)) {
            residualRiskCounts[sev]++;
        }
    });

    // Display both counts in format: (RR / TR)
    Object.keys(threatRiskCounts).forEach(sev => {
        const countEl = document.getElementById(`count-severity-${sev}`);
        if (countEl) {
            countEl.textContent = `(${residualRiskCounts[sev]}/${threatRiskCounts[sev]})`;
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
 * Toggle Risk Focus mode
 * ON: Shows only residual risk (allowed threats that got through)
 * OFF: Shows all threats (both blocked and allowed)
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
 * Enable Focus on Risk - show only residual risk (allowed threats) and toggle off Low filter
 */
function startAutoFocus() {
    console.log('🎯 Focus on Risk enabled - showing only allowed threats (residual risk)');
    
    // Switch to residual risk view (shows only allowed threats)
    if (typeof setRiskView === 'function') {
        setRiskView('residual');
    }

    // Toggle off Low severity filter
    if (typeof toggleFilter === 'function') {
        // Only add Low to filter if it's not already filtered
        if (!isFilterActive('severity', 'low')) {
            toggleFilter('severity', 'low');
        }
    }

    // Smoothly transition arcs
    if (globe && currentArcs.length > 0) {
        globe.arcsTransitionDuration(800);
        globe.arcsData(currentArcs);
        setTimeout(() => {
            globe.arcsTransitionDuration(1000);
        }, 850);
    }
}

/**
 * Disable Focus on Risk - show all threats and restore Low filter
 */
function stopAutoFocus() {
    console.log('🎯 Focus on Risk disabled - showing all threats');

    // Switch to threat view (shows all threats)
    if (typeof setRiskView === 'function') {
        setRiskView('threat');
    }

    // Remove Low from severity filter if it was filtered
    if (typeof toggleFilter === 'function' && typeof isFilterActive === 'function') {
        if (isFilterActive('severity', 'low')) {
            toggleFilter('severity', 'low');
        }
    }

    // Smoothly transition arcs
    if (globe && currentArcs.length > 0) {
        globe.arcsTransitionDuration(800);
        globe.arcsData(currentArcs);
        setTimeout(() => {
            globe.arcsTransitionDuration(1000);
        }, 850);
    }
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
 * Highlight a specific arc by threat index
 * Ensures proper matching between feed items and arcs
 */
function highlightArc(threatIndex) {
    if (!globe || !currentArcs) {
        console.warn('Globe or arcs not ready for highlighting');
        return;
    }

    // Validate index is within bounds
    if (threatIndex < 0 || threatIndex >= currentArcs.length) {
        console.warn(`Arc index ${threatIndex} out of bounds (0-${currentArcs.length - 1})`);
        return;
    }

    highlightedArcIndex = threatIndex;
    console.log(`Highlighting arc ${threatIndex} of ${currentArcs.length}`);

    // Set smooth transition for highlighting
    globe.arcsTransitionDuration(300);

    // Re-render arcs with updated styling
    globe.arcsData(currentArcs);

    // Reset transition duration after animation
    setTimeout(() => {
        if (globe) globe.arcsTransitionDuration(1000);
    }, 350);
}

/**
 * Remove arc highlighting
 */
function unhighlightArcs() {
    if (!globe) return;

    highlightedArcIndex = null;

    // Set smooth transition for unhighlighting
    globe.arcsTransitionDuration(300);

    // Re-render arcs with normal styling
    globe.arcsData(currentArcs);

    // Reset transition duration after animation
    setTimeout(() => {
        if (globe) globe.arcsTransitionDuration(1000);
    }, 350);
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
    window.highlightArc = highlightArc;
    window.unhighlightArcs = unhighlightArcs;
    window.MAP_CONFIG = MAP_CONFIG;
    window.AUTO_FOCUS_CONFIG = AUTO_FOCUS_CONFIG;
    window.calculateArcStroke = calculateArcStroke;
    window.updateCategoryCounts = updateCategoryCounts;
    window.isFocusMode = isFocusMode;
    window.loadDefensiveCitiesFromConfig = loadDefensiveCitiesFromConfig;
    window.DEFENSIVE_CITIES = DEFENSIVE_CITIES;
    window.arcDisplayStats = arcDisplayStats;
}
