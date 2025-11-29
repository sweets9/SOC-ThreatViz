// UI Control Logic for Live Global Cyber Threat Map

let settingsVisible = false;
// Note: is3DMode and isAutoRotate are defined in map.js as the authoritative source

/**
 * Initialize UI controls
 */
function initUI() {
    setupControlListeners();
    setupKeyboardShortcuts();
    
    // Set up debug console link
    const debugConsoleLink = document.getElementById('debug-console-link');
    if (debugConsoleLink) {
        debugConsoleLink.addEventListener('click', () => {
            showDebugConsole();
        });
    }
    
    // Set up event delegation for feed content clicks (once, handles all dynamic content including services)
    const feedContent = document.getElementById('feed-content');
    if (feedContent && !feedContent.hasAttribute('data-delegation-setup')) {
        feedContent.setAttribute('data-delegation-setup', 'true');
        feedContent.addEventListener('click', (e) => {
            // Check if clicked element or its parent is a clickable filter
            const clickableElement = e.target.closest('.clickable-filter');
            
            if (clickableElement) {
                e.stopPropagation(); // Prevent triggering the parent attack-item click
                e.preventDefault();
                const filterType = clickableElement.dataset.filterType;
                const filterValue = clickableElement.dataset.filterValue;
                const filterLabel = clickableElement.dataset.filterLabel;
                const filterCountry = clickableElement.dataset.filterCountry;
                
                console.log('Clickable element clicked:', filterType, filterValue, filterCountry); // Debug log
                
                if (filterType) {
                    if (filterType === 'host') {
                        showFilteredAttacks(filterType, filterValue, { label: filterLabel });
                    } else if (filterType === 'location') {
                        // Handle location filter - use showCityAttacks for cities (with pivots), showFilteredAttacks for countries only
                        if (filterValue && filterValue.trim() !== '') {
                            // City specified - use showCityAttacks with pivots (same as map clicks)
                            // Determine if this is source or destination based on title attribute
                            const title = clickableElement.getAttribute('title') || '';
                            const isDestination = title.toLowerCase().includes('to');
                            const type = isDestination ? 'destination' : 'source';
                            
                            // Use getAttacksByCity to get filtered attacks, then show with pivots
                            if (typeof getAttacksByCity === 'function' && typeof showCityAttacks === 'function') {
                                const cityAttacks = getAttacksByCity(filterValue, type);
                                showCityAttacks(filterValue, cityAttacks, type);
                            } else {
                                // Fallback if functions not available
                                showFilteredAttacks(filterType, filterValue || '', { country: filterCountry || '' });
                            }
                        } else if (filterCountry && filterCountry.trim() !== '') {
                            // Only country specified - use showFilteredAttacks (country-wide view)
                            showFilteredAttacks(filterType, filterValue || '', { country: filterCountry || '' });
                        } else {
                            // Fallback to showFilteredAttacks
                            showFilteredAttacks(filterType, filterValue || '', { country: filterCountry || '' });
                        }
                    } else if (filterValue) {
                        showFilteredAttacks(filterType, filterValue);
                    }
                    return; // Don't proceed to show attack details
                }
            }
            
            // If not a clickable filter, check if it's an attack item
            const attackItem = e.target.closest('.attack-item');
            if (attackItem && !clickableElement) {
                const index = parseInt(attackItem.dataset.index);
                if (index !== undefined && window.recentThreats && window.recentThreats[index]) {
                    showAttackDetails(window.recentThreats[index]);
                }
            }
        });
    }

    // Initialize tooltips or other UI components if needed
    console.log('UI initialized');
}

/**
 * Setup event listeners for UI controls
 */
function setupControlListeners() {
    // Settings toggle button
    const toggleSettingsBtn = document.getElementById('toggle-settings');
    if (toggleSettingsBtn) {
        toggleSettingsBtn.addEventListener('click', () => {
            toggleSettingsPanel();
        });
    }

    // Auto-rotate toggle
    const toggleRotateBtn = document.getElementById('toggle-rotate');
    if (toggleRotateBtn) {
        toggleRotateBtn.addEventListener('click', () => {
            if (typeof toggleAutoRotate === 'function') {
                toggleAutoRotate();
            }
        });
    }

    // Auto-focus toggle
    const toggleFocusBtn = document.getElementById('toggle-focus');
    
    // Arc display percentage selector
    const arcDisplaySelect = document.getElementById('arc-display-percentage');
    if (arcDisplaySelect) {
        // Set initial value from config (will be updated after config loads)
        const updateArcDisplaySelect = () => {
            if (window.MAP_CONFIG && window.MAP_CONFIG.arcDisplayPercentage) {
                arcDisplaySelect.value = window.MAP_CONFIG.arcDisplayPercentage;
            }
        };
        
        // Try to set immediately
        updateArcDisplaySelect();
        
        // Also set after a short delay to ensure config is loaded
        setTimeout(updateArcDisplaySelect, 1000);
        
        arcDisplaySelect.addEventListener('change', (e) => {
            const percentage = parseInt(e.target.value, 10);
            if (window.MAP_CONFIG) {
                window.MAP_CONFIG.arcDisplayPercentage = percentage;
                console.log(`📊 Arc display percentage changed to ${percentage}%`);
                
                // Refresh map data if available
                if (window.filteredData && typeof window.updateMapData === 'function') {
                    window.updateMapData(window.filteredData);
                }
            }
        });
    }
    if (toggleFocusBtn) {
        toggleFocusBtn.addEventListener('click', () => {
            if (typeof toggleAutoFocus === 'function') {
                toggleAutoFocus();
            }
        });
    }

    // Timeframe buttons
    const timeframeBtns = document.querySelectorAll('.btn-timeframe');
    timeframeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            timeframeBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked
            btn.classList.add('active');

            const timeframe = btn.dataset.timeframe;
            if (typeof setTimeframe === 'function') {
                setTimeframe(timeframe);
            }
        });
    });

    // Data mode select
    const dataModeSelect = document.getElementById('data-mode');
    if (dataModeSelect) {
        dataModeSelect.addEventListener('change', (e) => {
            const mode = e.target.value;
            if (typeof setDataMode === 'function') {
                setDataMode(mode);
            }
        });
    }

    // Theme selector
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
        themeSelector.addEventListener('change', (e) => {
            setTheme(e.target.value);
        });
        // Apply saved theme on load
        const savedTheme = localStorage.getItem('soc-theme') || 'crimson';
        themeSelector.value = savedTheme;
        setTheme(savedTheme);
    }


    // Status indicator click to pause/unpause feed
    const statusIndicator = document.querySelector('.status-indicator');
    if (statusIndicator) {
        statusIndicator.style.cursor = 'pointer';
        statusIndicator.addEventListener('click', () => {
            toggleFeedPause();
        });
    }

    // Modal close button
    const modalClose = document.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            closeModal();
        });
    }

    // Close modal when clicking outside
    const modal = document.getElementById('attack-modal');
    if (modal) {
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Category legend click handlers for filtering
    const categoryItems = document.querySelectorAll('.legend-item.clickable:not([data-severity])');
    categoryItems.forEach(item => {
        item.addEventListener('click', () => {
            const category = item.dataset.category;
            if (category && typeof toggleFilter === 'function') {
                toggleFilter('category', category);

                // Update UI state
                if (typeof isFilterActive === 'function' && isFilterActive('category', category)) {
                    item.classList.add('disabled');
                } else {
                    item.classList.remove('disabled');
                }
            }
        });
    });

    // Severity legend click handlers for filtering
    const severityItems = document.querySelectorAll('.legend-item.clickable[data-severity]');
    severityItems.forEach(item => {
        item.addEventListener('click', () => {
            const severity = item.dataset.severity;
            if (severity && typeof toggleFilter === 'function') {
                toggleFilter('severity', severity);

                // Update UI state
                if (typeof isFilterActive === 'function' && isFilterActive('severity', severity)) {
                    item.classList.add('disabled');
                } else {
                    item.classList.remove('disabled');
                }
            }
        });
    });
}

