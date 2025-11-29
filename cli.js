#!/usr/bin/env node

/**
 * CLI Menu for SOC Global Threat Visualiser
 * Provides easy access to common operations
 */

const readline = require('readline');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Application version - single source of truth
const APP_VERSION = '1.0.1';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    magenta: '\x1b[35m'
};

/**
 * Print colored text
 */
function print(text, color = 'reset') {
    console.log(`${colors[color]}${text}${colors.reset}`);
}

/**
 * Print the application banner
 */
function printBanner() {
    console.clear();
    print('╔═════════════════════════════════════════════════╗', 'cyan');
    print(`║  SOC Threat Visualiser CLI v${APP_VERSION}             ║`, 'cyan');
    print('╠═════════════════════════════════════════════════╣', 'cyan');
}

/**
 * Print the main menu
 */
function printMenu() {
    print('║ 1. Start Server      5. Clear Live Data        ║', 'green');
    print('║ 2. Generate Data     6. Show Config            ║', 'green');
    print('║ 3. Dev Server        7. Health Check           ║', 'green');
    print('║ 4. View Stats        8. Exit                   ║', 'green');
    print('╚═════════════════════════════════════════════════╝', 'cyan');
}

/**
 * Start the backend server
 */
function startServer() {
    print('\nStarting server...', 'cyan');
    const server = spawn('node', ['backend/server.js'], {
        stdio: 'inherit',
        cwd: process.cwd()
    });

    server.on('error', (err) => {
        print(`Error starting server: ${err.message}`, 'red');
    });

    server.on('close', (code) => {
        print(`\nServer exited with code ${code}`, 'yellow');
        promptMenu();
    });
}

/**
 * Start development server with nodemon
 */
function startDevServer() {
    print('\nStarting development server...', 'cyan');
    const server = spawn('npx', ['nodemon', 'backend/server.js'], {
        stdio: 'inherit',
        cwd: process.cwd(),
        shell: true
    });

    server.on('error', (err) => {
        print(`Error starting dev server: ${err.message}`, 'red');
    });

    server.on('close', (code) => {
        print(`\nDev server exited with code ${code}`, 'yellow');
        promptMenu();
    });
}

/**
 * Generate sample data
 */
function generateSampleData() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    print('\nGenerate Sample Data', 'cyan');
    print('═══════════════════', 'cyan');

    rl.question('Number of threat events to generate (default: 2000): ', (countInput) => {
        const count = parseInt(countInput) || 2000;
        
        rl.question('Time range in hours (default: 168 = 7 days): ', (hoursInput) => {
            const hours = parseInt(hoursInput) || 168;
            rl.close();

            print(`\nGenerating ${count} threats over ${hours} hours...`, 'yellow');
            
            try {
                const result = execSync(`node scripts/generate-sample.js ${count} ${hours}`, {
                    encoding: 'utf8',
                    cwd: process.cwd()
                });
                console.log(result);
                print('Sample data generated successfully!', 'green');
            } catch (err) {
                print(`Error generating data: ${err.message}`, 'red');
            }

            setTimeout(promptMenu, 2000);
        });
    });
}

/**
 * View statistics
 */
async function viewStatistics() {
    print('\nThreat Data Statistics', 'cyan');
    print('══════════════════════', 'cyan');

    try {
        // Try to load the config and read CSV files directly
        const configPath = path.join(process.cwd(), 'config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        const testCsvPath = config.data.csvPath.replace('.csv', '_test.csv');
        const liveCsvPath = config.data.csvPath.replace('.csv', '_live.csv');

        // Count entries in each file
        const countEntries = (filePath) => {
            if (!fs.existsSync(filePath)) return 0;
            const content = fs.readFileSync(filePath, 'utf8');
            return content.split('\n').filter(line => line.trim()).length - 1; // Minus header
        };

        const testCount = countEntries(testCsvPath);
        const liveCount = countEntries(liveCsvPath);

        console.log('');
        print(`Test Data:  ${testCount} entries`, 'green');
        print(`Live Data:  ${liveCount} entries`, 'yellow');
        print(`Total:      ${testCount + liveCount} entries`, 'bright');
        console.log('');

        // Try to get more stats from the API if server is running
        try {
            const http = require('http');
            const statsPromise = new Promise((resolve, reject) => {
                http.get('http://localhost:3001/api/stats?mode=test', (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(e);
                        }
                    });
                }).on('error', reject);
            });

            const stats = await statsPromise;
            if (stats.success) {
                print('Severity Distribution (Test Data):', 'cyan');
                console.log(`  Critical: ${stats.stats.bySeverity.critical}`);
                console.log(`  High:     ${stats.stats.bySeverity.high}`);
                console.log(`  Medium:   ${stats.stats.bySeverity.medium}`);
                console.log(`  Low:      ${stats.stats.bySeverity.low}`);
                console.log('');
            }
        } catch (err) {
            print('(Start server to see detailed statistics)', 'yellow');
        }
    } catch (err) {
        print(`Error reading statistics: ${err.message}`, 'red');
    }

    setTimeout(promptMenu, 3000);
}

