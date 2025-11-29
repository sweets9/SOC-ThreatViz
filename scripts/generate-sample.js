#!/usr/bin/env node

/**
 * Sample data generator for Live Global Cyber Threat Map
 * Generates realistic threat data for demonstration purposes
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load configuration
const configPath = path.join(__dirname, '../config.json');
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const csvPath = config.data.csvPath;

// Australian destination sites with structured IP ranges
// Format: 200.200.X.1-5 where X = city index
const australianSites = [
    { city: 'Adelaide', country: 'Australia', lat: -34.9285, lon: 138.6007, ipRange: 1 },
    { city: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093, ipRange: 2 },
    { city: 'Melbourne', country: 'Australia', lat: -37.8136, lon: 144.9631, ipRange: 3 },
    { city: 'Brisbane', country: 'Australia', lat: -27.4698, lon: 153.0251, ipRange: 4 },
    { city: 'Perth', country: 'Australia', lat: -31.9505, lon: 115.8605, ipRange: 5 },
    { city: 'Canberra', country: 'Australia', lat: -35.2809, lon: 149.1300, ipRange: 6 },
    { city: 'Hobart', country: 'Australia', lat: -42.8821, lon: 147.3272, ipRange: 7 },
    { city: 'Darwin', country: 'Australia', lat: -12.4634, lon: 130.8456, ipRange: 8 }
];

// Server types for each IP within a city range
const serverTypes = [
    'Web Server',
    'Load Balancer',
    'VPN Gateway',
    'Mail Server',
    'Database Server'
];

// Common services and their ports - port and service name are always aligned
const services = [
    { port: 22, name: 'SSH' },
    { port: 23, name: 'Telnet' },
    { port: 25, name: 'SMTP' },
    { port: 53, name: 'DNS' },
    { port: 80, name: 'HTTP' },
    { port: 110, name: 'POP3' },
    { port: 143, name: 'IMAP' },
    { port: 443, name: 'HTTPS' },
    { port: 445, name: 'SMB' },
    { port: 993, name: 'IMAPS' },
    { port: 995, name: 'POP3S' },
    { port: 1433, name: 'MSSQL' },
    { port: 1521, name: 'Oracle' },
    { port: 3306, name: 'MySQL' },
    { port: 3389, name: 'RDP' },
    { port: 5432, name: 'PostgreSQL' },
    { port: 5900, name: 'VNC' },
    { port: 6379, name: 'Redis' },
    { port: 8080, name: 'HTTP-Proxy' },
    { port: 8443, name: 'HTTPS-Alt' },
    { port: 27017, name: 'MongoDB' }
];

// Helper function to get service by port (ensures alignment)
function getServiceByPort(port) {
    return services.find(s => s.port === port) || { port: port, name: `Port ${port}` };
}

// Email addresses with associated locations (for phishing/email threats)
const emailAddresses = [
    { email: 'john.smith@company.com', city: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093 },
    { email: 'sarah.jones@company.com', city: 'Melbourne', country: 'Australia', lat: -37.8136, lon: 144.9631 },
    { email: 'michael.brown@company.com', city: 'Brisbane', country: 'Australia', lat: -27.4698, lon: 153.0251 },
    { email: 'emily.davis@company.com', city: 'Perth', country: 'Australia', lat: -31.9505, lon: 115.8605 },
    { email: 'david.wilson@company.com', city: 'Adelaide', country: 'Australia', lat: -34.9285, lon: 138.6007 },
    { email: 'lisa.anderson@company.com', city: 'Canberra', country: 'Australia', lat: -35.2809, lon: 149.1300 },
    { email: 'james.taylor@company.com', city: 'Hobart', country: 'Australia', lat: -42.8821, lon: 147.3272 },
    { email: 'jennifer.martin@company.com', city: 'Darwin', country: 'Australia', lat: -12.4634, lon: 130.8456 },
    { email: 'robert.thomas@company.com', city: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093 },
    { email: 'patricia.jackson@company.com', city: 'Melbourne', country: 'Australia', lat: -37.8136, lon: 144.9631 },
    { email: 'william.white@company.com', city: 'Brisbane', country: 'Australia', lat: -27.4698, lon: 153.0251 },
    { email: 'linda.harris@company.com', city: 'Perth', country: 'Australia', lat: -31.9505, lon: 115.8605 },
    { email: 'richard.clark@company.com', city: 'Adelaide', country: 'Australia', lat: -34.9285, lon: 138.6007 },
    { email: 'barbara.lewis@company.com', city: 'Canberra', country: 'Australia', lat: -35.2809, lon: 149.1300 },
    { email: 'joseph.robinson@company.com', city: 'Hobart', country: 'Australia', lat: -42.8821, lon: 147.3272 },
    { email: 'susan.walker@company.com', city: 'Darwin', country: 'Australia', lat: -12.4634, lon: 130.8456 },
    { email: 'thomas.young@company.com', city: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093 },
    { email: 'jessica.king@company.com', city: 'Melbourne', country: 'Australia', lat: -37.8136, lon: 144.9631 },
    { email: 'charles.wright@company.com', city: 'Brisbane', country: 'Australia', lat: -27.4698, lon: 153.0251 },
    { email: 'sarah.lopez@company.com', city: 'Perth', country: 'Australia', lat: -31.9505, lon: 115.8605 }
];

// Generate destination labels mapping
function generateDestinationLabels() {
    const labels = {};
    australianSites.forEach(site => {
        for (let i = 1; i <= 5; i++) {
            const ip = `200.200.${site.ipRange}.${i}`;
            labels[ip] = `${site.city} ${serverTypes[i - 1]}`;
        }
    });
    return labels;
}

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
 * Generate structured destination IP for Australian sites
 */