/**
 * Toggle settings panel visibility
 */
function toggleSettingsPanel() {
    const controlsPanel = document.getElementById('controls-panel');
    const sidebar = document.getElementById('attack-sidebar');
    const mapContainer = document.getElementById('map-container');

    settingsVisible = !settingsVisible;

    if (controlsPanel) {
        if (settingsVisible) {
            controlsPanel.classList.add('visible');
            controlsPanel.classList.remove('hidden');
            // Adjust positions when settings shown
            if (sidebar) sidebar.style.top = '130px';
            if (mapContainer) mapContainer.style.top = '130px';
        } else {
            controlsPanel.classList.remove('visible');
            controlsPanel.classList.add('hidden');
            // Adjust positions when settings hidden
            if (sidebar) sidebar.style.top = '70px';
            if (mapContainer) mapContainer.style.top = '70px';
        }
    }
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'r':
            case 'R':
                if (typeof toggleAutoRotate === 'function') {
                    toggleAutoRotate();
                }
                break;
            case 's':
            case 'S':
                toggleSettingsPanel();
                break;
        }
    });
}

/**
 * Update the attack feed with new data
 */
function updateAttackFeed(threats) {
    const feedContent = document.getElementById('feed-content');
    if (!feedContent) return;

    // Clear existing content if it's a full refresh
    // For smoother updates, we might want to prepend instead
    // But for now, let's just rebuild the top 50

    // Only update if not paused
    if (window.feedPaused) return;

    // Take top 50 recent threats
    const recentThreats = threats.slice(0, 50);

    let html = '';
    if (recentThreats.length === 0) {
        html = '<div class="empty-feed">No threats detected in current timeframe</div>';
    } else {
        recentThreats.forEach((threat, index) => {
            html += createAttackItemHTML(threat, index);
        });
    }

    feedContent.innerHTML = html;

    // Store recent threats for click handler access
    window.recentThreats = recentThreats;

    // Add hover listeners to items for arc highlighting
    const items = feedContent.querySelectorAll('.attack-item');
    items.forEach(item => {
        const index = parseInt(item.dataset.index);

        // Hover handler - highlight corresponding arc
        item.addEventListener('mouseenter', () => {
            if (index !== undefined && typeof highlightArc === 'function') {
                console.log(`Feed item ${index} hovered - highlighting arc`);
                highlightArc(index);
            }
        });

        item.addEventListener('mouseleave', () => {
            if (typeof unhighlightArcs === 'function') {
                unhighlightArcs();
            }
        });
    });

    // Update animation speed based on volume of threats
    updateFeedSpeed(recentThreats.length > 0 ?
        recentThreats.reduce((acc, t) => acc + t.volume, 0) / recentThreats.length : 0);
}

/**
 * Update debug bar info
 */
function updateDebugBar(entryCount) {
    const entriesEl = document.getElementById('csv-entries');
    const updatedEl = document.getElementById('last-updated');

    if (entriesEl) entriesEl.textContent = entryCount;
    if (updatedEl) updatedEl.textContent = new Date().toLocaleTimeString();

    // Estimate CSV size (rough approx)
    const sizeEl = document.getElementById('csv-size');
    if (sizeEl) {
        const sizeKB = (entryCount * 0.15).toFixed(1); // Approx 150 bytes per row
        sizeEl.textContent = `${sizeKB} KB`;
    }
}

/**
 * Sort threats by priority (Critical > High > Medium > Low)
 */
function sortThreatsByPriority(threats) {
    const severityWeight = {
        'critical': 4,
        'high': 3,
        'medium': 2,
        'low': 1
    };

    return [...threats].sort((a, b) => {
        const weightA = severityWeight[a.severity.toLowerCase()] || 0;
        const weightB = severityWeight[b.severity.toLowerCase()] || 0;
        return weightB - weightA;
    });
}

/**
 * Format bytes to human readable (client-side helper)
 */
