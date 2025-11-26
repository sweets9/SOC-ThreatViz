# Cyber Threat Map - Data Schema

## CSV Data Format

The threat map consumes data from a CSV file with the following structure:

### Fields

| Field | Type | Description | Format/Example | Required |
|-------|------|-------------|----------------|----------|
| timestamp | ISO 8601 DateTime | Event date and time | `2024-01-15T14:30:45Z` or `2024-01-15T14:30:45+10:00` | Yes |
| eventname | String | Display name of the threat event | `Apache RCE Vulnerability Exploit`, `Generic BOT Net Activity` | Yes |
| sourceip | IPv4/IPv6 | Source IP address of the attack | `192.168.1.100`, `2001:db8::1` | Yes |
| sourcelocation | Coordinates | GPS coordinates of source | `lat,lon` format: `51.5074,-0.1278` | Yes |
| destinationip | IPv4/IPv6 | Destination IP address | `203.0.113.5` | Yes |
| destinationlocation | Coordinates | GPS coordinates of destination | `lat,lon` format: `-33.8688,151.2093` | Yes |
| volume | Integer | Attack intensity/volume | `0-100` (0 = low, 100 = critical) | Yes |
| severity | String | Severity level | `low`, `medium`, `high`, `critical` | Yes |
| category | String | Attack category | See categories below | Yes |
| detectionsource | String | Source system that detected the threat | `Splunk`, `SIEM`, `IDS`, `Firewall`, `Email Gateway` | Yes |

### Attack Categories

Valid values for the `category` field:

- `Phishing Emails` - Email-based phishing attempts
- `Antivirus Malware` - Malware detected by antivirus systems
- `Botnet Activity` - Botnet command & control or botnet-related traffic
- `Scanning Activity` - Port scanning, network reconnaissance
- `Infiltration Attempts` - Malicious attempts to infiltrate systems
- `Web Gateway Threats` - Threats detected at web gateway/proxy

### Severity Levels

- `low` - Minor threat, informational
- `medium` - Moderate threat, requires monitoring
- `high` - Serious threat, requires attention
- `critical` - Critical threat, immediate action required

### Sample CSV

```csv
timestamp,eventname,sourceip,sourcelocation,destinationip,destinationlocation,volume,severity,category,detectionsource
2024-01-15T14:30:45Z,Apache RCE Vulnerability Exploit,185.220.101.45,52.5200,13.4050,203.12.45.67,-33.8688,151.2093,85,critical,Infiltration Attempts,Splunk
2024-01-15T14:31:12Z,Phishing Email Campaign,104.244.42.65,37.7749,-122.4194,203.15.89.123,-27.4698,153.0251,45,medium,Phishing Emails,Email Gateway
2024-01-15T14:31:45Z,Generic BOT Net Activity,23.95.123.78,39.9042,116.4074,203.18.56.234,-37.8136,144.9631,72,high,Botnet Activity,SIEM
2024-01-15T14:32:03Z,Port Scan Detected,91.203.45.123,55.7558,37.6173,203.12.45.67,-33.8688,151.2093,30,low,Scanning Activity,Firewall
2024-01-15T14:32:28Z,Ransomware Download Blocked,198.54.117.89,40.7128,-74.0060,203.15.89.123,-27.4698,153.0251,95,critical,Antivirus Malware,Antivirus
2024-01-15T14:33:01Z,SQL Injection Attempt,45.76.89.201,1.3521,103.8198,203.18.56.234,-37.8136,144.9631,68,high,Web Gateway Threats,Web Gateway
```

### Location Format Details

**sourcelocation** and **destinationlocation** use comma-separated latitude,longitude:
- Latitude: -90 to 90 (negative = South, positive = North)
- Longitude: -180 to 180 (negative = West, positive = East)
- Format: `latitude,longitude` (no spaces)
- Example: `-33.8688,151.2093` (Sydney, Australia)

### Australian Site Coordinates (Example)

For local source mode, most destinations will be one of these Australian sites:

- **Sydney HQ**: `-33.8688,151.2093`
- **Melbourne DC**: `-37.8136,144.9631`
- **Brisbane Office**: `-27.4698,153.0251`

### Volume Intensity Scale

The `volume` field (0-100) affects visualization:
- **0-25**: Low intensity (thin arc, subtle color)
- **26-50**: Medium intensity (normal arc, moderate color)
- **51-75**: High intensity (thicker arc, bright color)
- **76-100**: Critical intensity (very thick arc, pulsing animation)

### Notes

1. **Header Row**: CSV file MUST include header row with exact field names
2. **Encoding**: UTF-8 encoding required
3. **Line Endings**: Unix (LF) or Windows (CRLF) line endings supported
4. **Timestamps**: UTC timezone recommended; local timezones supported with offset
5. **IP Validation**: Both IPv4 and IPv6 addresses are supported
6. **Coordinates**: Must be valid GPS coordinates; invalid coordinates will be skipped
7. **File Size**: For optimal performance, keep active dataset under 10,000 events
8. **Updates**: CSV file can be updated in real-time; system polls every 5 seconds

### Additional Optional Fields (Future Enhancement)

Consider adding these fields in future versions:

- `protocol` - Network protocol (TCP, UDP, HTTP, HTTPS)
- `port` - Destination port number
- `blocked` - Boolean indicating if attack was blocked
- `countrycode_source` - ISO 3166-1 alpha-2 country code
- `countrycode_dest` - ISO 3166-1 alpha-2 country code
- `asn_source` - Autonomous System Number of source
- `asn_dest` - Autonomous System Number of destination