function generateDestinationIP(site) {
    if (site.ipRange) {
        // Use structured IP: 200.200.X.1-5
        const lastOctet = Math.floor(Math.random() * 5) + 1;
        return `200.200.${site.ipRange}.${lastOctet}`;
    }
    return randomIP();
}

/**
 * Generate random volume (0-100)
 * Volume is now independent of severity - it represents "attack count/intensity"
 * The severity value comes from the SIEM
 */
function randomVolume() {
    // Random volume between 10 and 100
    // Most attacks are in the 20-60 range
    const rand = Math.random();
    if (rand < 0.3) {
        // 30% small volume
        return Math.floor(Math.random() * 30) + 10;
    } else if (rand < 0.8) {
        // 50% medium volume
        return Math.floor(Math.random() * 40) + 30;
    } else {
        // 20% high volume
        return Math.floor(Math.random() * 30) + 70;
    }
}

/**
 * Generate random timestamp within the last N hours
 * Distributed across the time range
 */
function randomTimestamp(hoursAgo) {
    const now = Date.now();
    const hoursAgoMs = hoursAgo * 60 * 60 * 1000;
    const randomOffset = Math.random() * hoursAgoMs;
    const pastTime = now - randomOffset;
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

    // Select destination - ONLY defensive (Australian) sites
    const dest = randomElement(australianSites);

    // Determine if blocked or allowed based on severity
    // Low severity: 50% allowed, 50% blocked
    // Other severities: 95% blocked, 5% allowed
    let blocked;
    if (severity === 'low') {
        blocked = Math.random() < 0.5 ? 'true' : 'false';  // 50% blocked, 50% allowed
    } else {
        blocked = Math.random() < 0.95 ? 'true' : 'false';  // 95% blocked, 5% allowed
    }

    // Determine if this is an email-based threat (for Phishing Emails category)
    // For phishing emails, randomly use email addresses (80% chance) or IP addresses (20% chance)
    const isEmailThreat = category === 'Phishing Emails' && Math.random() < 0.8; // 80% of phishing use emails
    
    let destinationip, destinationlocation, destinationcity, destinationcountry, destinationport, destinationservice;
    
    if (isEmailThreat) {
        // Use email address as target for phishing emails
        const emailTarget = randomElement(emailAddresses);
        destinationip = emailTarget.email;
        destinationlocation = `${emailTarget.lat},${emailTarget.lon}`;
        destinationcity = emailTarget.city;
        destinationcountry = emailTarget.country;
        // Email threats typically use SMTP (port 25) or IMAP/POP3 - randomly select
        const emailServices = [
            { port: 25, name: 'SMTP' },
            { port: 143, name: 'IMAP' },
            { port: 110, name: 'POP3' },
            { port: 993, name: 'IMAPS' },
            { port: 995, name: 'POP3S' }
        ];
        const emailService = randomElement(emailServices);
        destinationport = emailService.port;
        destinationservice = emailService.name;
    } else {
        // Use IP address as target (for non-phishing or phishing that didn't get email)
        destinationip = generateDestinationIP(dest);
        destinationlocation = `${dest.lat},${dest.lon}`;
        destinationcity = dest.city;
        destinationcountry = dest.country;
        // Always generate a service/port - randomly select from available services
        // Ensure service name matches port
        const service = randomElement(services);
        destinationport = service.port;
        destinationservice = service.name;
    }

    // Generate threat
    const threat = {
        timestamp: randomTimestamp(hoursAgo),
        eventname: eventname,
        sourceip: randomIP(),
        sourcelocation: `${source.lat},${source.lon}`,
        sourcecity: source.city,
        sourcecountry: source.country,
        destinationip: destinationip,
        destinationlocation: destinationlocation,
        destinationcity: destinationcity,
        destinationcountry: destinationcountry,
        destinationport: destinationport,
        destinationservice: destinationservice,
        volume: randomVolume(),
        severity: severity,
        category: category,
        detectionsource: randomElement(detectionSources),
        blocked: blocked
    };

    return threat;
}