function formatBytesClient(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Create HTML for an attack item
 */
function createAttackItemHTML(threat, index) {
    const severityClass = threat.severity.toLowerCase();
    const timeAgo = formatTimestamp(threat.timestamp);

    // Get source country and city
    const sourceCountry = threat.sourcecountry || (threat.sourcename ? threat.sourcename.split(', ').pop() : 'Unknown');
    const sourceCity = threat.sourcecity || 'Unknown';

    // Build source location string for brackets [City, Country]
    let sourceLocationStr = '';
    if (sourceCity && sourceCity !== 'Unknown' && sourceCountry && sourceCountry !== 'Unknown') {
        const sourceCityClickable = `<span class="clickable-filter" data-filter-type="location" data-filter-value="${sourceCity}" data-filter-country="" title="View all attacks from ${sourceCity}">${sourceCity}</span>`;
        const sourceCountryClickable = `<span class="clickable-filter" data-filter-type="location" data-filter-value="" data-filter-country="${sourceCountry}" title="View all attacks from ${sourceCountry}">${sourceCountry}</span>`;
        sourceLocationStr = ` [${sourceCityClickable}, ${sourceCountryClickable}]`;
    } else if (sourceCountry && sourceCountry !== 'Unknown') {
        const sourceCountryClickable = `<span class="clickable-filter" data-filter-type="location" data-filter-value="" data-filter-country="${sourceCountry}" title="View all attacks from ${sourceCountry}">${sourceCountry}</span>`;
        sourceLocationStr = ` [${sourceCountryClickable}]`;
    }

    // Get target value - could be IP, email, or other identifier
    // For now, use destinationip as the target, but could be extended for email addresses
    const targetValue = threat.destinationip || 'Unknown';
    
    // Get destination label if available - make it clickable
    const destLabel = threat.destinationLabel ? ` <span class="clickable-filter" data-filter-type="host" data-filter-value="${threat.destinationip}" data-filter-label="${threat.destinationLabel}" title="View all attacks to ${threat.destinationLabel}">(${threat.destinationLabel})</span>` : '';

    // Get destination service/port - if service isn't known, use port number
    const destService = threat.destinationservice || threat.destinationport || '';
    const serviceDisplay = destService ? ` <span class="clickable-filter service-clickable" data-filter-type="service" data-filter-value="${destService}" title="View all attacks to this service">(${threat.destinationservice || `Port ${threat.destinationport}`})</span>` : '';

    // Blocked/Allowed status indicator
    const isBlocked = threat.blocked !== false;
    const statusClass = isBlocked ? 'status-blocked-feed' : 'status-allowed-feed';
    const statusIcon = isBlocked ? '🛡️' : '⚠️';

    return `
        <div class="attack-item ${severityClass} ${isBlocked ? 'blocked-threat' : ''}" data-index="${index}">
            <div class="attack-header">
                <span class="attack-time">${timeAgo}</span>
                <span class="attack-status ${statusClass}">${statusIcon}</span>
            </div>
            <div class="attack-name">${threat.eventname}</div>
            <div class="attack-details">
                <div class="attack-source-line">
                    Source: <span class="clickable-filter" data-filter-type="ip" data-filter-value="${threat.sourceip}" title="Filter by source IP">${threat.sourceip}</span>${sourceLocationStr}
                </div>
                <div class="attack-target-line">
                    Target: <span class="clickable-filter" data-filter-type="ip" data-filter-value="${threat.destinationip}" title="Filter by target">${targetValue}</span>${destLabel}${serviceDisplay}
                </div>
            </div>
        </div>
    `;
}

/**
 * Toggle feed pause
 */
function toggleFeedPause() {
    window.feedPaused = !window.feedPaused;

    const feedContent = document.getElementById('feed-content');
    const statusIndicator = document.querySelector('.status-indicator');

    if (window.feedPaused) {
        if (feedContent) {
            feedContent.classList.add('paused');
        }
        if (statusIndicator) {
            statusIndicator.style.opacity = '0.5';
            statusIndicator.title = 'Click to resume feed';
        }
    } else {
        if (feedContent) {
            feedContent.classList.remove('paused');
        }
        if (statusIndicator) {
            statusIndicator.style.opacity = '1';
            statusIndicator.title = 'Click to pause feed';
        }
    }
}

/**
 * Set application theme
 */
function setTheme(themeName) {
    const body = document.body;

    // Remove all theme classes
    body.classList.remove('theme-cyan', 'theme-green', 'theme-purple', 'theme-orange');

    // Add new theme class (crimson is default, no class needed)
    if (themeName !== 'crimson') {
        body.classList.add(`theme-${themeName}`);
    }

    // Save preference
    localStorage.setItem('soc-theme', themeName);

    console.log(`🎨 Theme changed to: ${themeName}`);
}

/**
 * Update attacker cities count
 */
function updateAttackerCitiesCount(count) {
    if (typeof MAP_CONFIG !== 'undefined') {
        MAP_CONFIG.attackerCitiesToShow = count;
        localStorage.setItem('soc-attacker-cities', count.toString());

        // Trigger map update to reflect new city count
        if (typeof updateMapData === 'function' && window.filteredData) {
            updateMapData(window.filteredData);
        }

        console.log(`🏙️ Attacker cities to show: ${count}`);
    }
}

/**
 * Show attack details in modal
 */
function showAttackDetails(threat) {
    const modal = document.getElementById('attack-modal');
    const detailsDiv = document.getElementById('attack-details');

    if (!modal || !detailsDiv) return;

    // Get severity class
    const severityClass = `severity-${threat.severity.toLowerCase()}`;
    const statusClass = threat.blocked !== false ? 'status-blocked' : 'status-allowed';
    const statusText = threat.blocked !== false ? '✓ BLOCKED' : '⚠ ALLOWED';

    // Get destination label if available - make it clickable to filter by destination IP with host name
    const destLabel = threat.destinationLabel ? ` <span class="clickable-filter" data-filter-type="host" data-filter-value="${threat.destinationip}" data-filter-label="${threat.destinationLabel}" title="View all attacks to ${threat.destinationLabel}">(${threat.destinationLabel})</span>` : '';

    // Get destination service
    const destService = threat.destinationservice || threat.destinationport || '';

    // Build service display with port
    const serviceDisplay = destService ? 
        (threat.destinationport ? `${destService} (${threat.destinationport})` : destService) : '';

    // Build details HTML with modern styling
    const html = `
        <div class="detail-row">
            <span class="detail-label">Event</span>
            <span class="detail-value">${threat.eventname}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Time</span>
            <span class="detail-value">${new Date(threat.timestamp).toLocaleString()}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Source IP</span>
            <span class="detail-value"><span class="clickable-filter" data-filter-type="ip" data-filter-value="${threat.sourceip}" title="View all attacks from this IP">${threat.sourceip}</span></span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Source Location</span>
            <span class="detail-value"><span class="clickable-filter" data-filter-type="location" data-filter-value="${threat.sourcecity || ''}" data-filter-country="${threat.sourcecountry || ''}" title="View all attacks from this location">${threat.sourcecountry || 'Unknown'} · ${threat.sourcecity || 'Unknown'}</span></span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Target</span>
            <span class="detail-value"><span class="clickable-filter" data-filter-type="ip" data-filter-value="${threat.destinationip}" title="View all attacks to this target">${threat.destinationip}</span>${destLabel}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Target Service</span>
            <span class="detail-value">${serviceDisplay ? `<span class="clickable-filter service-inline" data-filter-type="service" data-filter-value="${destService}" title="View all attacks to this service">${serviceDisplay}</span>` : '<span>Not available</span>'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Target Location</span>
            <span class="detail-value">${threat.destinationcity || threat.destinationcountry ? `<span class="clickable-filter" data-filter-type="location" data-filter-value="${threat.destinationcity || ''}" data-filter-country="${threat.destinationcountry || ''}" title="View all attacks to this location">${threat.destinationcountry || 'Unknown'} · ${threat.destinationcity || 'Unknown'}</span>` : '<span>Not available</span>'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Volume</span>
            <span class="detail-value">${threat.volume * 10} packets</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Threat Severity</span>
            <span class="detail-value ${severityClass}">${threat.severity.toUpperCase()}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Category</span>
            <span class="detail-value"><span class="clickable-filter" data-filter-type="category" data-filter-value="${threat.category}" title="View all attacks in this category">${threat.category}</span></span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Detection</span>
            <span class="detail-value">${threat.detectionsource}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Status</span>
            <span class="detail-value ${statusClass}">${statusText}</span>
        </div>
    `;

    detailsDiv.innerHTML = html;

    // Add click handlers for clickable filters in modal
    const clickableFilters = detailsDiv.querySelectorAll('.clickable-filter');
    clickableFilters.forEach(filter => {
        filter.addEventListener('click', (e) => {
            e.stopPropagation();
            const filterType = filter.dataset.filterType;
            const filterValue = filter.dataset.filterValue;
            const filterCountry = filter.dataset.filterCountry;
            const filterLabel = filter.dataset.filterLabel;
            if (filterType && (filterValue || filterCountry)) {
                closeModal();
                if (filterType === 'location') {
                    showFilteredAttacks(filterType, filterValue, { country: filterCountry });
                } else if (filterType === 'host') {
                    showFilteredAttacks(filterType, filterValue, { label: filterLabel });
                } else {
                    showFilteredAttacks(filterType, filterValue);
                }
            }
        });
    });

    modal.classList.remove('hidden');
}

/**
 * Close modal
 */
function closeModal() {
    const modal = document.getElementById('attack-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Highlight new attack in feed
 */
function highlightAttackInFeed(threat) {
    // Add new attack at the beginning of feed with highlight
    const feedContent = document.getElementById('feed-content');
    if (!feedContent) return;

    const newItemHTML = createAttackItemHTML(threat, 0);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newItemHTML;
    const newItem = tempDiv.firstElementChild;

    if (newItem) {
        newItem.classList.add('highlight');
        feedContent.insertBefore(newItem, feedContent.firstChild);

        // Add click listener
        newItem.addEventListener('click', () => {
            showAttackDetails(threat);
        });

        // Remove highlight after animation
        setTimeout(() => {
            newItem.classList.remove('highlight');
        }, 2000);
    }
}

// Track current toast to prevent stacking
let currentToast = null;
let toastTimeout = null;

/**
 * Show toast notification
 */
function showToast(threat) {
    // Remove existing toast if present
    if (currentToast) {
        currentToast.classList.remove('show');
        setTimeout(() => {
            if (currentToast && currentToast.parentNode) {
                currentToast.remove();
            }
        }, 300);
        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    currentToast = toast;

    const severityClass = threat.severity.toLowerCase();
    const isBlocked = threat.blocked !== false;
    const statusIcon = isBlocked ? '🛡️' : '⚠️';
    const statusText = isBlocked ? 'BLOCKED' : 'ALLOWED';

    toast.innerHTML = `
        <div class="toast-header">
            <span class="toast-severity ${severityClass}">${threat.severity.toUpperCase()}</span>
            <span class="toast-status">${statusIcon} ${statusText}</span>
        </div>
        <div class="toast-body">
            <div class="toast-event">${threat.eventname}</div>
            <div class="toast-route">${threat.sourcename || threat.sourcecountry || 'Unknown'} → ${threat.destinationname || threat.destinationcity || 'Unknown'}</div>
        </div>
    `;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast && toast.parentNode) {
                toast.remove();
            }
            if (currentToast === toast) {
                currentToast = null;
            }
        }, 300);
    }, 3000);
}

