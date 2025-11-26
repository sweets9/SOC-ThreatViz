# Live Global Cyber Threat Map

A real-time cyber threat visualization system designed for Security Operations Centers (SOC). Features a stunning 3D globe and flat map view with animated attack arcs showing threats from source to destination.

## Features

### Visualization
- **Dual View Modes**:
  - Flat map view (default) centered on Australia
  - 3D rotating globe view with smooth transitions
- **Auto-Rotation Mode**: Automatically switches to globe view every 60 seconds, performs a full rotation, then returns to flat map
- **Animated Attack Arcs**: Visual arcs showing attack paths from source to destination
- **Intensity-Based Styling**: Attack visualization varies based on volume and severity
- **Real-Time Feed**: Scrolling list of live attacks at the bottom of the screen

### Data Sources
- **Local Source Mode** (Primary): Custom data from CSV file for SOC display
- **Public Feed Mode**: Publicly available threat intelligence data (optional)

### Time Controls
- Adjustable time frames: 1 hour, 24 hours, 7 days
- Real-time event filtering based on selected timeframe

### Security
- API token authentication for webhook endpoints
- IP whitelisting for backend API access
- Secure CSV file updates via REST API

## Architecture

```
┌─────────────────────────────────────────┐
│         Frontend (Browser)              │
│  ┌─────────────────────────────────┐   │
│  │  Threat Map Visualization       │   │
│  │  - Cesium.js (3D/2D)            │   │
│  │  - Attack Arcs & Animations     │   │
│  │  - Real-time Event Feed         │   │
│  └─────────────────────────────────┘   │
└─────────────┬───────────────────────────┘
              │ HTTP/Polling
              ▼
┌─────────────────────────────────────────┐
│      Backend API Server (Node.js)       │
│  ┌─────────────────────────────────┐   │
│  │  Express REST API               │   │
│  │  - Serve CSV data               │   │
│  │  - Webhook endpoint             │   │
│  │  - Authentication & IP filter   │   │
│  └─────────────────────────────────┘   │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│         Data Storage (CSV)              │
│  threat_data.csv                        │
└─────────────────────────────────────────┘
              ▲
              │ Webhook
┌─────────────┴───────────────────────────┐
│    External Sources (Splunk, SIEM)      │
└─────────────────────────────────────────┘
```

## Installation

### Prerequisites
- Node.js 16+ and npm
- Modern web browser (Chrome/Chromium recommended)

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd LiveGlobalThreatMapClaude
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure the application**
```bash
cp config.example.json config.json
# Edit config.json with your settings
```

4. **Start the backend server**
```bash
npm start
```

5. **Open the frontend**
Navigate to `http://localhost:3000` in your browser

## Configuration

Edit `config.json`:

```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "security": {
    "apiToken": "your-secure-token-here",
    "allowedIPs": [
      "127.0.0.1",
      "192.168.1.0/24",
      "10.0.0.0/8"
    ]
  },
  "data": {
    "csvPath": "./data/threat_data.csv",
    "pollInterval": 5000,
    "maxEvents": 10000
  },
  "map": {
    "defaultView": "flat",
    "centerLat": -25.0,
    "centerLon": 133.0,
    "autoRotate": true,
    "rotateInterval": 60000
  }
}
```

## API Endpoints

### GET /api/threats
Retrieve threat data with optional time filtering

**Query Parameters:**
- `timeframe`: `1h`, `24h`, or `7d` (default: `24h`)

**Example:**
```bash
curl http://localhost:3000/api/threats?timeframe=1h
```

### POST /api/webhook/update
Update threat data via webhook (requires authentication)

**Headers:**
- `Authorization: Bearer <API_TOKEN>`
- `Content-Type: application/json`

**Body:**
```json
{
  "timestamp": "2024-01-15T14:30:45Z",
  "eventname": "Apache RCE Vulnerability Exploit",
  "sourceip": "185.220.101.45",
  "sourcelocation": "52.5200,13.4050",
  "destinationip": "203.12.45.67",
  "destinationlocation": "-33.8688,151.2093",
  "volume": 85,
  "severity": "critical",
  "category": "Infiltration Attempts",
  "detectionsource": "Splunk"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/webhook/update \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d @threat_event.json
```

### POST /api/webhook/bulk
Bulk update multiple threat events

