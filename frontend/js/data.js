// Data management for Live Global Cyber Threat Map

let threatData = [];
let filteredData = [];
let currentTimeframe = '24h';
let dataMode = 'test';  // Default to test mode
let riskView = 'threat';  // 'threat' or 'residual'
let isDataLoading = false;
let dataFetchInterval = null;
let isInitialLoad = true;  // Track if this is the first load
let lastDataFetchTime = null;  // Track when data was last fetched successfully
let activeFilters = {
    categories: new Set(),
    severities: new Set(),
    locations: new Set()
};

// Destination IP labels dictionary (loaded from config)
let destinationLabels = {};

// Timeframe definitions (in milliseconds)
const TIMEFRAMES = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000
};

// Data fetch interval (60 seconds)
const DATA_FETCH_INTERVAL = 60 * 1000;

/**
 * Load destination labels from config
 */
async function loadDestinationLabels() {
    try {
        const response = await fetch('/api/info');
        if (response.ok) {
            const data = await response.json();
            // Try to fetch config directly for destination labels
            const configResponse = await fetch('/config.json');
            if (configResponse.ok) {
                const config = await configResponse.json();
                if (config.destinationLabels) {
                    destinationLabels = config.destinationLabels;
                    console.log(`📋 Loaded ${Object.keys(destinationLabels).length} destination IP labels`);
                }
            }
        }
    } catch (error) {
        console.log('ℹ️ Using default destination labels (config not available)');
    }
}

/**
 * Get friendly label for destination IP
 */
function getDestinationLabel(ip) {
    return destinationLabels[ip] || null;
}

/**
 * Fetch threat data from the backend API
 * Uses smooth transitions - no blinking on refresh
 */
