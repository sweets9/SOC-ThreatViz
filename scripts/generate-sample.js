#!/usr/bin/env node

/**
 * Sample data generator for Live Global Cyber Threat Map
 * Generates realistic threat data for demonstration purposes
 */

const fs = require('fs');
const path = require('path');

// Load configuration
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const csvPath = config.data.csvPath;

// Australian destination sites (major cities - primary targets)
const australianSites = [
    { city: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093 },
    { city: 'Melbourne', country: 'Australia', lat: -37.8136, lon: 144.9631 },
    { city: 'Brisbane', country: 'Australia', lat: -27.4698, lon: 153.0251 },
    { city: 'Perth', country: 'Australia', lat: -31.9505, lon: 115.8605 },
    { city: 'Adelaide', country: 'Australia', lat: -34.9285, lon: 138.6007 },
    { city: 'Canberra', country: 'Australia', lat: -35.2809, lon: 149.1300 },
    { city: 'Hobart', country: 'Australia', lat: -42.8821, lon: 147.3272 },
    { city: 'Darwin', country: 'Australia', lat: -12.4634, lon: 130.8456 }
];

// Source locations (global threat origins - all verified city coordinates)
const threatSources = [
    // Russia
    { city: 'Moscow', country: 'Russia', lat: 55.7558, lon: 37.6173 },
    { city: 'St Petersburg', country: 'Russia', lat: 59.9311, lon: 30.3609 },
    { city: 'Novosibirsk', country: 'Russia', lat: 55.0084, lon: 82.9357 },
    // China
    { city: 'Beijing', country: 'China', lat: 39.9042, lon: 116.4074 },
    { city: 'Shanghai', country: 'China', lat: 31.2304, lon: 121.4737 },
    { city: 'Shenzhen', country: 'China', lat: 22.5431, lon: 114.0579 },
    { city: 'Guangzhou', country: 'China', lat: 23.1291, lon: 113.2644 },
    { city: 'Chengdu', country: 'China', lat: 30.5728, lon: 104.0668 },
    // Iran
    { city: 'Tehran', country: 'Iran', lat: 35.6892, lon: 51.3890 },
    { city: 'Isfahan', country: 'Iran', lat: 32.6546, lon: 51.6680 },
    // North Korea
    { city: 'Pyongyang', country: 'North Korea', lat: 39.0392, lon: 125.7625 },
    // Europe
    { city: 'Berlin', country: 'Germany', lat: 52.5200, lon: 13.4050 },
    { city: 'Frankfurt', country: 'Germany', lat: 50.1109, lon: 8.6821 },
    { city: 'London', country: 'UK', lat: 51.5074, lon: -0.1278 },
    { city: 'Manchester', country: 'UK', lat: 53.4808, lon: -2.2426 },
    { city: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
    { city: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lon: 4.9041 },
    { city: 'Bucharest', country: 'Romania', lat: 44.4268, lon: 26.1025 },
    { city: 'Kiev', country: 'Ukraine', lat: 50.4501, lon: 30.5234 },
    { city: 'Warsaw', country: 'Poland', lat: 52.2297, lon: 21.0122 },
    // USA
    { city: 'New York', country: 'USA', lat: 40.7128, lon: -74.0060 },
    { city: 'Los Angeles', country: 'USA', lat: 34.0522, lon: -118.2437 },
    { city: 'San Francisco', country: 'USA', lat: 37.7749, lon: -122.4194 },
    { city: 'Chicago', country: 'USA', lat: 41.8781, lon: -87.6298 },
    { city: 'Houston', country: 'USA', lat: 29.7604, lon: -95.3698 },
    { city: 'Miami', country: 'USA', lat: 25.7617, lon: -80.1918 },
    { city: 'Seattle', country: 'USA', lat: 47.6062, lon: -122.3321 },
    { city: 'Las Vegas', country: 'USA', lat: 36.1699, lon: -115.1398 },
    // Americas
    { city: 'Toronto', country: 'Canada', lat: 43.6532, lon: -79.3832 },
    { city: 'Vancouver', country: 'Canada', lat: 49.2827, lon: -123.1207 },
    { city: 'Mexico City', country: 'Mexico', lat: 19.4326, lon: -99.1332 },
    { city: 'São Paulo', country: 'Brazil', lat: -23.5505, lon: -46.6333 },
    { city: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lon: -43.1729 },
    { city: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lon: -58.3816 },
    { city: 'Bogota', country: 'Colombia', lat: 4.7110, lon: -74.0721 },
    // Asia
    { city: 'Singapore', country: 'Singapore', lat: 1.3521, lon: 103.8198 },
    { city: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503 },
    { city: 'Osaka', country: 'Japan', lat: 34.6937, lon: 135.5023 },
    { city: 'Seoul', country: 'South Korea', lat: 37.5665, lon: 126.9780 },
    { city: 'Busan', country: 'South Korea', lat: 35.1796, lon: 129.0756 },
    { city: 'Mumbai', country: 'India', lat: 19.0760, lon: 72.8777 },
    { city: 'New Delhi', country: 'India', lat: 28.6139, lon: 77.2090 },
    { city: 'Bangalore', country: 'India', lat: 12.9716, lon: 77.5946 },
    { city: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.8231, lon: 106.6297 },
    { city: 'Hanoi', country: 'Vietnam', lat: 21.0278, lon: 105.8342 },
    { city: 'Bangkok', country: 'Thailand', lat: 13.7563, lon: 100.5018 },
    { city: 'Jakarta', country: 'Indonesia', lat: -6.2088, lon: 106.8456 },
    { city: 'Kuala Lumpur', country: 'Malaysia', lat: 3.1390, lon: 101.6869 },
    { city: 'Manila', country: 'Philippines', lat: 14.5995, lon: 120.9842 },
    { city: 'Taipei', country: 'Taiwan', lat: 25.0330, lon: 121.5654 },
    { city: 'Hong Kong', country: 'China', lat: 22.3193, lon: 114.1694 },
    // Middle East
    { city: 'Dubai', country: 'UAE', lat: 25.2048, lon: 55.2708 },
    { city: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lon: 46.6753 },
    { city: 'Istanbul', country: 'Turkey', lat: 41.0082, lon: 28.9784 },
    { city: 'Tel Aviv', country: 'Israel', lat: 32.0853, lon: 34.7818 },
    // Africa
    { city: 'Lagos', country: 'Nigeria', lat: 6.5244, lon: 3.3792 },
    { city: 'Cairo', country: 'Egypt', lat: 30.0444, lon: 31.2357 },
    { city: 'Johannesburg', country: 'South Africa', lat: -26.2041, lon: 28.0473 },
    { city: 'Cape Town', country: 'South Africa', lat: -33.9249, lon: 18.4241 },
    { city: 'Nairobi', country: 'Kenya', lat: -1.2921, lon: 36.8219 },
    { city: 'Casablanca', country: 'Morocco', lat: 33.5731, lon: -7.5898 }
];

// Attack categories and their event names
const attackTypes = {
    'Phishing Emails': [
        'Credential Harvesting Phish',
        'CEO Fraud Email',
        'Malicious Attachment Email',
        'Phishing Link Click Detected',
        'Spear Phishing Campaign'
    ],
    'Antivirus Malware': [
        'Ransomware Download Blocked',
        'Trojan Horse Detected',
        'Backdoor Malware Quarantined',
        'Cryptominer Detected',
        'Keylogger Prevented'
    ],
    'Botnet Activity': [
        'Generic BOT Net Activity',
        'Mirai Botnet Traffic',
        'DDoS Bot Command Detected',
        'C2 Server Communication',
        'Bot Infection Attempt'
    ],
    'Scanning Activity': [
        'Port Scan Detected',
        'Network Reconnaissance',
        'Vulnerability Scanning',
        'Service Enumeration Attempt',
        'Banner Grabbing Activity'
    ],
    'Infiltration Attempts': [
        'Apache RCE Vulnerability Exploit',
        'SQL Injection Attempt',
        'Remote Code Execution Try',
        'Privilege Escalation Detected',
        'Lateral Movement Blocked',
        'Zero-Day Exploit Attempt'
    ],
    'Web Gateway Threats': [
        'Malicious URL Blocked',
        'Drive-by Download Prevented',
        'Command Injection Blocked',
        'XSS Attack Detected',
        'Malware Distribution Site Blocked'
    ]
};

// Detection sources
const detectionSources = [
    'Splunk',
    'SIEM',
    'IDS',
    'Firewall',
    'Email Gateway',
    'Web Gateway',
    'Antivirus',
    'EDR'
];

// Severity levels with weights (more medium/high, fewer critical)
const severities = [
    { level: 'low', weight: 0.25 },
    { level: 'medium', weight: 0.40 },
    { level: 'high', weight: 0.25 },
    { level: 'critical', weight: 0.10 }
];

/**
 * Get random element from array
 */
function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get weighted random severity
 */
function randomSeverity() {
    const rand = Math.random();
    let cumulative = 0;

    for (const severity of severities) {
        cumulative += severity.weight;
        if (rand <= cumulative) {
            return severity.level;
        }
    }

    return 'medium';
}

/**
 * Generate random IP address
 */
function randomIP() {
    const octets = [];
    for (let i = 0; i < 4; i++) {
        // Avoid private IP ranges
        let octet = Math.floor(Math.random() * 256);
        if (i === 0 && (octet === 10 || octet === 192 || octet === 172)) {
            octet = Math.floor(Math.random() * 200) + 20;
        }
        octets.push(octet);
    }
    return octets.join('.');
}

/**
 * Generate random volume (0-100)
 */
function randomVolume(severity) {
    // Higher severity tends to have higher volume
    const baseVolume = {
        'low': [10, 40],
        'medium': [30, 70],
        'high': [60, 90],
        'critical': [75, 100]
    };

    const [min, max] = baseVolume[severity] || [20, 80];
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random timestamp within the last N hours
 */
function randomTimestamp(hoursAgo) {
    const now = new Date();
    const pastTime = now.getTime() - (Math.random() * hoursAgo * 60 * 60 * 1000);
    return new Date(pastTime).toISOString();
}

/**
 * Generate a single threat event
 */
function generateThreat(hoursAgo = 24) {
    // Select random category
    const category = randomElement(Object.keys(attackTypes));

    // Select random event name for that category
    const eventname = randomElement(attackTypes[category]);

    // Select severity
    const severity = randomSeverity();

    // Select source location (any global location)
    const source = randomElement(threatSources);

    // Select destination (70% Australian sites, 30% other locations)
    const dest = Math.random() < 0.7 ?
        randomElement(australianSites) :
        randomElement(threatSources);

    // Generate threat
    const threat = {
        timestamp: randomTimestamp(hoursAgo),
        eventname: eventname,
        sourceip: randomIP(),
        sourcelocation: `${source.lat},${source.lon}`,
        sourcecity: source.city,
        sourcecountry: source.country,
        destinationip: randomIP(),
        destinationlocation: `${dest.lat},${dest.lon}`,
        destinationcity: dest.city,
        destinationcountry: dest.country,
        volume: randomVolume(severity),
        severity: severity,
        category: category,
        detectionsource: randomElement(detectionSources),
        blocked: Math.random() < 0.95 ? 'true' : 'false'  // 95% blocked, 5% allowed
    };

    return threat;
}

/**
 * Generate CSV content with realistic severity distribution
 * Per 24h period: only 1 critical, 2 high, rest medium/low/informational
 */
function generateCSV(count, hoursAgo = 168) {
    const header = 'timestamp,eventname,sourceip,sourcelocation,sourcecity,sourcecountry,destinationip,destinationlocation,destinationcity,destinationcountry,volume,severity,category,detectionsource,blocked\n';

    let csv = header;

    // Calculate how many 24h periods we have
    const numDays = Math.ceil(hoursAgo / 24);

    // Track severity counts per day
    const dailySeverityCounts = {};
    for (let day = 0; day < numDays; day++) {
        dailySeverityCounts[day] = { critical: 0, high: 0 };
    }

    for (let i = 0; i < count; i++) {
        const threat = generateThreat(hoursAgo);

        // Calculate which day this threat falls into
        const hoursFromNow = parseFloat(threat.timestamp.slice(0, -1).split('T').join(' ').split(':').slice(0, 2).join(':'));
        const threatTime = new Date(threat.timestamp);
        const now = new Date();
        const hoursAgoThreat = (now - threatTime) / (1000 * 60 * 60);
        const day = Math.floor(hoursAgoThreat / 24);

        // Enforce severity limits per day
        if (threat.severity === 'critical') {
            if (dailySeverityCounts[day]?.critical >= 1) {
                threat.severity = 'medium';  // Downgrade to medium
            } else if (dailySeverityCounts[day]) {
                dailySeverityCounts[day].critical++;
            }
        } else if (threat.severity === 'high') {
            if (dailySeverityCounts[day]?.high >= 2) {
                threat.severity = 'medium';  // Downgrade to medium
            } else if (dailySeverityCounts[day]) {
                dailySeverityCounts[day].high++;
            }
        }

        // Escape fields that might contain commas
        const row = [
            threat.timestamp,
            `"${threat.eventname}"`,
            threat.sourceip,
            `"${threat.sourcelocation}"`,
            `"${threat.sourcecity}"`,
            `"${threat.sourcecountry}"`,
            threat.destinationip,
            `"${threat.destinationlocation}"`,
            `"${threat.destinationcity}"`,
            `"${threat.destinationcountry}"`,
            threat.volume,
            threat.severity,
            `"${threat.category}"`,
            threat.detectionsource,
            threat.blocked
        ].join(',');

        csv += row + '\n';
    }

    return csv;
}

/**
 * Main function
 */
function main() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   SOC Global Threat Visualiser - Data Generator         ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');

    // Parse command line arguments
    const args = process.argv.slice(2);
    const count = args[0] ? parseInt(args[0], 10) : 500;
    const hoursAgo = args[1] ? parseInt(args[1], 10) : 168; // Default: 7 days

    console.log(`Generating ${count} sample threat events...`);
    console.log(`Time range: Last ${hoursAgo} hours (${Math.round(hoursAgo / 24)} days)`);
    console.log('');

    // Generate CSV
    const csv = generateCSV(count, hoursAgo);

    // Ensure data directory exists
    const dataDir = path.dirname(csvPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`Created data directory: ${dataDir}`);
    }

    // Write to file
    fs.writeFileSync(csvPath, csv, 'utf8');

    console.log(`✓ Generated ${count} threats`);
    console.log(`✓ Saved to: ${csvPath}`);
    console.log('');

    // Show sample statistics
    const threats = csv.split('\n').slice(1).filter(line => line.trim());
    const stats = {
        critical: threats.filter(t => t.includes(',critical,')).length,
        high: threats.filter(t => t.includes(',high,')).length,
        medium: threats.filter(t => t.includes(',medium,')).length,
        low: threats.filter(t => t.includes(',low,')).length
    };

    console.log('Statistics:');
    console.log(`  Critical: ${stats.critical}`);
    console.log(`  High:     ${stats.high}`);
    console.log(`  Medium:   ${stats.medium}`);
    console.log(`  Low:      ${stats.low}`);
    console.log('');

    // Also create test and live CSV files
    const testCsvPath = csvPath.replace('.csv', '_test.csv');
    const liveCsvPath = csvPath.replace('.csv', '_live.csv');

    // Test data: full set
    fs.writeFileSync(testCsvPath, csv, 'utf8');
    console.log(`✓ Test data saved to: ${testCsvPath}`);

    // Live data: empty initially (ready for real data)
    const liveHeader = 'timestamp,eventname,sourceip,sourcelocation,sourcecity,sourcecountry,destinationip,destinationlocation,destinationcity,destinationcountry,volume,severity,category,detectionsource,blocked\n';
    if (!fs.existsSync(liveCsvPath)) {
        fs.writeFileSync(liveCsvPath, liveHeader, 'utf8');
        console.log(`✓ Live data file created: ${liveCsvPath}`);
    } else {
        console.log(`✓ Live data file exists: ${liveCsvPath}`);
    }

    console.log('');
    console.log('You can now start the server with: npm start');
    console.log('═══════════════════════════════════════════════════════════');
}

// Run main function
main();