**Headers:**
- `Authorization: Bearer <API_TOKEN>`
- `Content-Type: application/json`

**Body:**
```json
{
  "events": [
    { /* event 1 */ },
    { /* event 2 */ }
  ]
}
```

## Data Format

See [DATA_SCHEMA.md](DATA_SCHEMA.md) for complete CSV format specification.

**Quick Example:**
```csv
timestamp,eventname,sourceip,sourcelocation,destinationip,destinationlocation,volume,severity,category,detectionsource
2024-01-15T14:30:45Z,Apache RCE Vulnerability Exploit,185.220.101.45,52.5200,13.4050,203.12.45.67,-33.8688,151.2093,85,critical,Infiltration Attempts,Splunk
```

## Controls

### Keyboard Shortcuts
- **Space**: Toggle between flat map and globe view
- **R**: Toggle auto-rotation mode
- **1**: Set timeframe to 1 hour
- **2**: Set timeframe to 24 hours
- **3**: Set timeframe to 7 days

### UI Controls
- **View Toggle**: Switch between 2D map and 3D globe
- **Auto-Rotate**: Enable/disable automatic globe rotation mode
- **Timeframe Selector**: Choose data timeframe (1h / 24h / 7d)

## Integrating with Splunk

### Configure Webhook Alert Action

1. In Splunk, create a new alert
2. Set trigger conditions for security events
3. Add webhook action with URL: `http://your-server:3000/api/webhook/update`
4. Add header: `Authorization: Bearer your-token-here`
5. Configure payload to match the required format (see API documentation)

### Example Splunk Search
```spl
index=security sourcetype=firewall action=blocked
| eval sourcelocation=lat.",".lon
| eval destinationlocation=dest_lat.",".dest_lon
| table _time, signature, src_ip, sourcelocation, dest_ip, destinationlocation, bytes, severity, category, sourcetype
| rename _time as timestamp, signature as eventname, src_ip as sourceip, dest_ip as destinationip, bytes as volume, sourcetype as detectionsource
```

## Demo Mode

Generate sample data for demonstration:

```bash
npm run generate-sample-data
```

This creates a CSV file with realistic threat data for testing.

## Deployment for SOC

### Hardware Requirements
- Display: Large format display or video wall
- Computer: Modern PC capable of hardware-accelerated graphics
- Network: Stable connection to backend server

### Browser Setup (Chromium)
1. Start Chromium in kiosk mode:
```bash
chromium-browser --kiosk --app=http://localhost:3000
```

2. Disable screen blanking and power management
3. Enable auto-start on boot

### Production Considerations
- Use HTTPS with valid certificates
- Set strong API tokens (32+ characters)
- Configure proper IP whitelisting
- Set up log rotation for CSV files
- Monitor disk space for data storage
- Consider backup and disaster recovery

## Troubleshooting

### No attacks showing on map
- Check CSV file exists and has correct format
- Verify timestamps are recent (within selected timeframe)
- Check browser console for errors

### Webhook updates not working
- Verify API token is correct
- Check source IP is whitelisted
- Review backend server logs
- Test with curl command

### Performance issues
- Reduce CSV file size (keep under 10,000 events)
- Increase polling interval in config
- Check browser hardware acceleration is enabled
- Monitor server CPU and memory usage

## Development

### Project Structure
```
LiveGlobalThreatMapClaude/
├── backend/
│   ├── server.js           # Express API server
│   ├── routes/             # API route handlers
│   ├── middleware/         # Auth & security middleware
│   └── utils/              # Helper functions
├── frontend/
│   ├── index.html          # Main HTML file
│   ├── css/
│   │   └── style.css       # Styles
│   └── js/
│       ├── map.js          # Map/globe visualization
│       ├── data.js         # Data fetching & processing
│       └── ui.js           # UI controls & interactions
├── data/
│   └── threat_data.csv     # Threat data storage
├── scripts/
│   └── generate-sample.js  # Sample data generator
├── config.json             # Application configuration
├── DATA_SCHEMA.md          # Data format specification
└── README.md               # This file
```

### Running in Development
```bash
# Start backend with auto-reload
npm run dev

# Generate sample data
npm run generate-sample-data

# Run tests
npm test
```

## License

[Your License Here]

## Support

For issues and questions, please contact your SOC administrator or open an issue in the repository.