/**
 * Clear live data
 */
function clearLiveData() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    print('\n⚠️  Clear Live Data', 'yellow');
    print('═══════════════════', 'yellow');
    print('This will delete all live threat data.', 'red');
    print('Test data will NOT be affected.', 'green');
    console.log('');

    rl.question('Are you sure? (yes/no): ', (answer) => {
        rl.close();

        if (answer.toLowerCase() === 'yes') {
            try {
                const configPath = path.join(process.cwd(), 'config.json');
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                const liveCsvPath = config.data.csvPath.replace('.csv', '_live.csv');

                const header = 'timestamp,eventname,sourceip,sourcelocation,sourcecity,sourcecountry,destinationip,destinationlocation,destinationcity,destinationcountry,volume,severity,category,detectionsource,blocked\n';
                fs.writeFileSync(liveCsvPath, header, 'utf8');

                print('\n✓ Live data cleared successfully!', 'green');
            } catch (err) {
                print(`\nError clearing data: ${err.message}`, 'red');
            }
        } else {
            print('\nOperation cancelled.', 'yellow');
        }

        setTimeout(promptMenu, 2000);
    });
}

/**
 * Show configuration
 */
function showConfiguration() {
    print('\nCurrent Configuration', 'cyan');
    print('═════════════════════', 'cyan');
    console.log('');

    try {
        const configPath = path.join(process.cwd(), 'config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        print('Server:', 'bright');
        console.log(`  Host: ${config.server.host}`);
        console.log(`  Port: ${config.server.port}`);
        console.log('');

        print('Data:', 'bright');
        console.log(`  CSV Path: ${config.data.csvPath}`);
        console.log(`  Timeframes: 1h, 24h, 7d`);
        console.log('');

        print('Security:', 'bright');
        console.log(`  API Token: ${config.security.apiToken.substring(0, 10)}...`);
        console.log(`  Allowed IPs: ${config.security.allowedIPs.join(', ')}`);
        console.log('');

        print(`Version: ${APP_VERSION}`, 'magenta');
    } catch (err) {
        print(`Error reading config: ${err.message}`, 'red');
    }

    setTimeout(promptMenu, 3000);
}

/**
 * Health check
 */
async function healthCheck() {
    print('\nServer Health Check', 'cyan');
    print('═══════════════════', 'cyan');
    console.log('');

    try {
        const http = require('http');
        const healthPromise = new Promise((resolve, reject) => {
            const req = http.get('http://localhost:3001/api/health', (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', reject);
            req.setTimeout(3000, () => {
                req.destroy();
                reject(new Error('Connection timeout'));
            });
        });

        const health = await healthPromise;
        if (health.success && health.status === 'healthy') {
            print('✓ Server is running and healthy!', 'green');
            console.log(`  Status: ${health.status}`);
            console.log(`  Version: ${health.version}`);
            console.log(`  Timestamp: ${health.timestamp}`);
        } else {
            print('⚠ Server responded but status is not healthy', 'yellow');
        }
    } catch (err) {
        print('✗ Server is not running', 'red');
        print('  Start the server with option 1 or 3', 'yellow');
    }

    setTimeout(promptMenu, 2000);
}

/**
 * Main menu prompt
 */
function promptMenu() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    printBanner();
    printMenu();

    rl.question('Select an option (1-8): ', async (answer) => {
        rl.close();
        
        switch (answer.trim()) {
            case '1':
                startServer();
                break;
            case '2':
                generateSampleData();
                break;
            case '3':
                startDevServer();
                break;
            case '4':
                await viewStatistics();
                break;
            case '5':
                clearLiveData();
                break;
            case '6':
                showConfiguration();
                break;
            case '7':
                await healthCheck();
                break;
            case '8':
                print('\nGoodbye! 👋', 'cyan');
                process.exit(0);
                break;
            default:
                print('\nInvalid option. Please select 1-8.', 'red');
                setTimeout(promptMenu, 1500);
        }
    });
}

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
    print('\n\nExiting...', 'yellow');
    process.exit(0);
});

// Start the CLI
promptMenu();
