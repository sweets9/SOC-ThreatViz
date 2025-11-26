// CSV utility functions for threat data management

const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

// CSV header definition including blocked/allowed columns
const CSV_HEADERS = [
    { id: 'timestamp', title: 'timestamp' },
    { id: 'eventname', title: 'eventname' },
    { id: 'sourceip', title: 'sourceip' },
    { id: 'sourcelocation', title: 'sourcelocation' },
    { id: 'sourcecity', title: 'sourcecity' },
    { id: 'sourcecountry', title: 'sourcecountry' },
    { id: 'destinationip', title: 'destinationip' },
    { id: 'destinationlocation', title: 'destinationlocation' },
    { id: 'destinationcity', title: 'destinationcity' },
    { id: 'destinationcountry', title: 'destinationcountry' },
    { id: 'volume', title: 'volume' },
    { id: 'severity', title: 'severity' },
    { id: 'category', title: 'category' },
    { id: 'detectionsource', title: 'detectionsource' },
    { id: 'blocked', title: 'blocked' }
];

/**
 * Parse a value as boolean with a default
 * Handles strings like 'true', 'false', 'yes', 'no', '1', '0'
 */
function parseBoolean(value, defaultValue = true) {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    const strValue = String(value).toLowerCase().trim();
    if (strValue === 'true' || strValue === 'yes' || strValue === '1') {
        return true;
    }
    if (strValue === 'false' || strValue === 'no' || strValue === '0') {
        return false;
    }
    return defaultValue;
}

/**
 * Read threat data from CSV file
 */
function readThreatData(csvPath) {
    return new Promise((resolve, reject) => {
        const threats = [];

        if (!fs.existsSync(csvPath)) {
            console.warn(`CSV file not found: ${csvPath}`);
            return resolve([]);
        }

        fs.createReadStream(csvPath)
            .pipe(csv({
                skipEmptyLines: true,
                trim: true
            }))
            .on('data', (row) => {
                try {
                    // Validate and parse row with defaults for missing fields
                    const threat = {
                        timestamp: row.timestamp || new Date().toISOString(),
                        eventname: row.eventname || 'Unknown Event',
                        sourceip: row.sourceip || '0.0.0.0',
                        sourcelocation: row.sourcelocation || '0,0',
                        sourcecity: row.sourcecity || 'Unknown',
                        sourcecountry: row.sourcecountry || 'Unknown',
                        destinationip: row.destinationip || '0.0.0.0',
                        destinationlocation: row.destinationlocation || '-25.0,133.0',
                        destinationcity: row.destinationcity || 'Unknown',
                        destinationcountry: row.destinationcountry || 'Unknown',
                        volume: parseInt(row.volume, 10) || 50,
                        severity: row.severity || 'medium',
                        category: row.category || 'Scanning Activity',
                        detectionsource: row.detectionsource || 'Unknown',
                        blocked: parseBoolean(row.blocked, true)  // Default to blocked
                    };

                    // Basic validation
                    if (isValidThreat(threat)) {
                        threats.push(threat);
                    } else {
                        console.warn('Invalid threat data:', threat);
                    }
                } catch (error) {
                    console.error('Error parsing CSV row:', error);
                }
            })
            .on('end', () => {
                console.log(`Loaded ${threats.length} threats from CSV`);
                resolve(threats);
            })
            .on('error', (error) => {
                console.error('Error reading CSV file:', error);
                reject(error);
            });
    });
}

/**
 * Write threat data to CSV file
 */
async function writeThreatData(csvPath, threats) {
    try {
        const csvWriter = createObjectCsvWriter({
            path: csvPath,
            header: CSV_HEADERS
        });

        await csvWriter.writeRecords(threats);
        console.log(`Wrote ${threats.length} threats to CSV`);

        return true;
    } catch (error) {
        console.error('Error writing CSV file:', error);
        throw error;
    }
}

/**
 * Append a single threat to CSV file
 */
async function appendThreat(csvPath, threat) {
    try {
        // Read existing data
        const existingThreats = await readThreatData(csvPath);

        // Apply defaults
        const threatWithDefaults = applyThreatDefaults(threat);

        // Add new threat
        existingThreats.unshift(threatWithDefaults);

        // Clean up old data (older than 7 days)
        const cleanedThreats = cleanupOldThreats(existingThreats);

        // Keep only the most recent threats (limit to 10,000)
        const limitedThreats = cleanedThreats.slice(0, 10000);

        // Write back to file
        await writeThreatData(csvPath, limitedThreats);

        return true;
    } catch (error) {
        console.error('Error appending threat to CSV:', error);
        throw error;
    }
}

/**
 * Append multiple threats to CSV file
 */
