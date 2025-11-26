// UI Control Logic for Live Global Cyber Threat Map

let settingsVisible = false;
let is3DMode = true;
let isAutoRotate = false;

/**
 * Initialize UI controls
 */
function initUI() {
    setupControlListeners();
    setupKeyboardShortcuts();

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

    // View mode toggle
    const toggleViewBtn = document.getElementById('toggle-view');
    if (toggleViewBtn) {
        toggleViewBtn.addEventListener('click', () => {
            if (typeof toggleView === 'function') {
                toggleView();
            }
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

    // Pause feed button
    const pauseFeedBtn = document.getElementById('pause-feed');
    if (pauseFeedBtn) {
        pauseFeedBtn.addEventListener('click', () => {
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
            controlsPanel.classList.remove('hidden');
            // Adjust positions when settings shown
            if (sidebar) sidebar.style.top = '130px';
            if (mapContainer) mapContainer.style.top = '130px';
        } else {
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
            case ' ':
                e.preventDefault();
                toggleView();
                break;
            case 'r':
            case 'R':
                toggleAutoRotate();
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

    // Add click listeners to new items
    const items = feedContent.querySelectorAll('.attack-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            const index = item.dataset.index;
            if (index !== undefined && recentThreats[index]) {
                showAttackDetails(recentThreats[index]);
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

    return `
        <div class="attack-item ${severityClass}" data-index="${index}">
            <div class="attack-header">
                <span class="attack-time">${timeAgo}</span>
                <span class="attack-severity ${severityClass}">${threat.severity}</span>
            </div>
            <div class="attack-name">${threat.eventname}</div>
            <div class="attack-details">
                From: ${threat.sourceip} → ${threat.destinationip}<br>
                Source: ${threat.detectionsource}
            </div>
            <div class="attack-category">📁 ${threat.category}</div>
        </div>
    `;
}

/**
 * Toggle feed pause
 */
function toggleFeedPause() {
    window.feedPaused = !window.feedPaused;

    const pauseBtn = document.getElementById('pause-feed');
    const feedContent = document.getElementById('feed-content');

    if (window.feedPaused) {
        pauseBtn.innerHTML = '▶️';
        pauseBtn.title = 'Resume';
        if (feedContent) {
            feedContent.classList.add('paused');
        }
    } else {
        pauseBtn.innerHTML = '⏸';
        pauseBtn.title = 'Pause';
        if (feedContent) {
            feedContent.classList.remove('paused');
        }
    }
}

/**
 * Show attack details in modal
 */
function showAttackDetails(threat) {
    const modal = document.getElementById('attack-modal');
    const detailsDiv = document.getElementById('attack-details');

    if (!modal || !detailsDiv) return;

    // Build details HTML
    const html = `
        <div class="detail-row">
            <span class="detail-label">Event Name:</span>
            <span class="detail-value">${threat.eventname}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Timestamp:</span>
            <span class="detail-value">${threat.timestamp.toLocaleString()}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Source IP:</span>
            <span class="detail-value">${threat.sourceip}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Source Location:</span>
            <span class="detail-value">${getLocationString(threat.sourcelat, threat.sourcelon, threat.sourcename)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Destination IP:</span>
            <span class="detail-value">${threat.destinationip}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Destination Location:</span>
            <span class="detail-value">${getLocationString(threat.destlat, threat.destlon, threat.destinationname)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Volume:</span>
            <span class="detail-value">${threat.volume}/100</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Severity:</span>
            <span class="detail-value" style="color: ${getSeverityColor(threat.severity)}">${threat.severity.toUpperCase()}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Category:</span>
            <span class="detail-value" style="color: ${getCategoryColor(threat.category)}">${threat.category}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Detection Source:</span>
            <span class="detail-value">${threat.detectionsource}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="detail-value" style="color: ${threat.blocked !== false ? '#00ff00' : '#ff4444'}">${threat.blocked !== false ? 'BLOCKED' : 'ALLOWED'}</span>
        </div>
    `;

    detailsDiv.innerHTML = html;
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
 * Update Top 5 Attacker Locations list
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
                name: locKey
            };
        }
        locationCounts[locKey].count++;
    });

    const sortedLocations = Object.values(locationCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    let html = '';
    if (sortedLocations.length === 0) {
        html = '<div class="empty-list">No data available</div>';
    } else {
        html = '<div class="legend-title" style="margin-top: 15px; margin-bottom: 5px; font-weight: bold;">Top 5 Attacker Locations</div>';
        sortedLocations.forEach((loc, index) => {
            const isActive = typeof isFilterActive === 'function' && isFilterActive('location', loc.name);
            const activeClass = isActive ? 'disabled' : '';

            html += `
                <div class="attacker-row clickable ${activeClass}" data-location="${loc.name}">
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

    // Add click listeners to new elements
    const locationItems = listElement.querySelectorAll('.attacker-row.clickable');
    locationItems.forEach(item => {
        item.addEventListener('click', () => {
            const location = item.dataset.location;
            if (location && typeof toggleFilter === 'function') {
                toggleFilter('location', location);
                // UI update will happen on re-render
            }
        });
    });
}

// Export functions
if (typeof window !== 'undefined') {
    window.initUI = initUI;
    window.updateAttackFeed = updateAttackFeed;
    window.showAttackDetails = showAttackDetails;
    window.highlightAttackInFeed = highlightAttackInFeed;
    window.showCriticalNotification = showCriticalNotification;
    window.requestNotificationPermission = requestNotificationPermission;
    window.updateDebugBar = updateDebugBar;
    window.sortThreatsByPriority = sortThreatsByPriority;
    window.formatBytesClient = formatBytesClient;
    window.toggleSettingsPanel = toggleSettingsPanel;
    window.updateTopAttackers = updateTopAttackers;
}