/**
 * Generate CSV content with realistic severity distribution
 * Per 24h period: 2-5 critical, 3-6 high (randomized), rest medium/low
 * At least 1 critical and 1 high must be allowed (unblocked) per day for testing
 */
function generateCSV(count, hoursAgo = 168) {
    const header = 'timestamp,eventname,sourceip,sourcelocation,sourcecity,sourcecountry,destinationip,destinationlocation,destinationcity,destinationcountry,destinationport,destinationservice,volume,severity,category,detectionsource,blocked\n';

    let csv = header;

    // Calculate how many 24h periods we have
    const numDays = Math.ceil(hoursAgo / 24);

    // Track severity counts and limits per day (randomized limits)
    const dailySeverityCounts = {};
    for (let day = 0; day < numDays; day++) {
        dailySeverityCounts[day] = {
            critical: 0,
            high: 0,
            criticalUnblocked: 0,
            highUnblocked: 0,
            // Random limits: 2-5 critical, 3-6 high per day
            criticalLimit: Math.floor(Math.random() * 4) + 2,  // 2-5
            highLimit: Math.floor(Math.random() * 4) + 3       // 3-6
        };
    }

    for (let i = 0; i < count; i++) {
        const threat = generateThreat(hoursAgo);

        // Calculate which day this threat falls into
        const threatTime = new Date(threat.timestamp);
        const now = new Date();
        const hoursAgoThreat = (now - threatTime) / (1000 * 60 * 60);
        const day = Math.floor(hoursAgoThreat / 24);

        // Enforce severity limits per day (randomized)
        if (threat.severity === 'critical') {
            if (dailySeverityCounts[day]?.critical >= dailySeverityCounts[day]?.criticalLimit) {
                threat.severity = 'medium';  // Downgrade to medium
            } else if (dailySeverityCounts[day]) {
                dailySeverityCounts[day].critical++;

                // Ensure at least 1 unblocked critical per day for Risk Focus testing
                if (dailySeverityCounts[day].criticalUnblocked === 0) {
                    threat.blocked = 'false';  // Force unblocked
                    dailySeverityCounts[day].criticalUnblocked++;
                }
            }
        } else if (threat.severity === 'high') {
            if (dailySeverityCounts[day]?.high >= dailySeverityCounts[day]?.highLimit) {
                threat.severity = 'medium';  // Downgrade to medium
            } else if (dailySeverityCounts[day]) {
                dailySeverityCounts[day].high++;

                // Ensure at least 1 unblocked high per day for Risk Focus testing
                if (dailySeverityCounts[day].highUnblocked === 0) {
                    threat.blocked = 'false';  // Force unblocked
                    dailySeverityCounts[day].highUnblocked++;
                }
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
            threat.destinationport,
            threat.destinationservice,
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
 * Ask user a yes/no question
 */
function askQuestion(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase().startsWith('y'));
        });
    });
}

/**
 * Update config with new destination labels
 */
function updateDestinationLabels() {
    const newLabels = generateDestinationLabels();
    config.destinationLabels = newLabels;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    
    console.log('');
    console.log('✓ Updated destination IP labels in config.json:');
    console.log('  IP Address Range    → Server Type');
    console.log('  ─────────────────────────────────────────');
    australianSites.forEach(site => {
        console.log(`  200.200.${site.ipRange}.1-5      → ${site.city} Servers`);
    });
    console.log('');
}

/**
 * Main function
 */
async function main() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   SOC Global Threat Visualiser - Data Generator         ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');

    // Parse command line arguments
    const args = process.argv.slice(2);
    const skipPrompt = args.includes('--yes') || args.includes('-y');
    // Filter out flags to get numeric arguments
    const numericArgs = args.filter(a => !a.startsWith('-'));
    const count = numericArgs[0] ? parseInt(numericArgs[0], 10) : 2000;
    const hoursAgo = numericArgs[1] ? parseInt(numericArgs[1], 10) : 168; // Default: 7 days

    // Show IP structure info
    console.log('Destination IP Structure:');
    console.log('  200.200.1.1-5 → Adelaide servers');
    console.log('  200.200.2.1-5 → Sydney servers');
    console.log('  200.200.3.1-5 → Melbourne servers');
    console.log('  200.200.4.1-5 → Brisbane servers');
    console.log('  200.200.5.1-5 → Perth servers');
    console.log('  200.200.6.1-5 → Canberra servers');
    console.log('  200.200.7.1-5 → Hobart servers');
    console.log('  200.200.8.1-5 → Darwin servers');
    console.log('');

    // Ask about updating IP labels
    let updateLabels = skipPrompt;
    if (!skipPrompt) {
        updateLabels = await askQuestion('Update IP → Server Type mapping in config.json? (y/n): ');
    }

    if (updateLabels) {
        updateDestinationLabels();
    }

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
