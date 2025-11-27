// API routes for threat data

const express = require('express');
const router = express.Router();
const { readThreatData, appendThreat, appendThreats, isValidThreat, filterByTimeframe, applyThreatDefaults, getCsvStats } = require('../utils/csv');
const { authenticate } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Application version
const APP_VERSION = '1.4.0';

// Get git commit hash
let COMMIT_HASH = 'dev';
try {
    COMMIT_HASH = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch (e) {
    // Not in git repo or git not available
}

let config = {};

// Load configuration
try {
    const configPath = path.join(__dirname, '../../config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error('Error loading config:', error);
    config = {
        data: {
            csvPath: './data/threat_data.csv',
            timeframes: {
                '1h': 3600000,
                '24h': 86400000,
                '7d': 604800000
            }
        }
    };
}

const csvPath = config.data.csvPath;
const testCsvPath = config.data.csvPath.replace('.csv', '_test.csv');
const liveCsvPath = config.data.csvPath.replace('.csv', '_live.csv');

/**
 * Get CSV path based on data mode
 */
function getCsvPathForMode(mode) {
    switch (mode) {
        case 'test':
            return testCsvPath;
        case 'live':
            return liveCsvPath;
        default:
            return csvPath; // Fallback to default
    }
}

/**
 * GET /api/threats
 * Retrieve threat data with optional filtering
 */
router.get('/threats', async (req, res) => {
    try {
        const timeframe = req.query.timeframe || '24h';
        const mode = req.query.mode || 'test';
        
        // Get the right CSV based on mode
        const targetCsvPath = getCsvPathForMode(mode);

        // Read threat data from CSV
        const threats = await readThreatData(targetCsvPath);

        // Filter by timeframe
        const timeframeMs = config.data.timeframes[timeframe] || config.data.timeframes['24h'];
        const filteredThreats = filterByTimeframe(threats, timeframeMs);

        // Return data
        res.json({
            success: true,
            count: filteredThreats.length,
            timeframe: timeframe,
            mode: mode,
            version: APP_VERSION,
            threats: filteredThreats
        });
    } catch (error) {
        console.error('Error retrieving threats:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve threat data'
        });
    }
});

/**
 * GET /api/stats
 * Get statistics about threat data including CSV info
 */
router.get('/stats', async (req, res) => {
    try {
        const mode = req.query.mode || 'test';
        const targetCsvPath = getCsvPathForMode(mode);
        
        const threats = await readThreatData(targetCsvPath);
        const csvStats = await getCsvStats(targetCsvPath);

        // Calculate statistics
        const stats = {
            total: threats.length,
            blocked: threats.filter(t => t.blocked !== false).length,
            allowed: threats.filter(t => t.blocked === false).length,
            bySeverity: {
                low: threats.filter(t => t.severity.toLowerCase() === 'low').length,
                medium: threats.filter(t => t.severity.toLowerCase() === 'medium').length,
                high: threats.filter(t => t.severity.toLowerCase() === 'high').length,
                critical: threats.filter(t => t.severity.toLowerCase() === 'critical').length
            },
            byCategory: {},
            csv: {
                entries: csvStats.entries,
                sizeBytes: csvStats.sizeBytes,
                lastModified: csvStats.lastModified
            },
            mode: mode,
            version: APP_VERSION
        };

        // Count by category
        const categories = [
            'Phishing Emails',
            'Antivirus Malware',
            'Botnet Activity',
            'Scanning Activity',
            'Infiltration Attempts',
            'Web Gateway Threats'
        ];

        categories.forEach(category => {
            stats.byCategory[category] = threats.filter(t => t.category === category).length;
        });

        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('Error retrieving stats:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve statistics'
        });
    }
});

/**
 * GET /api/info
 * Get application info including version and CSV stats
 */
router.get('/info', async (req, res) => {
    try {
        const mode = req.query.mode || 'test';
        const targetCsvPath = getCsvPathForMode(mode);
        const csvStats = await getCsvStats(targetCsvPath);

        res.json({
            success: true,
            appName: 'SOC Global Threat Visualiser',
            version: APP_VERSION,
            commit: COMMIT_HASH,
            versionFull: `${APP_VERSION}-${COMMIT_HASH}`,
            mode: mode,
            csv: {
                path: targetCsvPath,
                entries: csvStats.entries,
                sizeBytes: csvStats.sizeBytes,
                sizeFormatted: formatBytes(csvStats.sizeBytes),
                lastModified: csvStats.lastModified
            }
        });
    } catch (error) {
        console.error('Error retrieving info:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve application info'
        });
    }
});

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * POST /api/webhook/update
 * Update threat data via webhook (requires authentication)
 */
router.post('/webhook/update', authenticate, async (req, res) => {
    try {
        const threat = req.body;

        // Apply defaults for missing fields
        const threatWithDefaults = applyThreatDefaults(threat);

        // Validate threat data
        if (!isValidThreat(threatWithDefaults)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid threat data format',
                threat: threat
            });
        }

        // Ensure timestamp is set
        if (!threatWithDefaults.timestamp) {
            threatWithDefaults.timestamp = new Date().toISOString();
        }

        // Append to live CSV (webhooks always go to live data)
        await appendThreat(liveCsvPath, threatWithDefaults);

        res.json({
            success: true,
            message: 'Threat data updated successfully',
            threat: threatWithDefaults
        });
    } catch (error) {
        console.error('Error updating threat data:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update threat data'
        });
    }
});

/**
 * POST /api/webhook/bulk
 * Bulk update multiple threats via webhook (requires authentication)
 */
router.post('/webhook/bulk', authenticate, async (req, res) => {
    try {
        const { events } = req.body;

        if (!events || !Array.isArray(events)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Expected "events" array in request body'
            });
        }

        // Apply defaults and validate all threats
        const validThreats = [];
        const invalidThreats = [];

        events.forEach(threat => {
            // Apply defaults
            const threatWithDefaults = applyThreatDefaults(threat);

            if (isValidThreat(threatWithDefaults)) {
                // Ensure timestamp is set
                if (!threatWithDefaults.timestamp) {
                    threatWithDefaults.timestamp = new Date().toISOString();
                }
                validThreats.push(threatWithDefaults);
            } else {
                invalidThreats.push(threat);
            }
        });

        // Append valid threats to live CSV (webhooks always go to live data)
        if (validThreats.length > 0) {
            await appendThreats(liveCsvPath, validThreats);
        }

        res.json({
            success: true,
            message: `Processed ${events.length} events`,
            added: validThreats.length,
            rejected: invalidThreats.length,
            invalidThreats: invalidThreats
        });
    } catch (error) {
        console.error('Error bulk updating threat data:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to bulk update threat data'
        });
    }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: APP_VERSION
    });
});

module.exports = router;