async function fetchThreatData() {
    if (isDataLoading) return;

    isDataLoading = true;
    const fetchStartTime = Date.now();

    try {
        console.log(`📡 Fetching ${dataMode} data (timeframe: ${currentTimeframe})...`);
        const response = await fetch(`/api/threats?timeframe=${currentTimeframe}&mode=${dataMode}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const fetchDuration = Date.now() - fetchStartTime;

        if (data.threats && Array.isArray(data.threats)) {
            // Update last fetch time
            lastDataFetchTime = Date.now();
            updateDataModeIndicator();
            
            // Check if we got any data
            if (data.threats.length === 0 && dataMode === 'live') {
                // Show a message for empty live data
                showDataError('No live data available. Switch to Test Data or send data via webhooks.');
                if (isInitialLoad) {
                    hideLoading();
                    isInitialLoad = false;
                }
                console.log(`⚠️ ${dataMode.toUpperCase()} feed: 0 items (${fetchDuration}ms)`);
                return;
            }

            // Parse new data
            const newThreatData = data.threats.map(threat => {
                // Create formatted location names from city/country fields
                const sourcename = (threat.sourcecity && threat.sourcecountry && threat.sourcecity !== 'Unknown')
                    ? `${threat.sourcecity}, ${threat.sourcecountry}`
                    : 'Unknown Location';

                const destinationname = (threat.destinationcity && threat.destinationcountry && threat.destinationcity !== 'Unknown')
                    ? `${threat.destinationcity}, ${threat.destinationcountry}`
                    : 'Unknown Location';

                // Get destination label from dictionary if available
                const destinationLabel = getDestinationLabel(threat.destinationip);

                return {
                    ...threat,
                    timestamp: new Date(threat.timestamp),
                    sourcename,
                    destinationname,
                    destinationLabel,
                    sourcelat: parseFloat(threat.sourcelocation.split(',')[0]),
                    sourcelon: parseFloat(threat.sourcelocation.split(',')[1]),
                    destlat: parseFloat(threat.destinationlocation.split(',')[0]),
                    destlon: parseFloat(threat.destinationlocation.split(',')[1])
                };
            });

            threatData = newThreatData;
            window.threatData = threatData; // Keep global reference in sync
            applyFilters(); // Use centralized filter logic

            // Only hide loading on initial load
            if (isInitialLoad) {
                hideLoading();
                isInitialLoad = false;
            }

            // Enhanced logging with feed details
            const severityCounts = {
                critical: newThreatData.filter(t => t.severity.toLowerCase() === 'critical').length,
                high: newThreatData.filter(t => t.severity.toLowerCase() === 'high').length,
                medium: newThreatData.filter(t => t.severity.toLowerCase() === 'medium').length,
                low: newThreatData.filter(t => t.severity.toLowerCase() === 'low').length
            };
            console.log(`✅ ${dataMode.toUpperCase()} feed: ${threatData.length} items loaded (${fetchDuration}ms)`);
            console.log(`   📊 Severity: Critical=${severityCounts.critical}, High=${severityCounts.high}, Medium=${severityCounts.medium}, Low=${severityCounts.low}`);
            console.log(`   🎯 Filtered: ${filteredData.length} items displayed`);
        }
    } catch (error) {
        console.error(`❌ ${dataMode.toUpperCase()} feed: Error - ${error.message}`);
        if (isInitialLoad || dataMode === 'live') {
            showDataError(`Failed to load ${dataMode} data: ${error.message}`);
            hideLoading();
            isInitialLoad = false;
        }
    } finally {
        isDataLoading = false;
    }
}

/**
 * Apply all active filters (timeframe, category, severity, location)
 */
/**
 * Apply residual risk filter to threat data
 * Residual Risk: Show only allowed threats (filter out blocked threats)
 * When Risk Focus is ON, only threats that were NOT blocked are shown
 */
function applyResidualRisk(threats) {
    if (riskView !== 'residual') return threats;

    // Filter to show only allowed (not blocked) threats
    // These represent actual residual risk that got through defenses
    return threats.filter(threat => {
        // blocked === false or blocked === 'false' means it was allowed
        return threat.blocked === false || threat.blocked === 'false';
    });
}

function applyFilters() {
    // 1. Filter by timeframe first
    const now = new Date();
    const timeframeMs = TIMEFRAMES[currentTimeframe];
    const cutoffTime = new Date(now - timeframeMs);

    let tempFiltered = threatData.filter(threat => threat.timestamp >= cutoffTime);

    // 1.5. Apply residual risk transformation if enabled
    tempFiltered = applyResidualRisk(tempFiltered);

    // 2. Filter by Category - HIDE items in the filter set (NOT operator)
    if (activeFilters.categories.size > 0) {
        tempFiltered = tempFiltered.filter(t => !activeFilters.categories.has(t.category));
    }

    // 3. Filter by Severity - HIDE items in the filter set (NOT operator)
    if (activeFilters.severities.size > 0) {
        tempFiltered = tempFiltered.filter(t => !activeFilters.severities.has(t.severity.toLowerCase()));
    }

    // Capture data before location filtering for Top Attackers list
    // This ensures that even if a location is hidden (filtered out), it remains in the Top 5 list
    // so the user can toggle it back on.
    const dataForTopList = [...tempFiltered];

    // 4. Filter by Source Location - HIDE items in the filter set (NOT operator)
    if (activeFilters.locations.size > 0) {
        tempFiltered = tempFiltered.filter(t => !activeFilters.locations.has(t.sourcename));
    }

    // Sort by timestamp (newest first)
    tempFiltered.sort((a, b) => b.timestamp - a.timestamp);

    filteredData = tempFiltered;
    window.filteredData = filteredData; // Keep global reference in sync

    updateStats();

    // Update visualizations
    if (typeof updateMapData === 'function') {
        updateMapData(filteredData);
    }

    if (typeof updateAttackFeed === 'function') {
        updateAttackFeed(filteredData);
    }

    if (typeof updateTopAttackers === 'function') {
        updateTopAttackers(dataForTopList);
    }

    if (typeof updateTopTargets === 'function') {
        updateTopTargets(filteredData);
    }

    if (typeof updateDebugBar === 'function') {
        updateDebugBar(filteredData.length);
    }
}

/**
 * Toggle a filter
 * @param {string} type - 'category', 'severity', or 'location'
 * @param {string} value - The value to toggle
 */
function toggleFilter(type, value) {
    const set = activeFilters[type === 'location' ? 'locations' : (type === 'severity' ? 'severities' : 'categories')];
    if (!set) return;

    // Normalize severity values to lowercase for consistent comparison
    const normalizedValue = type === 'severity' ? value.toLowerCase() : value;

    if (set.has(normalizedValue)) {
        set.delete(normalizedValue);
    } else {
        set.add(normalizedValue);
    }

    applyFilters();
}

/**
 * Check if a filter is active
 */
function isFilterActive(type, value) {
    const set = activeFilters[type === 'location' ? 'locations' : (type === 'severity' ? 'severities' : 'categories')];
    // Normalize severity values to lowercase for consistent comparison
    const normalizedValue = type === 'severity' ? value.toLowerCase() : value;
    return set && set.has(normalizedValue);
}

/**
 * Show error message to user
 */
function showDataError(message) {
    const feedContent = document.getElementById('feed-content');
    if (feedContent) {
        feedContent.innerHTML = `
            <div class="data-error">
                <p>⚠️ ${message}</p>
            </div>
        `;
    }
}

/**
 * Get color based on category
 */
function getCategoryColor(category) {
    const colors = {
        'Infiltration Attempts': '#ff4444',
        'Phishing Emails': '#ff9944',
        'Botnet Activity': '#ffdd44',
        'Scanning Activity': '#44ff44',
        'Antivirus Malware': '#4444ff',
        'Web Gateway Threats': '#ff44ff'
    };

    return colors[category] || '#ffffff';
}

/**
 * Get color based on severity
 */
function getSeverityColor(severity) {
    const colors = {
        'low': '#666666',
        'medium': '#cc8844',
        'high': '#ff6600',
        'critical': '#ff0000'
    };

    return colors[severity.toLowerCase()] || '#666666';
}

/**
 * Get arc altitude based on volume
 * Higher volume = higher arc
 */
function getArcAltitude(volume) {
    // Scale volume (0-100) to altitude (0.1-0.5)
    return 0.1 + (volume / 100) * 0.4;
}

/**
 * Get arc width based on volume
 */
function getArcWidth(volume) {
    // Scale volume (0-100) to width (1-5)
    return 1 + (volume / 100) * 4;
}

/**
 * Update statistics display
 */
function updateStats() {
    const totalThreats = filteredData.length;
    const criticalThreats = filteredData.filter(t => t.severity.toLowerCase() === 'critical').length;

    const totalEl = document.getElementById('total-threats');
    const criticalEl = document.getElementById('critical-threats');

    if (totalEl) totalEl.textContent = totalThreats;
    if (criticalEl) criticalEl.textContent = criticalThreats;
}

/**
 * Set current timeframe and refresh data
 */
function setTimeframe(timeframe) {
    if (TIMEFRAMES[timeframe]) {
        currentTimeframe = timeframe;
        applyFilters();
    }
}

/**
 * Set data mode (local or public)
 */
function setDataMode(mode) {
    dataMode = mode;
    lastDataFetchTime = null;  // Reset fetch time when changing modes
    updateDataModeIndicator();
    showLoading();
    fetchThreatData();
}

/**
 * Set risk view mode
 */
function setRiskView(mode) {
    riskView = mode;
    console.log(`🎯 Risk view changed to: ${mode}`);
    applyFilters();  // Re-apply filters with new risk view
}

/**
 * Start automatic data fetching
 * Fetches data every 60 seconds with smooth transitions
 */
function startDataFetching() {
    // Initial fetch (shows loading indicator)
    isInitialLoad = true;
    showLoading();
    fetchThreatData();

    // Poll for new data every 60 seconds (no loading indicator on refresh)
    dataFetchInterval = setInterval(() => {
        console.log('🔄 Refreshing threat data (60s interval)...');
        fetchThreatData();
    }, DATA_FETCH_INTERVAL);
}

/**
 * Stop automatic data fetching
 */
function stopDataFetching() {
    if (dataFetchInterval) {
        clearInterval(dataFetchInterval);
        dataFetchInterval = null;
    }
}

/**
 * Show loading indicator
 */
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.remove('hidden');
    }
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.add('hidden');
    }
}

/**
 * Format timestamp for display - shows hours AND minutes
 */
function formatTimestamp(date) {
    const now = new Date();
    const diff = now - date;

    if (diff < 60 * 1000) {
        return 'Just now';
    } else if (diff < 60 * 60 * 1000) {
        const minutes = Math.floor(diff / (60 * 1000));
        return `${minutes}m ago`;
    } else if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        const remainingMinutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
        if (remainingMinutes > 0) {
            return `${hours}h ${remainingMinutes}m ago`;
        }
        return `${hours}h ago`;
    } else {
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        const remainingHours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        if (remainingHours > 0) {
            return `${days}d ${remainingHours}h ago`;
        }
        return `${days}d ago`;
    }
}

/**
 * Get IP location string
 */
function getLocationString(lat, lon, name) {
    if (name && name !== 'Unknown Location') return name;
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

/**
 * Simulate real-time threat updates (for demo mode)
 * This adds variation to existing threats to simulate live updates
 */
function simulateRealTimeUpdates() {
    if (threatData.length === 0) return;

    // Randomly select a threat and create a similar one with current timestamp
    const randomThreat = threatData[Math.floor(Math.random() * threatData.length)];
    const newThreat = {
        ...randomThreat,
        timestamp: new Date(),
        sourceip: randomThreat.sourceip.replace(/\d+$/, Math.floor(Math.random() * 255)),
        volume: Math.floor(Math.random() * 100)
    };

    threatData.unshift(newThreat);
    applyFilters();

    // Highlight the new attack
    if (typeof highlightNewAttack === 'function') {
        highlightNewAttack(newThreat);
    }
}

/**
 * Update the data mode indicator in the header
 * Shows Test (green) or Live with freshness indicator (green/amber/red)
 */
function updateDataModeIndicator() {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    const statusIndicator = document.querySelector('.status-indicator');
    
    if (!statusDot || !statusText || !statusIndicator) return;
    
    if (dataMode === 'test') {
        // Test mode - always green
        statusDot.style.background = '#00ff00';
        statusText.textContent = 'Test';
        statusText.style.color = '#00ff00';
        statusIndicator.style.background = 'rgba(0, 255, 0, 0.1)';
        statusIndicator.style.borderColor = 'rgba(0, 255, 0, 0.3)';
    } else {
        // Live mode - check data freshness
        statusText.textContent = 'Live';
        
        if (!lastDataFetchTime) {
            // No data yet - red
            statusDot.style.background = '#ff4444';
            statusText.style.color = '#ff4444';
            statusIndicator.style.background = 'rgba(255, 68, 68, 0.1)';
            statusIndicator.style.borderColor = 'rgba(255, 68, 68, 0.3)';
        } else {
            const timeSinceLastFetch = Date.now() - lastDataFetchTime;
            const threeMinutes = 3 * 60 * 1000;
            const twoMinutes = 2 * 60 * 1000;
            
            if (timeSinceLastFetch > threeMinutes) {
                // Over 3 minutes - red
                statusDot.style.background = '#ff4444';
                statusText.style.color = '#ff4444';
                statusIndicator.style.background = 'rgba(255, 68, 68, 0.1)';
                statusIndicator.style.borderColor = 'rgba(255, 68, 68, 0.3)';
            } else if (timeSinceLastFetch > twoMinutes) {
                // Over 2 minutes - amber
                statusDot.style.background = '#ffaa00';
                statusText.style.color = '#ffaa00';
                statusIndicator.style.background = 'rgba(255, 170, 0, 0.1)';
                statusIndicator.style.borderColor = 'rgba(255, 170, 0, 0.3)';
            } else {
                // Fresh data - green
                statusDot.style.background = '#00ff00';
                statusText.style.color = '#00ff00';
                statusIndicator.style.background = 'rgba(0, 255, 0, 0.1)';
                statusIndicator.style.borderColor = 'rgba(0, 255, 0, 0.3)';
            }
        }
    }
}

// Start periodic indicator updates (every 10 seconds)
setInterval(updateDataModeIndicator, 10000);

// Export functions for use in other modules
if (typeof window !== 'undefined') {
    window.threatData = threatData;
    window.filteredData = filteredData;
    window.fetchThreatData = fetchThreatData;
    window.setTimeframe = setTimeframe;
    window.setDataMode = setDataMode;
    window.setRiskView = setRiskView;
    window.startDataFetching = startDataFetching;
    window.stopDataFetching = stopDataFetching;
    window.getCategoryColor = getCategoryColor;
    window.getSeverityColor = getSeverityColor;
    window.getArcAltitude = getArcAltitude;
    window.getArcWidth = getArcWidth;
    window.formatTimestamp = formatTimestamp;
    window.getLocationString = getLocationString;
    window.simulateRealTimeUpdates = simulateRealTimeUpdates;
    window.toggleFilter = toggleFilter;
    window.isFilterActive = isFilterActive;
    window.activeFilters = activeFilters;
    window.loadDestinationLabels = loadDestinationLabels;
    window.getDestinationLabel = getDestinationLabel;
    window.destinationLabels = destinationLabels;
    window.updateDataModeIndicator = updateDataModeIndicator;
    window.lastDataFetchTime = lastDataFetchTime;
}