/**
 * Show notification for critical threats
 */
function showCriticalNotification(threat) {
    if (threat.severity.toLowerCase() !== 'critical') return;

    // Could implement browser notifications here
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Critical Threat Detected', {
            body: `${threat.eventname} from ${threat.sourceip}`,
            icon: '/favicon.ico',
            badge: '/favicon.ico'
        });
    }
}

/**
 * Request notification permission (call on user interaction)
 */
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

/**
 * Update feed animation speed based on threat volume
 */
function updateFeedSpeed(avgVolume) {
    const feedContent = document.getElementById('feed-content');
    if (!feedContent) return;

    // Adjust animation speed: higher volume = faster scroll
    const duration = Math.max(20, 40 - (avgVolume / 100 * 20));
    feedContent.style.animationDuration = `${duration}s`;
}

/**
 * Update Top 3 Attacker Locations list
 * Now clickable to show list of attacks from that location
 */
function updateTopAttackers(threats) {
    const listElement = document.getElementById('top-attackers-list');
    if (!listElement) return;

    const locationCounts = {};
    threats.forEach(t => {
        // Use sourcename if available (City, Country), otherwise fallback to coords
        const locKey = t.sourcename || `${t.sourcelat},${t.sourcelon}`;

        if (!locationCounts[locKey]) {
            locationCounts[locKey] = {
                count: 0,
                lat: t.sourcelat,
                lon: t.sourcelon,
                name: locKey,
                threats: []
            };
        }
        locationCounts[locKey].count++;
        locationCounts[locKey].threats.push(t);
    });

    const sortedLocations = Object.values(locationCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

    // Store for click handler access
    window.topAttackerLocations = sortedLocations;

    let html = '';
    if (sortedLocations.length === 0) {
        html = '<div class="empty-list">No data available</div>';
    } else {
        html = '<div class="legend-title">Top 3 Attacker Locations</div>';
        sortedLocations.forEach((loc, index) => {
            html += `
                <div class="attacker-row clickable" data-location-index="${index}">
                    <span class="attacker-rank">#${index + 1}</span>
                    <span class="attacker-info">
                        <span class="attacker-location">${loc.name}</span>
                        <span class="attacker-count">${loc.count} attacks</span>
                    </span>
                </div>
            `;
        });
    }

    listElement.innerHTML = html;

    // Add click listeners to show attacks from that location
    const locationItems = listElement.querySelectorAll('.attacker-row.clickable');
    locationItems.forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.locationIndex);
            const loc = window.topAttackerLocations[index];
            if (loc) {
                showCityAttacks(loc.name, loc.threats, 'source');
            }
        });
    });
}

/**
 * Update Top 3 Attacked Targets list
 * Shows most frequently attacked targets (IP addresses, email addresses, labeled services like "F5 Load Balancer", "Company Website")
 */
function updateTopTargets(threats) {
    const listElement = document.getElementById('top-targets-list');
    if (!listElement) return;

    const targetCounts = {};
    threats.forEach(t => {
        // Use destination IP or email as the target key
        const targetKey = t.destinationip || 'Unknown';
        
        // Get the display label - prefer destinationLabel, otherwise use the target itself
        // destinationLabel comes from config (e.g., "F5 Load Balancer", "Company Website")
        // If it's an email address, use the email as the label
        const isEmail = targetKey.includes('@');
        const targetLabel = t.destinationLabel || (isEmail ? targetKey : null);

        if (!targetCounts[targetKey]) {
            targetCounts[targetKey] = {
                count: 0,
                target: targetKey,
                label: targetLabel,
                threats: []
            };
        }
        targetCounts[targetKey].count++;
        targetCounts[targetKey].threats.push(t);
    });

    const sortedTargets = Object.values(targetCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

    // Store for click handler access
    window.topTargets = sortedTargets;

    let html = '';
    if (sortedTargets.length === 0) {
        html = '<div class="empty-list">No data available</div>';
    } else {
        html = '<div class="legend-title">Top 3 Attacked Targets</div>';
        sortedTargets.forEach((target, index) => {
            // Display: Use label if available (e.g., "F5 Load Balancer", "Company Website", email address)
            // Otherwise show IP address
            const displayName = target.label || target.target;
            html += `
                <div class="attacker-row clickable" data-target-index="${index}">
                    <span class="attacker-rank">#${index + 1}</span>
                    <span class="attacker-info">
                        <span class="attacker-location">${displayName}</span>
                        <span class="attacker-count">${target.count} attacks</span>
                    </span>
                </div>
            `;
        });
    }

    listElement.innerHTML = html;

    // Add click listeners to show attacks to that target
    const targetItems = listElement.querySelectorAll('.attacker-row.clickable');
    targetItems.forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.targetIndex);
            const target = window.topTargets[index];
            if (target) {
                // Use 'host' filter type if we have a label, otherwise use 'ip'
                // This ensures the title shows the label properly
                if (target.label) {
                    showFilteredAttacks('host', target.target, { label: target.label });
                } else {
                    showFilteredAttacks('ip', target.target, { label: target.label });
                }
            }
        });
    });
}

/**
 * Calculate distance between two lat/lon points (Haversine formula)
 * Returns distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/**
 * Get attacks within a geographic radius or country
 * @param {string} cityName - Name of the city
 * @param {array} attacks - Array of threat objects (for reference coordinates)
 * @param {number} radiusKm - Radius in kilometers
 * @param {string} country - Optional country name
 * @param {string} type - 'source', 'destination', or null for both
 */
