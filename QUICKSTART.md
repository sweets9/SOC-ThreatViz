# Quick Start Guide

Get the Live Global Cyber Threat Map running in 5 minutes!

## Prerequisites

- Node.js 16+ and npm installed
- Modern web browser (Chrome/Chromium recommended)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate Sample Data

For demonstration purposes, generate sample threat data:

```bash
npm run generate-sample-data
```

This creates 500 sample threat events spanning the last 7 days.

### 3. Start the Server

```bash
npm start
```

You should see:

```
╔══════════════════════════════════════════════════════════╗
║   Live Global Cyber Threat Map - Backend Server         ║
╚══════════════════════════════════════════════════════════╝

🚀 Server running on http://0.0.0.0:3000
📊 Frontend available at http://localhost:3000
```

### 4. Open in Browser

Navigate to:
```
http://localhost:3000
```

## What You'll See

- **Default View**: Flat map centered on Australia showing recent cyber threats
- **Attack Arcs**: Animated lines from threat sources to destinations
- **Color Coding**: Different colors for attack categories and severity levels
- **Real-time Feed**: Scrolling list of attacks at the bottom
- **Statistics**: Total threats, active threats, and critical threats in the header

## Using the Controls

### View Mode
- Click **"3D Globe"** button to switch to rotating globe view
- Click **"Flat Map"** button to return to 2D view
- Press **Space** key to toggle between views

### Auto-Rotate
- Click **"Enable"** to activate automatic rotation mode
- Globe will rotate every 60 seconds, then return to flat map
- Press **"R"** key to toggle

### Time Frame
- Select **1h**, **24h**, or **7d** to filter threats by time
- Press **1**, **2**, or **3** keys for quick selection

### Data Mode
- **Local Source**: Uses data from CSV file (default)
- **Public Feed**: For public threat intelligence (future feature)

## Testing the API

### Get Threat Data

```bash
curl http://localhost:3000/api/threats?timeframe=1h
```

### Get Statistics

```bash
curl http://localhost:3000/api/stats
```

### Add New Threat (requires authentication)

```bash
curl -X POST http://localhost:3000/api/webhook/update \
  -H "Authorization: Bearer change-me-to-a-secure-random-token-32-chars-min" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2024-01-15T14:30:45Z",
    "eventname": "Test Attack from API",
    "sourceip": "185.220.101.45",
    "sourcelocation": "52.5200,13.4050",
    "destinationip": "203.12.45.67",
    "destinationlocation": "-33.8688,151.2093",
    "volume": 85,
    "severity": "critical",
    "category": "Infiltration Attempts",
    "detectionsource": "Manual Test"
  }'
```

## Customization

### Change API Token

Edit `config.json`:

```json
{
  "security": {
    "apiToken": "YOUR-SECURE-TOKEN-HERE"
  }
}
```

### Adjust Map Center

Edit `config.json`:

```json
{
  "map": {
    "centerLat": -25.0,
    "centerLon": 133.0
  }
}
```

### Generate More Data

```bash
# Generate 1000 threats from last 24 hours
node scripts/generate-sample.js 1000 24

# Generate 2000 threats from last 30 days
node scripts/generate-sample.js 2000 720
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Space** | Toggle 2D/3D view |
| **R** | Toggle auto-rotate |
| **1** | Set timeframe to 1 hour |
| **2** | Set timeframe to 24 hours |
| **3** | Set timeframe to 7 days |
| **Esc** | Close modal |

## Next Steps

1. **Production Setup**: See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
2. **Splunk Integration**: See [SPLUNK_INTEGRATION.md](SPLUNK_INTEGRATION.md) for connecting to Splunk
3. **Data Schema**: See [DATA_SCHEMA.md](DATA_SCHEMA.md) for CSV format details

## Common Issues

### Port 3000 Already in Use

Change the port in `config.json`:

```json
{
  "server": {
    "port": 8080
  }
}
```

### No Data Showing

1. Check CSV file exists: `ls -la data/threat_data.csv`
2. Verify CSV has data: `head data/threat_data.csv`
3. Check timeframe matches data timestamps
4. Look at browser console for errors (F12)

### Map Not Loading

1. Check browser console for errors
2. Verify internet connection (Cesium.js loads from CDN)
3. Check firewall/proxy settings

### Authentication Errors

1. Verify API token in request matches `config.json`
2. Check IP is in allowed list for webhook endpoints
3. Ensure `Authorization: Bearer TOKEN` header format is correct

## Development Mode

For development with auto-reload:

```bash
npm run dev
```

This uses nodemon to automatically restart the server when files change.

## Stopping the Server

Press **Ctrl+C** in the terminal where the server is running.

## Support

- Full documentation: [README.md](README.md)
- Data format: [DATA_SCHEMA.md](DATA_SCHEMA.md)
- Deployment guide: [DEPLOYMENT.md](DEPLOYMENT.md)
- Splunk setup: [SPLUNK_INTEGRATION.md](SPLUNK_INTEGRATION.md)

## Demo Mode

Want to see real-time updates in action?

In browser console (F12), run:

```javascript
// Simulate new threat every 5 seconds
setInterval(() => {
    simulateRealTimeUpdates();
}, 5000);
```

This will create new threat events using variations of existing data, demonstrating the real-time visualization features.

Enjoy your Live Global Cyber Threat Map! 🌐🔒
