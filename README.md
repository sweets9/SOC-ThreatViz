# SOC Global Threat Visualiser

A real-time cyber threat visualization system designed for Security Operations Centers (SOC). Features a stunning 3D globe visualization with animated attack arcs showing threats from source to destination in real-time.

## Purpose

**Primary Purpose**: This application is primarily a **Visualiser** - designed to provide a realistic representation of attacks against your infrastructure in a visually compelling format.

**For Analysts**: While not originally designed specifically for analyst use, this tool has proven to be a highly useful capability extender for visual learners. Analysts can functionally group attacks from nearby IP addresses or source locations, making pattern recognition easier. However, the sheer volume of arc lines and data sources makes validation tricky, so this tool should be used as a visual aid rather than a definitive source of truth.

**Current Status**: Functionality is being actively implemented and developed. The application is being released "as is" due to its demonstrated value for visual learners. No promises are made for accuracy, though extensive testing has been done to verify functionality. The project will be continually developed, and contributions via pull requests are appreciated.

**Data Ingestion**: Separate modules for data ingestion are being developed to allow data to be parsed and sent to the Visualiser data source. This will provide more flexibility in data source integration.

## Security Notice

**Current Security Controls**: Security controls are currently minimal by design, as the application is intended to run in a 1:1 deployment scenario. It is expected that other security controls will be in place at the infrastructure level, such as:
- Network segmentation
- SSL/TLS certificates
- Firewall rules
- Access controls

**Future Security**: If this application evolves into more of an "attack explorer" tool with broader deployment, additional security controls will be implemented. See the Features Roadmap below for planned security enhancements.

## Features

- **3D Globe Visualization**: Interactive 3D globe showing global threat activity
- **Real-Time Threat Feed**: Live scrolling feed of security events
- **Arc Display Control**: Adjustable visualization density (10%, 25%, 50%, 100%)
- **Focus on Risk Mode**: Filter to show only residual risk (allowed threats)
- **Auto-Rotation**: Automatic globe rotation for continuous monitoring
- **Multiple Timeframes**: View threats from 1 hour, 24 hours, or 7 days
- **Attack Details**: Click any threat for detailed information
- **Top Attackers & Targets**: Quick view of most active sources and targets

## Screenshots and Demo

### Demo Video
Watch a demonstration of the SOC Global Threat Visualiser in action:

https://github.com/sweets9/SOC-ThreatViz/blob/main/screenshots/Demo_v1.mp4