function getAttacksByGeography(cityName, attacks, radiusKm, country = null, type = null) {
    const dataSource = window.filteredData && window.filteredData.length > 0
        ? window.filteredData
        : (window.threatData || []);

    // Find reference coordinates from first attack
    let refLat = null, refLon = null, refCountry = null;
    const sampleAttack = attacks[0];
    if (sampleAttack) {
        // Determine which side to use based on type
        if (type === 'source') {
            const loc = sampleAttack.sourcelocation?.split(',');
            if (loc && loc.length === 2) {
                refLat = parseFloat(loc[0]);
                refLon = parseFloat(loc[1]);
            }
            refCountry = sampleAttack.sourcecountry;
        } else if (type === 'destination') {
            const loc = sampleAttack.destinationlocation?.split(',');
            if (loc && loc.length === 2) {
                refLat = parseFloat(loc[0]);
                refLon = parseFloat(loc[1]);
            }
            refCountry = sampleAttack.destinationcountry;
        } else {
            // Try source location first
            if (sampleAttack.sourcecity?.toLowerCase() === cityName.toLowerCase()) {
                const loc = sampleAttack.sourcelocation?.split(',');
                if (loc && loc.length === 2) {
                    refLat = parseFloat(loc[0]);
                    refLon = parseFloat(loc[1]);
                }
                refCountry = sampleAttack.sourcecountry;
            } else {
                const loc = sampleAttack.destinationlocation?.split(',');
                if (loc && loc.length === 2) {
                    refLat = parseFloat(loc[0]);
                    refLon = parseFloat(loc[1]);
                }
                refCountry = sampleAttack.destinationcountry;
            }
        }
    }

    if (country) {
        // Filter by country, respecting type
        if (type === 'source') {
            return dataSource.filter(t => t.sourcecountry === country);
        } else if (type === 'destination') {
            return dataSource.filter(t => t.destinationcountry === country);
        } else {
            return dataSource.filter(t => 
                t.sourcecountry === country || t.destinationcountry === country
            );
        }
    }

    if (refLat === null || refLon === null) return attacks;

    // Filter by radius, respecting type
    return dataSource.filter(t => {
        if (type === 'source') {
            // Only check source location
            const srcLoc = t.sourcelocation?.split(',');
            if (srcLoc && srcLoc.length === 2) {
                const dist = calculateDistance(refLat, refLon, parseFloat(srcLoc[0]), parseFloat(srcLoc[1]));
                if (dist <= radiusKm) return true;
            }
        } else if (type === 'destination') {
            // Only check destination location
            const dstLoc = t.destinationlocation?.split(',');
            if (dstLoc && dstLoc.length === 2) {
                const dist = calculateDistance(refLat, refLon, parseFloat(dstLoc[0]), parseFloat(dstLoc[1]));
                if (dist <= radiusKm) return true;
            }
        } else {
            // Check both locations
            const srcLoc = t.sourcelocation?.split(',');
            if (srcLoc && srcLoc.length === 2) {
                const dist = calculateDistance(refLat, refLon, parseFloat(srcLoc[0]), parseFloat(srcLoc[1]));
                if (dist <= radiusKm) return true;
            }
            const dstLoc = t.destinationlocation?.split(',');
            if (dstLoc && dstLoc.length === 2) {
                const dist = calculateDistance(refLat, refLon, parseFloat(dstLoc[0]), parseFloat(dstLoc[1]));
                if (dist <= radiusKm) return true;
            }
        }
        return false;
    });
}

/**
 * Unified function to show attacks from/to a location
 * @param {string} locationName - Name of the city or country
 * @param {array} attacks - Optional array of threat objects (if not provided, will fetch from data)
 * @param {string} type - 'source' or 'destination'
 * @param {object} geoFilter - Optional geographic filter {radius: km} or {country: name}
 */
function showCityAttacks(locationName, attacks = null, type, geoFilter = null) {
    const modal = document.getElementById('city-filter-modal');
    const titleEl = document.getElementById('city-filter-title');
    const listEl = document.getElementById('city-attack-list');

    if (!modal || !titleEl || !listEl) {
        console.error('Modal elements not found');
        return;
    }

    // Get data source
    const dataSource = window.filteredData && window.filteredData.length > 0
        ? window.filteredData
        : (window.threatData || []);

    // If attacks not provided, fetch them based on location and type
    if (!attacks || attacks.length === 0) {
        if (geoFilter?.country) {
            // Filter by country
            if (type === 'source') {
                attacks = dataSource.filter(t => t.sourcecountry === geoFilter.country);
            } else if (type === 'destination') {
                attacks = dataSource.filter(t => t.destinationcountry === geoFilter.country);
            } else {
                attacks = dataSource.filter(t => 
                    t.sourcecountry === geoFilter.country || t.destinationcountry === geoFilter.country
                );
            }
        } else {
            // Filter by city
            attacks = getAttacksByCity(locationName, type);
        }
    }

    // Detect country from location name or attacks
    let country = null;
    if (geoFilter?.country) {
        country = geoFilter.country;
    } else if (attacks.length > 0) {
        const locationLower = locationName.toLowerCase();
        for (const attack of attacks) {
            if (type === 'source') {
                if (attack.sourcecity?.toLowerCase() === locationLower) {
                    country = attack.sourcecountry;
                    break;
                }
            } else if (type === 'destination') {
                if (attack.destinationcity?.toLowerCase() === locationLower) {
                    country = attack.destinationcountry;
                    break;
                }
            } else {
                if (attack.sourcecity?.toLowerCase() === locationLower) {
                    country = attack.sourcecountry;
                    break;
                }
                if (attack.destinationcity?.toLowerCase() === locationLower) {
                    country = attack.destinationcountry;
                    break;
                }
            }
        }
    }

    // Apply geographic filter if specified (radius)
    let displayAttacks = attacks;
    let titleSuffix = '';
    if (geoFilter?.radius) {
        displayAttacks = getAttacksByGeography(locationName, attacks, geoFilter.radius, null, type);
        titleSuffix = ` (+${geoFilter.radius}km)`;
    } else {
        displayAttacks = attacks;
    }

    // Set title - uniform format: "Attacks from" or "Attacks to"
    const typeLabel = type === 'source' ? 'from' : 'to';
    const titleLocation = geoFilter?.country ? geoFilter.country : locationName;
    titleEl.textContent = `Attacks ${typeLabel} ${titleLocation}${titleSuffix} (${displayAttacks.length})`;

    // Build geographic pivot options - always show pivots for both source and destination
    let pivotHtml = '';
    // Escape locationName and country for use in onclick handlers
    const escapedLocationName = locationName.replace(/'/g, "\\'");
    const escapedCountry = country ? country.replace(/'/g, "\\'") : '';
    
    // Determine the base city name - if viewing country, find the most common city
    let baseCityName = locationName;
    if (geoFilter?.country) {
        // When viewing country, find the most common city in that country from the attacks
        const cityCounts = {};
        displayAttacks.forEach(attack => {
            let city = null;
            if (type === 'source' && attack.sourcecountry === geoFilter.country && attack.sourcecity) {
                city = attack.sourcecity;
            } else if (type === 'destination' && attack.destinationcountry === geoFilter.country && attack.destinationcity) {
                city = attack.destinationcity;
            }
            if (city) {
                cityCounts[city] = (cityCounts[city] || 0) + 1;
            }
        });
        // Get the city with the highest count
        const sortedCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]);
        if (sortedCities.length > 0) {
            baseCityName = sortedCities[0][0];
        }
    }
    const escapedBaseCity = baseCityName.replace(/'/g, "\\'");
    
    pivotHtml = `<div class="pivot-options geo-pivot">
        <span class="pivot-label">Geographic:</span>
        <button class="pivot-btn ${!geoFilter ? 'active' : ''}" onclick="showCityAttacks('${escapedBaseCity}', null, '${type}')">City only</button>
        <button class="pivot-btn ${geoFilter?.radius === 1000 ? 'active' : ''}" onclick="showCityAttacks('${escapedBaseCity}', null, '${type}', {radius: 1000})">+1000km</button>
        <button class="pivot-btn ${geoFilter?.radius === 2500 ? 'active' : ''}" onclick="showCityAttacks('${escapedBaseCity}', null, '${type}', {radius: 2500})">+2500km</button>
        ${country ? `<button class="pivot-btn ${geoFilter?.country ? 'active' : ''}" onclick="showCityAttacks('${escapedCountry}', null, '${type}', {country: '${escapedCountry}'})">${escapedCountry}</button>` : ''}
    </div>`;

    // Sort attacks by timestamp (newest first)
    const sortedAttacks = [...displayAttacks].sort((a, b) => {
        const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
        const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;
        return timeB - timeA;
    });
    
    // Build table-style attack list - show the OTHER side (if viewing attacks FROM city, show destination; if viewing attacks TO city, show source)
    const isDestination = type === 'destination';
    let html = pivotHtml + `
        <table class="city-attack-table">
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Severity</th>
                    <th>Event</th>
                    <th>${isDestination ? 'Source' : 'Target'}</th>
                    <th>Service</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    sortedAttacks.slice(0, 50).forEach((threat, index) => {
        const severityClass = threat.severity.toLowerCase();
        const timeAgo = typeof formatTimestamp === 'function' ? formatTimestamp(threat.timestamp) : 'Unknown';
        const isBlocked = threat.blocked !== false;
        const statusText = isBlocked ? '🛡️' : '⚠️';
        const statusClass = isBlocked ? 'blocked' : 'allowed';
        // Service: use service name if available, otherwise port number, otherwise '-'
        const service = threat.destinationservice || (threat.destinationport ? `Port ${threat.destinationport}` : '-');
        const serviceValue = threat.destinationservice || threat.destinationport || '';
        
        // Show the OTHER side - if viewing attacks FROM city, show destination; if viewing attacks TO city, show source
        let otherSideLocation, otherSideClickable;
        if (isDestination) {
            // Viewing attacks TO city - show source location
            const sourceLocation = threat.sourcecity && threat.sourcecountry ? 
                `${threat.sourcecountry} · ${threat.sourcecity}` : 
                (threat.sourcecountry || threat.sourcecity || 'Unknown');
            otherSideClickable = `<span class="clickable-filter" data-filter-type="location" data-filter-value="${threat.sourcecity || ''}" data-filter-country="${threat.sourcecountry || ''}" title="View all attacks from this location">${sourceLocation}</span>`;
        } else {
            // Viewing attacks FROM city - show destination location
            const destLocation = threat.destinationcity && threat.destinationcountry ? 
                `${threat.destinationcountry} · ${threat.destinationcity}` : 
                (threat.destinationcountry || threat.destinationcity || 'Unknown');
            otherSideClickable = `<span class="clickable-filter" data-filter-type="location" data-filter-value="${threat.destinationcity || ''}" data-filter-country="${threat.destinationcountry || ''}" title="View all attacks to this location">${destLocation}</span>`;
        }
        
        html += `
            <tr class="city-attack-row ${severityClass}" data-city-attack-index="${index}">
                <td class="col-time">${timeAgo}</td>
                <td class="col-severity"><span class="severity-badge ${severityClass}">${threat.severity}</span></td>
                <td class="col-event">${threat.eventname}</td>
                <td class="col-other-side">${otherSideClickable}</td>
                <td class="col-service">${serviceValue ? `<span class="clickable-filter" data-filter-type="service" data-filter-value="${serviceValue}" title="View all attacks to this service">${service}</span>` : service}</td>
                <td class="col-status ${statusClass}">${statusText}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    
    if (sortedAttacks.length === 0) {
        html = '<div class="empty-list">No attacks found</div>';
    }
    
    listEl.innerHTML = html;
    
    // Store attacks for click handler
    window.cityModalAttacks = sortedAttacks.slice(0, 50);
    
    // Add click handlers to show details
    const items = listEl.querySelectorAll('.city-attack-row');
    items.forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't trigger row click if clicking a filter
            if (e.target.classList.contains('clickable-filter')) return;
            const idx = parseInt(item.dataset.cityAttackIndex);
            if (window.cityModalAttacks[idx]) {
                closeCityFilter();
                showAttackDetails(window.cityModalAttacks[idx]);
            }
        });
    });

    // Add click handlers for clickable filters within the table
    const clickableFilters = listEl.querySelectorAll('.clickable-filter');
    clickableFilters.forEach(filter => {
        filter.addEventListener('click', (e) => {
            e.stopPropagation();
            const filterType = filter.dataset.filterType;
            const filterValue = filter.dataset.filterValue;
            const filterLabel = filter.dataset.filterLabel;
            if (filterType && filterValue && filterValue !== '-') {
                closeCityFilter();
                if (filterType === 'host') {
                    showFilteredAttacks(filterType, filterValue, { label: filterLabel });
                } else {
                    showFilteredAttacks(filterType, filterValue);
                }
            }
        });
    });
    
    // Show modal
    modal.classList.remove('hidden');
}

