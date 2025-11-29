# Technical Documentation

This document contains detailed technical information about the SOC Global Threat Visualiser, including architecture, API documentation, data schemas, and development guidelines.

## Table of Contents

- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Data Schema](#data-schema)
- [Configuration Reference](#configuration-reference)
- [Development](#development)
- [Integration Guides](#integration-guides)
- [Performance Optimization](#performance-optimization)

## Architecture

### System Overview

```
┌─────────────────────────────────────────┐
│         Frontend (Browser)              │
│  ┌─────────────────────────────────┐   │
│  │  Threat Map Visualization       │   │
│  │  - Globe.GL (3D Globe)         │   │
│  │  - Attack Arcs & Animations     │   │
│  │  - Real-time Event Feed         │   │
│  │  - Interactive Controls        │   │
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
│  │  - CORS & Security headers       │   │
│  └─────────────────────────────────┘   │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│         Data Storage (CSV)              │
│  threat_data.csv                        │
│  threat_data_test.csv                   │
│  threat_data_live.csv                   │
└─────────────────────────────────────────┘
              ▲
              │ Webhook
┌─────────────┴───────────────────────────┐
│    External Sources (Splunk, SIEM)      │
└─────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- Globe.GL for 3D globe visualization
- Vanilla JavaScript (no frameworks)
- CSS3 for styling and animations
- HTML5 Canvas for rendering

**Backend:**
- Node.js with Express.js
- CSV parser for data reading/writing
- Helmet.js for security headers
- CORS for cross-origin requests

**Data Storage:**
- CSV files for threat data
- JSON configuration files

## API Endpoints

### GET /api/threats

Retrieve threat data with optional time filtering.

**Query Parameters:**
- `timeframe`: `1h`, `24h`, or `7d` (default: `24h`)
- `mode`: `test` or `live` (default: `test`)

**Response:**
```json
{
  "threats": [
    {
      "timestamp": "2025-11-29T10:30:45Z",
      "eventname": "Malicious URL Blocked",
      "sourceip": "185.220.101.45",
      "sourcelocation": "52.5200,13.4050",
      "sourcecity": "Berlin",
      "sourcecountry": "Germany",
      "destinationip": "200.200.2.1",
      "destinationlocation": "-33.8688,151.2093",
      "destinationcity": "Sydney",
      "destinationcountry": "Australia",
      "destinationport": 443,
      "destinationservice": "HTTPS",
      "volume": 85,
      "severity": "high",
      "category": "Web Gateway Threats",
      "detectionsource": "Splunk",
      "blocked": true
    }
  ],
  "count": 1,
  "timeframe": "24h"
}
```

**Example:**
```bash
curl http://localhost:3001/api/threats?timeframe=1h&mode=live
```

### POST /api/webhook/update

Update threat data via webhook (requires authentication).

**Headers:**
- `Authorization: Bearer <API_TOKEN>` (required)
- `Content-Type: application/json` (required)

**Body:**
```json
{
  "timestamp": "2025-11-29T10:30:45Z",
  "eventname": "Apache RCE Vulnerability Exploit",
  "sourceip": "185.220.101.45",
  "sourcelocation": "52.5200,13.4050",
  "sourcecity": "Berlin",
  "sourcecountry": "Germany",
  "destinationip": "203.12.45.67",
  "destinationlocation": "-33.8688,151.2093",
  "destinationcity": "Sydney",
  "destinationcountry": "Australia",
  "destinationport": 443,
  "destinationservice": "HTTPS",
  "volume": 85,
  "severity": "critical",
  "category": "Infiltration Attempts",
  "detectionsource": "Splunk",
  "blocked": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Threat added successfully",
  "id": "generated-id"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/webhook/update \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d @threat_event.json
```

### POST /api/webhook/bulk

Bulk update multiple threat events.

**Headers:**
- `Authorization: Bearer <API_TOKEN>` (required)
- `Content-Type: application/json` (required)

**Body:**
```json
{
  "events": [
    { /* event 1 */ },
    { /* event 2 */ },
    { /* event 3 */ }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "added": 3,
  "failed": 0
}
```

### GET /api/info

Get server information and configuration.

**Response:**
```json
{
  "version": "1.13.0-v1",
  "server": "SOC Global Threat Visualiser",
  "uptime": 3600,
  "dataFiles": {
    "test": "./data/threat_data_test.csv",
    "live": "./data/threat_data_live.csv"
  }
}
```

### GET /config.json

Get application configuration (public, no authentication required).

## Data Schema

### CSV Format

The application uses CSV files to store threat data. The file must include a header row with exact field names.

**Required Fields:**
- `timestamp` - ISO 8601 timestamp (e.g., "2025-11-29T10:30:45Z")
- `eventname` - Name of the security event
- `sourceip` - Source IP address (IPv4 or IPv6)
- `sourcelocation` - Source coordinates as "lat,lon"
- `sourcecity` - Source city name
- `sourcecountry` - Source country name
- `destinationip` - Target IP address or email address
- `destinationlocation` - Destination coordinates as "lat,lon"
- `destinationcity` - Destination city name
- `destinationcountry` - Destination country name
- `destinationport` - Destination port number (integer)
- `destinationservice` - Service name (e.g., HTTPS, SMTP, SSH)
- `volume` - Packet/byte volume (integer)
- `severity` - Threat severity: `low`, `medium`, `high`, or `critical`
- `category` - Attack category
- `detectionsource` - Detection system name
- `blocked` - Boolean: `true` or `false`

**Example CSV:**
```csv
timestamp,eventname,sourceip,sourcelocation,sourcecity,sourcecountry,destinationip,destinationlocation,destinationcity,destinationcountry,destinationport,destinationservice,volume,severity,category,detectionsource,blocked
2025-11-29T10:30:45Z,Malicious URL Blocked,185.220.101.45,"52.5200,13.4050",Berlin,Germany,200.200.2.1,"-33.8688,151.2093",Sydney,Australia,443,HTTPS,85,high,Web Gateway Threats,Splunk,true
```

### Data Validation

- Timestamps must be valid ISO 8601 format
- IP addresses must be valid IPv4 or IPv6
- Coordinates must be valid lat/lon pairs
- Severity must be one of: low, medium, high, critical
- Port numbers must be integers 1-65535
- Blocked field must be boolean (true/false)

## Configuration Reference

### Server Configuration

```json
{
  "server": {
    "port": 3001,
    "host": "0.0.0.0"
  }
}
```

- `port`: Port number for the web server
- `host`: Host address to bind to (0.0.0.0 for all interfaces)

### Security Configuration

```json
{
  "security": {
    "apiToken": "your-secure-api-token-here",
    "allowedIPs": [
      "127.0.0.1",
      "192.168.1.0/24",
      "10.0.0.0/8"
    ]
  }
}
```

- `apiToken`: Token for webhook authentication (32+ characters recommended)
- `allowedIPs`: Array of IP addresses or CIDR ranges allowed to access the API

### Data Configuration

```json
{
  "data": {
    "csvPath": "./data/threat_data.csv",
    "pollInterval": 5000,
    "maxEvents": 10000,
    "timeframes": {
      "1h": 3600000,
      "24h": 86400000,
      "7d": 604800000
    }
  }
}
```

- `csvPath`: Path to the main threat data CSV file
- `pollInterval`: How often the frontend polls for new data (milliseconds)
- `maxEvents`: Maximum number of events to keep in memory
- `timeframes`: Timeframe definitions in milliseconds

### Map Configuration

```json
{
  "map": {
    "defaultView": "globe",
    "centerLat": -25.0,
    "centerLon": 133.0,
    "autoRotate": true,
    "rotateInterval": 60000,
    "arcDisplayPercentage": 100,
    "defensiveCities": [
      {
        "name": "Sydney",
        "lat": -33.8688,
        "lng": 151.2093,
        "size": 0.8
      }
    ]
  }
}
```

- `defaultView`: Initial view mode (`globe` or `flat`)
- `centerLat`/`centerLon`: Center coordinates for the map
- `autoRotate`: Enable auto-rotation by default
- `rotateInterval`: Auto-rotation interval (milliseconds)
- `arcDisplayPercentage`: Default percentage of arcs to display (10, 25, 50, or 100)
- `defensiveCities`: Array of cities to label on the map

## Development

### Project Structure

```
SOC-ThreatViz/
├── backend/
│   ├── server.js           # Express API server
│   ├── routes/
│   │   └── api.js          # API route handlers
│   ├── middleware/
│   │   └── auth.js         # Authentication middleware
│   └── utils/
│       └── csv.js          # CSV reading/writing utilities
├── frontend/
│   ├── index.html          # Main HTML file
│   ├── css/
│   │   └── style.css       # Styles
│   └── js/
│       ├── map.js          # Map/globe visualization
│       ├── data.js         # Data fetching & processing
│       └── ui.js           # UI controls & interactions
├── data/
│   ├── threat_data.csv     # Main threat data
│   ├── threat_data_test.csv # Test data
│   └── threat_data_live.csv # Live data
├── scripts/
│   └── generate-sample.js  # Sample data generator
├── config.json             # Application configuration
├── package.json            # Node.js dependencies
└── LICENSE                 # AGPL-3.0 license
```

### Running in Development

```bash
# Start backend with auto-reload
npm run dev

# Generate sample data
npm run generate-sample-data

# Start production server
npm start
```

### Code Style

- Use ES6+ JavaScript features
- Follow consistent naming conventions
- Add comments for complex logic
- Keep functions focused and modular
- Handle errors gracefully

## Integration Guides

### Splunk Integration

#### Configure Webhook Alert Action

1. In Splunk, create a new alert
2. Set trigger conditions for security events
3. Add webhook action with URL: `http://your-server:3001/api/webhook/update`
4. Add header: `Authorization: Bearer your-token-here`
5. Configure payload to match the required format

#### Example Splunk Search

```spl
index=security sourcetype=firewall action=blocked
| eval sourcelocation=lat.",".lon
| eval destinationlocation=dest_lat.",".dest_lon
| table _time, signature, src_ip, sourcelocation, dest_ip, destinationlocation, bytes, severity, category, sourcetype
| rename _time as timestamp, signature as eventname, src_ip as sourceip, dest_ip as destinationip, bytes as volume, sourcetype as detectionsource
```

### SIEM Integration

Most SIEMs support webhook/HTTP POST actions. Configure your SIEM to:

1. Send POST requests to `/api/webhook/update`
2. Include `Authorization: Bearer <token>` header
3. Format data according to the API schema
4. Use JSON content type

### Custom Integration

For custom integrations, use the webhook API:

```javascript
const axios = require('axios');

async function sendThreat(threatData) {
  try {
    const response = await axios.post(
      'http://your-server:3001/api/webhook/update',
      threatData,
      {
        headers: {
          'Authorization': 'Bearer your-token-here',
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Threat sent:', response.data);
  } catch (error) {
    console.error('Error sending threat:', error);
  }
}
```

## Performance Optimization

### Frontend Optimization

- **Arc Display Percentage**: Reduce to 10% or 25% for large datasets
- **Timeframe Selection**: Use shorter timeframes (1h) for better performance
- **Browser Hardware Acceleration**: Ensure it's enabled
- **Data Polling**: Increase poll interval for less frequent updates

### Backend Optimization

- **CSV File Size**: Keep under 10,000 events for optimal performance
- **Data Cleanup**: Implement automatic cleanup of old events
- **Caching**: Consider implementing response caching for static data
- **Connection Pooling**: Use connection pooling for database integrations

### Server Resources

**Minimum Requirements:**
- CPU: 2 cores
- RAM: 4GB
- Disk: 1GB free space
- Network: 10 Mbps

**Recommended for Production:**
- CPU: 4+ cores
- RAM: 8GB+
- Disk: 10GB+ free space
- Network: 100 Mbps+

## Security Considerations

1. **API Tokens**: Use strong, randomly generated tokens (32+ characters)
2. **IP Whitelisting**: Restrict API access to trusted networks
3. **HTTPS**: Always use HTTPS in production
4. **Input Validation**: All webhook inputs are validated
5. **Rate Limiting**: Consider implementing rate limiting for webhooks
6. **File Permissions**: Restrict CSV file write permissions
7. **Logging**: Monitor and log all API access

## Troubleshooting

### Common Issues

**No attacks showing on map:**
- Check CSV file exists and has correct format
- Verify timestamps are recent (within selected timeframe)
- Check browser console for errors
- Verify data file path in config.json

**Webhook updates not working:**
- Verify API token is correct
- Check source IP is whitelisted
- Review backend server logs
- Test with curl command

**Performance issues:**
- Reduce CSV file size (keep under 10,000 events)
- Reduce arc display percentage
- Increase polling interval in config
- Check browser hardware acceleration is enabled
- Monitor server CPU and memory usage

**Globe not rendering:**
- Check browser console for errors
- Verify Globe.GL library is loaded
- Check network tab for failed resource loads
- Try a different browser

## Additional Resources

- [DATA_SCHEMA.md](DATA_SCHEMA.md) - Complete data format specification
- [SPLUNK_INTEGRATION.md](SPLUNK_INTEGRATION.md) - Detailed Splunk integration guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment guide

