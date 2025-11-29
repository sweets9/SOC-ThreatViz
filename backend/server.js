// Main server file for Live Global Cyber Threat Map backend

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

// Application version - should match package.json, cli.js, and frontend
const APP_VERSION = '1.0.1';

// Load configuration
let config = {};
try {
    const configPath = path.join(__dirname, '../config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error('Error loading config:', error);
    process.exit(1);
}

// Import routes
const apiRoutes = require('./routes/api');

// Initialize Express app
const app = express();
const PORT = config.server.port || 3000;
const HOST = config.server.host || '0.0.0.0';

// Get whitelisted IPs from config
const whitelistedIPs = config.security.allowedIPs || ['127.0.0.1', '::1'];

/**
 * Check if an IP address is whitelisted
 */
function isWhitelistedIP(ip) {
    if (!ip) return false;
    
    // Normalize IP address (handle IPv6 mapped IPv4)
    const normalizedIP = ip.replace(/^::ffff:/, '');
    
    for (const allowedIP of whitelistedIPs) {
        // Exact match
        if (normalizedIP === allowedIP) return true;
        
        // Handle localhost variations
        if (allowedIP === '127.0.0.1' && (normalizedIP === '::1' || normalizedIP === 'localhost')) return true;
        if (allowedIP === '::1' && (normalizedIP === '127.0.0.1' || normalizedIP === 'localhost')) return true;
        
        // Handle CIDR notation (basic support for /8, /16, /24)
        if (allowedIP.includes('/')) {
            const [network, bits] = allowedIP.split('/');
            const maskBits = parseInt(bits, 10);
            
            if (maskBits === 8 || maskBits === 16 || maskBits === 24) {
                const networkParts = network.split('.').map(Number);
                const ipParts = normalizedIP.split('.').map(Number);
                
                if (ipParts.length === 4 && networkParts.length === 4) {
                    const octetsToCheck = maskBits / 8;
                    let matches = true;
                    for (let i = 0; i < octetsToCheck; i++) {
                        if (networkParts[i] !== ipParts[i]) {
                            matches = false;
                            break;
                        }
                    }
                    if (matches) return true;
                }
            }
        }
    }
    
    return false;
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,  // Allow Cesium.js to load
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: '*',  // In production, specify your domain
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting for API endpoints - skip for whitelisted IPs
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100,  // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
    skip: (req) => isWhitelistedIP(req.ip)  // Skip rate limiting for whitelisted IPs
});

// Stricter rate limiting for webhook endpoints - skip for whitelisted IPs
const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,  // 1 minute
    max: 30,  // Limit each IP to 30 requests per minute
    message: 'Too many webhook requests, please try again later',
    skip: (req) => isWhitelistedIP(req.ip)  // Skip rate limiting for whitelisted IPs
});

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy (important for correct IP detection behind reverse proxy)
app.set('trust proxy', 1);

// Logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const isWhitelisted = isWhitelistedIP(req.ip) ? ' [whitelisted]' : '';
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}${isWhitelisted}`);
    next();
});

// Static files (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api', apiLimiter, apiRoutes);

// Apply stricter rate limiting to webhook endpoints
app.use('/api/webhook', webhookLimiter);

// Serve config.json for frontend (only destinationLabels for security)
app.get('/config.json', (req, res) => {
    res.json({
        destinationLabels: config.destinationLabels || {}
    });
});

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.path} not found`
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
    });
});

// Ensure data directory exists
const dataDir = path.dirname(config.data.csvPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory: ${dataDir}`);
}

// Ensure CSV file exists (create empty one if not)
if (!fs.existsSync(config.data.csvPath)) {
    const header = 'timestamp,eventname,sourceip,sourcelocation,destinationip,destinationlocation,volume,severity,category,detectionsource\n';
    fs.writeFileSync(config.data.csvPath, header, 'utf8');
    console.log(`Created empty CSV file: ${config.data.csvPath}`);
}

// Start server
app.listen(PORT, HOST, () => {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   SOC Global Threat Visualiser - Backend Server v1.4.0  ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`📊 Frontend available at http://localhost:${PORT}`);
    console.log(`🔒 API Token: ${config.security.apiToken.substring(0, 10)}...`);
    console.log(`📁 CSV Path: ${config.data.csvPath}`);
    console.log(`🛡️  Whitelisted IPs (no rate limit): ${whitelistedIPs.join(', ')}`);
    console.log('');
    console.log('API Endpoints:');
    console.log(`  GET  /api/threats       - Retrieve threat data`);
    console.log(`  GET  /api/stats         - Get statistics`);
    console.log(`  GET  /api/info          - Get application info`);
    console.log(`  POST /api/webhook/update - Update single threat (auth required)`);
    console.log(`  POST /api/webhook/bulk   - Bulk update threats (auth required)`);
    console.log('');
    console.log('Press Ctrl+C to stop the server');
    console.log('═══════════════════════════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received, shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