/**
 * Close city filter modal
 */
function closeCityFilter() {
    const modal = document.getElementById('city-filter-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Filter attacks by city name (source or destination)
 * @param {string} cityName - Name of the city
 * @param {string} type - 'source', 'destination', or null for both
 */
function getAttacksByCity(cityName, type = null) {
    // Use filteredData instead of threatData to respect current filters
    const dataSource = window.filteredData && window.filteredData.length > 0
        ? window.filteredData
        : (window.threatData || []);

    if (!Array.isArray(dataSource) || dataSource.length === 0) {
        console.warn('No threat data available for city filter');
        return [];
    }

    const cityLower = cityName.toLowerCase().trim();
    console.log(`🔍 Searching for city: "${cityName}" (lowercase: "${cityLower}"), type: ${type || 'both'}`);

    const matches = dataSource.filter(t => {
        const sourceCity = (t.sourcecity || '').toLowerCase().trim();
        const destCity = (t.destinationcity || '').toLowerCase().trim();

        // Filter based on type
        if (type === 'source') {
            return sourceCity === cityLower;
        } else if (type === 'destination') {
            return destCity === cityLower;
        } else {
            // Both source and destination
            return sourceCity === cityLower || destCity === cityLower;
        }
    });

    console.log(`getAttacksByCity("${cityName}", "${type || 'both'}"): Found ${matches.length} attacks from ${dataSource.length} total`);

    // If no matches found, log some sample data for debugging
    if (matches.length === 0 && dataSource.length > 0) {
        console.log('📋 Sample data for debugging (first 3 entries):');
        dataSource.slice(0, 3).forEach((t, i) => {
            console.log(`  [${i}] sourceCity="${t.sourcecity}", destCity="${t.destinationcity}"`);
        });
    }

    return matches;
}

/**
 * Get /24 subnet from IP address
 */
function getSubnet24(ip) {
    if (!ip) return null;
    const parts = ip.split('.');
    if (parts.length !== 4) return null;
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

/**
 * Get /16 subnet from IP address
 */
function getSubnet16(ip) {
    if (!ip) return null;
    const parts = ip.split('.');
    if (parts.length !== 4) return null;
    return `${parts[0]}.${parts[1]}`;
}

/**
 * Get /8 subnet from IP address
 */
function getSubnet8(ip) {
    if (!ip) return null;
    const parts = ip.split('.');
    if (parts.length !== 4) return null;
    return `${parts[0]}`;
}

/**
 * Check if IP is in same /24 subnet
 */
function isInSubnet24(ip, subnet) {
    if (!ip || !subnet) return false;
    return ip.startsWith(subnet + '.');
}

/**
 * Check if IP is in same /16 subnet
 */
function isInSubnet16(ip, subnet) {
    if (!ip || !subnet) return false;
    return ip.startsWith(subnet + '.');
}

/**
 * Check if IP is in same /8 subnet
 */
function isInSubnet8(ip, subnet) {
    if (!ip || !subnet) return false;
    return ip.startsWith(subnet + '.');
}

/**
 * Show filtered attacks by IP or Service
 */
function showFilteredAttacks(filterType, filterValue, options = {}) {
    const dataSource = window.filteredData && window.filteredData.length > 0
        ? window.filteredData
        : (window.threatData || []);

    let matches = [];
    let title = '';
    let pivotOptions = '';

    if (filterType === 'ip') {
        if (options.subnet8) {
            // Filter by /8 subnet
            const subnet = getSubnet8(filterValue);
            matches = dataSource.filter(t => 
                isInSubnet8(t.destinationip, subnet) || isInSubnet8(t.sourceip, subnet)
            );
            title = `Attacks in subnet: ${subnet}.0.0.0/8`;
            const subnet16 = getSubnet16(filterValue);
            pivotOptions = `<div class="pivot-options">
                <span class="pivot-label">Pivot:</span>
                <button class="pivot-btn" onclick="showFilteredAttacks('ip', '${filterValue}')">Exact IP</button>
                ${subnet16 ? `<button class="pivot-btn" onclick="showFilteredAttacks('ip', '${filterValue}', {subnet16: true})">${subnet16}.0.0/16</button>` : ''}
            </div>`;
        } else if (options.subnet16) {
            // Filter by /16 subnet
            const subnet = getSubnet16(filterValue);
            matches = dataSource.filter(t => 
                isInSubnet16(t.destinationip, subnet) || isInSubnet16(t.sourceip, subnet)
            );
            title = `Attacks in subnet: ${subnet}.0.0/16`;
            const subnet24 = getSubnet24(filterValue);
            const subnet8 = getSubnet8(filterValue);
            pivotOptions = `<div class="pivot-options">
                <span class="pivot-label">Pivot:</span>
                <button class="pivot-btn" onclick="showFilteredAttacks('ip', '${filterValue}')">Exact IP</button>
                ${subnet24 ? `<button class="pivot-btn" onclick="showFilteredAttacks('ip', '${filterValue}', {subnet24: true})">${subnet24}.0/24</button>` : ''}
                ${subnet8 ? `<button class="pivot-btn" onclick="showFilteredAttacks('ip', '${filterValue}', {subnet8: true})">${subnet8}.0.0.0/8</button>` : ''}
            </div>`;
        } else if (options.subnet24) {
            // Filter by /24 subnet
            const subnet = getSubnet24(filterValue);
            matches = dataSource.filter(t => 
                isInSubnet24(t.destinationip, subnet) || isInSubnet24(t.sourceip, subnet)
            );
            title = `Attacks in subnet: ${subnet}.0/24`;
            const subnet16 = getSubnet16(filterValue);
            pivotOptions = `<div class="pivot-options">
                <span class="pivot-label">Pivot:</span>
                <button class="pivot-btn" onclick="showFilteredAttacks('ip', '${filterValue}')">Exact IP</button>
                ${subnet16 ? `<button class="pivot-btn" onclick="showFilteredAttacks('ip', '${filterValue}', {subnet16: true})">${subnet16}.0.0/16</button>` : ''}
            </div>`;
        } else {
            matches = dataSource.filter(t => 
                t.destinationip === filterValue || t.sourceip === filterValue
            );
            // Use label if available, otherwise use the filterValue (could be IP or email)
            // Since this can be a user (email) or other target, use "Attacks against target:"
            const displayName = options.label || filterValue;
            title = `Attacks against target: ${displayName}`;
            
            // Only show subnet pivots for IP addresses, not email addresses
            const subnet24 = filterValue.includes('@') ? null : getSubnet24(filterValue);
            if (subnet24) {
                pivotOptions = `<div class="pivot-options">
                    <span class="pivot-label">Pivot:</span>
                    <button class="pivot-btn" onclick="showFilteredAttacks('ip', '${filterValue}', {subnet24: true})">${subnet24}.0/24</button>
                </div>`;
            }
        }
    } else if (filterType === 'host') {
        // Filter by destination IP (for host labels like "Canberra Load Balancer", email addresses, etc.)
        matches = dataSource.filter(t => 
            t.destinationip === filterValue
        );
        const hostName = options.label || filterValue;
        title = `Attacks against target: ${hostName}`;
    } else if (filterType === 'service') {
        matches = dataSource.filter(t => 
            t.destinationservice === filterValue || String(t.destinationport) === String(filterValue)
        );
        title = `Attacks on Service: ${filterValue}`;
    } else if (filterType === 'category') {
        matches = dataSource.filter(t => t.category === filterValue);
        title = `Attacks in Category: ${filterValue}`;
    } else if (filterType === 'location') {
        // filterValue is city, options.country is country
        const country = options.country || '';
        if (filterValue && country) {
            // Both city and country specified - filter by city only (city is more specific)
            matches = dataSource.filter(t => 
                t.sourcecity === filterValue || t.destinationcity === filterValue
            );
            title = `Attacks from/to: ${filterValue}`;
        } else if (filterValue) {
            // Only city specified - filter by city
            matches = dataSource.filter(t => 
                t.sourcecity === filterValue || t.destinationcity === filterValue
            );
            title = `Attacks from/to: ${filterValue}`;
        } else if (country) {
            // Only country specified - filter by country
            matches = dataSource.filter(t => 
                t.sourcecountry === country || t.destinationcountry === country
            );
            title = `Attacks from/to: ${country}`;
        }
    }

    console.log(`Filter by ${filterType}="${filterValue}": Found ${matches.length} attacks`);

    // Reuse the city filter modal
    const modal = document.getElementById('city-filter-modal');
    const titleEl = document.getElementById('city-filter-title');
    const listEl = document.getElementById('city-attack-list');

    if (!modal || !titleEl || !listEl) return;

    titleEl.textContent = title;

    if (matches.length === 0) {
        listEl.innerHTML = pivotOptions + '<div class="no-attacks">No attacks found</div>';
    } else {
        let html = pivotOptions;
        html += `<div class="attack-count">${matches.length} attack${matches.length !== 1 ? 's' : ''} found</div>`;
        html += '<div class="attack-table"><table>';
        html += '<thead><tr><th>Time</th><th>Event</th><th>Source</th><th>Target</th><th>Service</th><th>Category</th><th>Severity</th></tr></thead>';
        html += '<tbody>';
        
        matches.slice(0, 100).forEach(attack => {
            const severityClass = attack.severity.toLowerCase();
            const service = attack.destinationservice || attack.destinationport || '-';
            const sourceDisplay = attack.sourcecity || attack.sourceip;
            html += `<tr class="attack-row ${severityClass}" onclick="showAttackDetails(window.threatData.find(t => t.id === '${attack.id}') || ${JSON.stringify(attack).replace(/"/g, '&quot;')})">
                <td>${formatTimestamp(attack.timestamp)}</td>
                <td>${attack.eventname}</td>
                <td><span class="clickable-filter" data-filter-type="location" data-filter-value="${attack.sourcecity || ''}" data-filter-country="${attack.sourcecountry || ''}" title="View all attacks from this location">${sourceDisplay}</span></td>
                <td><span class="clickable-filter" data-filter-type="ip" data-filter-value="${attack.destinationip}" title="Filter by target">${attack.destinationip}</span></td>
                <td><span class="clickable-filter" data-filter-type="service" data-filter-value="${service}" title="Filter by service">${service}</span></td>
                <td><span class="clickable-filter" data-filter-type="category" data-filter-value="${attack.category}" title="Filter by category">${attack.category}</span></td>
                <td><span class="severity-badge ${severityClass}">${attack.severity}</span></td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        if (matches.length > 100) {
            html += `<div class="truncated-notice">Showing first 100 of ${matches.length} attacks</div>`;
        }
        listEl.innerHTML = html;

        // Add click handlers for clickable filters
        const clickableFilters = listEl.querySelectorAll('.clickable-filter');
        clickableFilters.forEach(filter => {
            filter.addEventListener('click', (e) => {
                e.stopPropagation();
                const ft = filter.dataset.filterType;
                const fv = filter.dataset.filterValue;
                const filterCountry = filter.dataset.filterCountry;
                const filterLabel = filter.dataset.filterLabel;
                if (ft && (fv || filterCountry)) {
                    if (ft === 'location') {
                        showFilteredAttacks(ft, fv, { country: filterCountry });
                    } else if (ft === 'host') {
                        showFilteredAttacks(ft, fv, { label: filterLabel });
                    } else {
                        showFilteredAttacks(ft, fv);
                    }
                }
            });
        });
    }

    modal.classList.remove('hidden');
}

// Export functions
if (typeof window !== 'undefined') {
    window.initUI = initUI;
    window.updateAttackFeed = updateAttackFeed;
    window.showAttackDetails = showAttackDetails;
    window.highlightAttackInFeed = highlightAttackInFeed;
    window.showToast = showToast;
    window.showCriticalNotification = showCriticalNotification;
    window.requestNotificationPermission = requestNotificationPermission;
    window.updateDebugBar = updateDebugBar;
    window.sortThreatsByPriority = sortThreatsByPriority;
    window.formatBytesClient = formatBytesClient;
    window.toggleSettingsPanel = toggleSettingsPanel;
    window.updateTopAttackers = updateTopAttackers;
    window.setTheme = setTheme;
    window.showCityAttacks = showCityAttacks;
    window.closeCityFilter = closeCityFilter;
    window.getAttacksByCity = getAttacksByCity;
    window.showFilteredAttacks = showFilteredAttacks;
    window.getAttacksByGeography = getAttacksByGeography;
    window.calculateDistance = calculateDistance;
    window.showDebugConsole = showDebugConsole;
    window.closeDebugConsole = closeDebugConsole;
    window.updateTopTargets = updateTopTargets;
}

/**
 * Show debug console with data quality and performance metrics
 */
function showDebugConsole() {
    const modal = document.getElementById('debug-console-modal');
    const content = document.getElementById('debug-console-content');
    
    if (!modal || !content) return;
    
    // Data quality metrics
    const threats = window.threatData || [];
    const totalThreats = threats.length;
    const threatsWithService = threats.filter(t => t.destinationservice || t.destinationport).length;
    const threatsWithSourceCity = threats.filter(t => t.sourcecity).length;
    const threatsWithDestCity = threats.filter(t => t.destinationcity).length;
    const threatsWithCategory = threats.filter(t => t.category).length;
    const blockedThreats = threats.filter(t => t.blocked !== false).length;
    const allowedThreats = threats.filter(t => t.blocked === false).length;
    
    // Severity distribution
    const severityCounts = {
        critical: threats.filter(t => t.severity?.toLowerCase() === 'critical').length,
        high: threats.filter(t => t.severity?.toLowerCase() === 'high').length,
        medium: threats.filter(t => t.severity?.toLowerCase() === 'medium').length,
        low: threats.filter(t => t.severity?.toLowerCase() === 'low').length
    };
    
    // Performance metrics
    const perfData = performance.getEntriesByType('navigation')[0];
    const memoryInfo = performance.memory ? {
        used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
        limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
    } : { used: 'N/A', total: 'N/A', limit: 'N/A' };
    
    const loadTime = perfData ? (perfData.loadEventEnd - perfData.loadEventStart).toFixed(2) + ' ms' : 'N/A';
    const domContentLoaded = perfData ? (perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart).toFixed(2) + ' ms' : 'N/A';
    
    // Render performance
    const renderStart = performance.now();
    const renderTime = (performance.now() - renderStart).toFixed(2) + ' ms';
    
    // Build debug info HTML
    const html = `
        <div class="debug-section">
            <h3>📊 Data Quality Metrics</h3>
            <table class="debug-table">
                <tr><td>Total Events Loaded:</td><td><strong>${totalThreats}</strong></td></tr>
                <tr><td>Events with Service:</td><td>${threatsWithService} (${totalThreats > 0 ? ((threatsWithService / totalThreats) * 100).toFixed(1) : 0}%)</td></tr>
                <tr><td>Events with Source City:</td><td>${threatsWithSourceCity} (${totalThreats > 0 ? ((threatsWithSourceCity / totalThreats) * 100).toFixed(1) : 0}%)</td></tr>
                <tr><td>Events with Dest City:</td><td>${threatsWithDestCity} (${totalThreats > 0 ? ((threatsWithDestCity / totalThreats) * 100).toFixed(1) : 0}%)</td></tr>
                <tr><td>Events with Category:</td><td>${threatsWithCategory} (${totalThreats > 0 ? ((threatsWithCategory / totalThreats) * 100).toFixed(1) : 0}%)</td></tr>
            </table>
        </div>
        
        <div class="debug-section">
            <h3>🛡️ Threat Status</h3>
            <table class="debug-table">
                <tr><td>Blocked Threats:</td><td><strong>${blockedThreats}</strong> (${totalThreats > 0 ? ((blockedThreats / totalThreats) * 100).toFixed(1) : 0}%)</td></tr>
                <tr><td>Allowed Threats:</td><td><strong>${allowedThreats}</strong> (${totalThreats > 0 ? ((allowedThreats / totalThreats) * 100).toFixed(1) : 0}%)</td></tr>
            </table>
        </div>
        
        <div class="debug-section">
            <h3>⚠️ Severity Distribution</h3>
            <table class="debug-table">
                <tr><td>Critical:</td><td><strong>${severityCounts.critical}</strong> (${totalThreats > 0 ? ((severityCounts.critical / totalThreats) * 100).toFixed(1) : 0}%)</td></tr>
                <tr><td>High:</td><td><strong>${severityCounts.high}</strong> (${totalThreats > 0 ? ((severityCounts.high / totalThreats) * 100).toFixed(1) : 0}%)</td></tr>
                <tr><td>Medium:</td><td><strong>${severityCounts.medium}</strong> (${totalThreats > 0 ? ((severityCounts.medium / totalThreats) * 100).toFixed(1) : 0}%)</td></tr>
                <tr><td>Low:</td><td><strong>${severityCounts.low}</strong> (${totalThreats > 0 ? ((severityCounts.low / totalThreats) * 100).toFixed(1) : 0}%)</td></tr>
            </table>
        </div>
        
        <div class="debug-section">
            <h3>🎯 Map Visualization</h3>
            <table class="debug-table">
                <tr><td>Total Threats Available:</td><td><strong>${window.arcDisplayStats?.total || 0}</strong></td></tr>
                <tr><td>Arcs Displayed:</td><td><strong>${window.arcDisplayStats?.displayed || 0}</strong> (${window.arcDisplayStats?.percentage || 100}%)</td></tr>
                <tr><td>Arc Display Setting:</td><td>${window.MAP_CONFIG?.arcDisplayPercentage || 100}%</td></tr>
            </table>
        </div>
        
        <div class="debug-section">
            <h3>⚡ Performance Metrics</h3>
            <table class="debug-table">
                <tr><td>Page Load Time:</td><td>${loadTime}</td></tr>
                <tr><td>DOM Content Loaded:</td><td>${domContentLoaded}</td></tr>
                <tr><td>Memory Used:</td><td>${memoryInfo.used}</td></tr>
                <tr><td>Memory Total:</td><td>${memoryInfo.total}</td></tr>
                <tr><td>Memory Limit:</td><td>${memoryInfo.limit}</td></tr>
                <tr><td>User Agent:</td><td style="font-size: 10px;">${navigator.userAgent}</td></tr>
            </table>
        </div>
        
        <div class="debug-section">
            <h3>🌐 Browser Info</h3>
            <table class="debug-table">
                <tr><td>Screen Resolution:</td><td>${screen.width}x${screen.height}</td></tr>
                <tr><td>Viewport Size:</td><td>${window.innerWidth}x${window.innerHeight}</td></tr>
                <tr><td>Device Pixel Ratio:</td><td>${window.devicePixelRatio || 1}</td></tr>
                <tr><td>Online Status:</td><td>${navigator.onLine ? 'Online' : 'Offline'}</td></tr>
            </table>
        </div>
    `;
    
    content.innerHTML = html;
    modal.classList.remove('hidden');
}

/**
 * Close debug console
 */
function closeDebugConsole() {
    const modal = document.getElementById('debug-console-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}