### Main Dashboard (Overwatch)
![Overwatch Dashboard](https://raw.githubusercontent.com/sweets9/SOC-ThreatViz/main/screenshots/OverwatchDash.jpg)
*The main dashboard showing the 3D globe with threat arcs, real-time feed, and statistics panels. This "overwatch" view provides a comprehensive overview of global threat activity.*

### Attack Details View
![Attack Details View](https://raw.githubusercontent.com/sweets9/SOC-ThreatViz/main/screenshots/AttackDetailsView.jpg)
*Detailed view of a specific attack showing source, target, service, and status information. Click on any threat in the feed or on the map to view comprehensive attack details.*

### City Drilldown View
![City Drilldown View](https://raw.githubusercontent.com/sweets9/SOC-ThreatViz/main/screenshots/CityDrilldownView.jpg)
*View showing all attacks originating from or targeting a specific city with geographic pivot options. Analysts can drill down by city, expand to country-level, or view attacks within radius-based geographic areas.*

## Installation

### Prerequisites

- **Node.js** 16+ and npm
- **Modern web browser** (Chrome/Chromium recommended for best performance)
- **Git** (for cloning the repository)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/sweets9/SOC-ThreatViz.git
   cd SOC-ThreatViz
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the application**
   ```bash
   cp config.example.json config.json
   # Edit config.json with your settings (see Configuration section)
   ```

4. **Generate sample data** (optional, for testing)
   ```bash
   npm run generate-sample-data
   ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Open in your browser**
   Navigate to `http://localhost:3001` (or the port specified in your config)

## Configuration

Edit `config.json` to customize your installation:

```json
{
  "server": {
    "port": 3001,
    "host": "0.0.0.0"
  },
  "security": {
    "apiToken": "your-secure-api-token-here",
    "allowedIPs": [
      "127.0.0.1",
      "192.168.1.0/24"
    ]
  },
  "data": {
    "csvPath": "./data/threat_data.csv",
    "pollInterval": 5000,
    "maxEvents": 10000
  },
  "map": {
    "arcDisplayPercentage": 100,
    "autoRotate": true
  }
}
```

### Key Configuration Options

- **server.port**: Port number for the web server (default: 3001)
- **security.apiToken**: Token for webhook authentication
- **security.allowedIPs**: IP addresses/networks allowed to access the API
- **data.csvPath**: Path to your threat data CSV file
- **map.arcDisplayPercentage**: Default percentage of arcs to display (10, 25, 50, or 100)

## Usage

### Controls

- **Auto Rotate**: Enable/disable automatic globe rotation
- **Focus on Risk**: Filter to show only allowed threats (residual risk)
- **Arc Display**: Select percentage of threats to visualize (10%, 25%, 50%, 100%)
- **Time Frame**: Choose data timeframe (1h, 24h, 7d)
- **Data Mode**: Switch between Test Data and Live Data

### Keyboard Shortcuts

- **Space**: Toggle between flat map and globe view
- **R**: Toggle auto-rotation mode
- **1**: Set timeframe to 1 hour
- **2**: Set timeframe to 24 hours
- **3**: Set timeframe to 7 days

### Interacting with the Map

- **Click on arcs**: View attack details
- **Click on cities**: See all attacks from/to that location
- **Click on threat feed items**: View detailed information
- **Click on top attackers/targets**: Filter to show related attacks

## Data Format

The application reads threat data from a CSV file. See [DATA_SCHEMA.md](DATA_SCHEMA.md) for the complete data format specification.

**Required CSV Fields:**
- `timestamp`: ISO 8601 timestamp
- `eventname`: Name of the security event
- `sourceip`: Source IP address
- `sourcelocation`: Source coordinates (lat,lon)
- `sourcecity`: Source city name
- `sourcecountry`: Source country name
- `destinationip`: Target IP or email address
- `destinationlocation`: Destination coordinates (lat,lon)
- `destinationcity`: Destination city name
- `destinationcountry`: Destination country name
- `destinationport`: Destination port number
- `destinationservice`: Service name (e.g., HTTPS, SMTP)
- `volume`: Packet/byte volume
- `severity`: Threat severity (low, medium, high, critical)
- `category`: Attack category
- `detectionsource`: Detection system (e.g., Splunk, IDS)
- `blocked`: Boolean indicating if threat was blocked

## Webhook Integration

Send threat data to the application via webhook:

```bash
curl -X POST http://localhost:3001/api/webhook/update \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

## Deployment

### Production Deployment

1. **Set up HTTPS**: Use a reverse proxy (nginx, Apache) with SSL certificates
2. **Configure firewall**: Only allow necessary ports
3. **Set strong API tokens**: Use 32+ character random tokens
4. **Configure IP whitelisting**: Restrict API access to trusted sources
5. **Set up log rotation**: Manage CSV file growth
6. **Monitor resources**: Watch disk space and memory usage

### Kiosk Mode (Display Wall)

For SOC display walls, run the application in kiosk mode:

```bash
chromium-browser --kiosk --app=http://localhost:3001
```

Disable screen blanking and power management on the display system.

## Troubleshooting

### No attacks showing on map
- Verify CSV file exists and has correct format
- Check timestamps are recent (within selected timeframe)
- Open browser console (F12) to check for errors
- Verify data file path in config.json

### Webhook updates not working
- Verify API token matches config.json
- Check source IP is in allowedIPs list
- Review backend server logs
- Test with curl command (see Webhook Integration)

### Performance issues
- Reduce arc display percentage (10% or 25%)
- Reduce CSV file size (keep under 10,000 events)
- Increase polling interval in config
- Enable hardware acceleration in browser
- Monitor server CPU and memory usage

## Support

For technical documentation, API details, and advanced configuration, see [TECHNICAL.md](TECHNICAL.md).

For issues and questions:
- Open an issue on GitHub
- Contact your SOC administrator
- Review the technical documentation

## Features Roadmap

The following features are planned for future development:

### Security Enhancements
- **Added Security**: Enhanced security controls for broader deployment scenarios
- **SSO Integration**: Seamless login integration with Single Sign-On for kiosk mode
- **RBAC**: Role-Based Access Control for multi-user environments
- **Security Logging**: Comprehensive security event logging
- **Library Tightening**: Review and tighten JavaScript libraries in use

### Functionality Improvements
- **Remote Kiosk Control**: WebSocket-based remote control of kiosk displays (after security controls are implemented)
- **Database Migration**: Migration from CSV to backend database (SQLite or Parquet) if the application evolves into more of an attack explorer tool
  - *Note: Current CSV performance is completely fit for purpose for visualization needs*
- **MITRE ATT&CK Alignment**: Alignment to MITRE ATT&CK framework
  - *Note: This is challenging as current labeling is more digestible by a wider audience, but some form of alignment is a priority*
- **Labeling Review**: Review and clarification of labeling around Severity/Residual Risk/Threat Risk to make it clearer
- **Flat Map Mode**: Implementation of flat map visualization mode

### Data Integration
- **Ingestion Modules**: Separate modules for data ingestion to allow flexible parsing and sending to the Visualiser data source

## Contributing

Contributions are welcome! This project is actively being developed, and pull requests are appreciated. Please read the technical documentation and follow the project's coding standards.

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). See [LICENSE](LICENSE) for details.
