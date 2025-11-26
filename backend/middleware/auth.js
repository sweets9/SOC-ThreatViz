// Authentication middleware for API endpoints

const ipRangeCheck = require('ip-range-check');
const fs = require('fs');
const path = require('path');

let config = {};

// Load configuration
try {
    const configPath = path.join(__dirname, '../../config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error('Error loading config:', error);
    config = {
        security: {
            apiToken: 'default-token',
            allowedIPs: ['127.0.0.1', '::1']
        }
    };
}

/**
 * Middleware to verify API token
 */
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'No authorization header provided'
        });
    }

    // Expected format: "Bearer <token>"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid authorization header format. Expected: Bearer <token>'
        });
    }

    const token = parts[1];
    const expectedToken = config.security.apiToken;

    if (token !== expectedToken) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid API token'
        });
    }

    next();
}

/**
 * Middleware to verify IP address is in whitelist
 */
function verifyIP(req, res, next) {
    const clientIP = req.ip || req.connection.remoteAddress;
    const allowedIPs = config.security.allowedIPs || [];

    // Clean up IPv6-mapped IPv4 addresses
    let cleanIP = clientIP;
    if (clientIP.startsWith('::ffff:')) {
        cleanIP = clientIP.substring(7);
    }

    // Check if IP is in allowed list
    let isAllowed = false;

    for (const allowedIP of allowedIPs) {
        try {
            // Check if it's a range (CIDR notation) or single IP
            if (allowedIP.includes('/') || allowedIP.includes('-')) {
                if (ipRangeCheck(cleanIP, allowedIP)) {
                    isAllowed = true;
                    break;
                }
            } else {
                // Direct IP comparison
                if (cleanIP === allowedIP || clientIP === allowedIP) {
                    isAllowed = true;
                    break;
                }
            }
        } catch (error) {
            console.error(`Error checking IP ${cleanIP} against ${allowedIP}:`, error);
        }
    }

    if (!isAllowed) {
        console.warn(`Blocked request from unauthorized IP: ${clientIP}`);
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Your IP address is not authorized to access this endpoint'
        });
    }

    next();
}

/**
 * Combined authentication middleware (token + IP)
 */
function authenticate(req, res, next) {
    verifyIP(req, res, () => {
        verifyToken(req, res, next);
    });
}

module.exports = {
    verifyToken,
    verifyIP,
    authenticate
};