async function appendThreats(csvPath, threats) {
    try {
        // Read existing data
        const existingThreats = await readThreatData(csvPath);

        // Apply defaults to all new threats
        const threatsWithDefaults = threats.map(applyThreatDefaults);

        // Add new threats
        const allThreats = [...threatsWithDefaults, ...existingThreats];

        // Clean up old data (older than 7 days)
        const cleanedThreats = cleanupOldThreats(allThreats);

        // Keep only the most recent threats (limit to 10,000)
        const limitedThreats = cleanedThreats.slice(0, 10000);

        // Write back to file
        await writeThreatData(csvPath, limitedThreats);

        return true;
    } catch (error) {
        console.error('Error appending threats to CSV:', error);
        throw error;
    }
}

/**
 * Apply default values to a threat object
 */
function applyThreatDefaults(threat) {
    return {
        timestamp: threat.timestamp || new Date().toISOString(),
        eventname: threat.eventname || 'Unknown Event',
        sourceip: threat.sourceip || '0.0.0.0',
        sourcelocation: threat.sourcelocation || '0,0',
        sourcecity: threat.sourcecity || 'Unknown',
        sourcecountry: threat.sourcecountry || 'Unknown',
        destinationip: threat.destinationip || '0.0.0.0',
        destinationlocation: threat.destinationlocation || '-25.0,133.0',
        destinationcity: threat.destinationcity || 'Unknown',
        destinationcountry: threat.destinationcountry || 'Unknown',
        volume: threat.volume !== undefined ? parseInt(threat.volume, 10) : 50,
        severity: threat.severity || 'medium',
        category: threat.category || 'Scanning Activity',
        detectionsource: threat.detectionsource || 'Unknown',
        blocked: parseBoolean(threat.blocked, true)  // Default to blocked if not specified
    };
}

/**
 * Clean up threats older than 7 days
 */
function cleanupOldThreats(threats) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const cleaned = threats.filter(threat => {
        try {
            const threatTime = new Date(threat.timestamp);
            return threatTime >= sevenDaysAgo;
        } catch (e) {
            return false;
        }
    });

    if (cleaned.length < threats.length) {
        console.log(`Cleaned up ${threats.length - cleaned.length} threats older than 7 days`);
    }

    return cleaned;
}

/**
 * Get CSV file statistics
 */
async function getCsvStats(csvPath) {
    try {
        const threats = await readThreatData(csvPath);
        const stats = fs.statSync(csvPath);

        return {
            entries: threats.length,
            sizeBytes: stats.size,
            lastModified: stats.mtime
        };
    } catch (error) {
        return {
            entries: 0,
            sizeBytes: 0,
            lastModified: null
        };
    }
}

/**
 * Validate threat data
 */
function isValidThreat(threat) {
    // Check required fields (with more lenient validation since we have defaults)
    if (!threat.timestamp || !threat.eventname || !threat.sourceip ||
        !threat.destinationip || !threat.sourcelocation ||
        !threat.destinationlocation) {
        return false;
    }

    // Validate timestamp
    try {
        new Date(threat.timestamp);
    } catch (error) {
        return false;
    }

    // Validate locations (should be lat,lon format)
    if (!isValidLocation(threat.sourcelocation) ||
        !isValidLocation(threat.destinationlocation)) {
        return false;
    }

    // Validate volume (should be 0-100) - be more lenient
    const volume = parseInt(threat.volume, 10);
    if (isNaN(volume)) {
        return false;
    }

    // Validate severity
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (threat.severity && !validSeverities.includes(threat.severity.toLowerCase())) {
        return false;
    }

    // Validate category (be more lenient - accept if missing)
    const validCategories = [
        'Phishing Emails',
        'Antivirus Malware',
        'Botnet Activity',
        'Scanning Activity',
        'Infiltration Attempts',
        'Web Gateway Threats'
    ];
    if (threat.category && !validCategories.includes(threat.category)) {
        return false;
    }

    return true;
}

/**
 * Validate location format (lat,lon)
 */
function isValidLocation(location) {
    if (typeof location !== 'string') return false;

    const parts = location.split(',');
    if (parts.length !== 2) return false;

    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);

    // Check if valid coordinates
    if (isNaN(lat) || isNaN(lon)) return false;
    if (lat < -90 || lat > 90) return false;
    if (lon < -180 || lon > 180) return false;

    return true;
}

/**
 * Filter threats by timeframe
 */
function filterByTimeframe(threats, timeframeMs) {
    const now = new Date();
    const cutoffTime = new Date(now - timeframeMs);

    return threats.filter(threat => {
        const threatTime = new Date(threat.timestamp);
        return threatTime >= cutoffTime;
    });
}

module.exports = {
    readThreatData,
    writeThreatData,
    appendThreat,
    appendThreats,
    isValidThreat,
    isValidLocation,
    filterByTimeframe,
    applyThreatDefaults,
    cleanupOldThreats,
    getCsvStats,
    parseBoolean
};
