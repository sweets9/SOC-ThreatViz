# Splunk Integration Guide

This guide explains how to integrate Splunk with the Live Global Cyber Threat Map using webhook alerts.

## Overview

Splunk can send security events to the threat map via webhook alerts. When security events match your search criteria, Splunk will POST the event data to the threat map API.

## Prerequisites

- Splunk Enterprise or Splunk Cloud
- Network connectivity from Splunk to Threat Map server
- API token from threat map configuration
- Appropriate Splunk permissions to create alerts

## Setup Steps

### 1. Configure Webhook Alert Action

#### Option A: Using Splunk UI

1. Navigate to **Settings > Searches, reports, and alerts**
2. Click **New Alert**
3. Configure the search and trigger conditions
4. Under **Trigger Actions**, click **Add Actions > Webhook**

#### Option B: Using alerts.conf

Edit `$SPLUNK_HOME/etc/apps/search/local/alerts.conf`:

```ini
[ThreatMapWebhook]
action.webhook = 1
action.webhook.param.url = https://threatmap.yourdomain.com/api/webhook/update
alert.track = 1
cron_schedule = */5 * * * *
dispatch.earliest_time = -5m
dispatch.latest_time = now
enableSched = 1
search = <your search query>
```

### 2. Create Search Query

The search query must extract fields that match the threat map schema.

#### Example 1: Firewall Blocked Connections

```spl
index=firewall action=blocked severity=high
| eval timestamp=strftime(_time, "%Y-%m-%dT%H:%M:%SZ")
| eval eventname=signature
| eval sourceip=src_ip
| eval destinationip=dest_ip
| eval volume=bytes/1000000
| eval severity=case(
    priority="critical", "critical",
    priority="high", "high",
    priority="medium", "medium",
    1=1, "low"
  )
| eval category=case(
    like(signature, "%phish%"), "Phishing Emails",
    like(signature, "%malware%"), "Antivirus Malware",
    like(signature, "%bot%"), "Botnet Activity",
    like(signature, "%scan%"), "Scanning Activity",
    like(signature, "%exploit%"), "Infiltration Attempts",
    1=1, "Web Gateway Threats"
  )
| eval detectionsource="Firewall"
| lookup geoip src_ip OUTPUT lat as sourcelat, lon as sourcelon
| lookup geoip dest_ip OUTPUT lat as destlat, lon as destlon
| eval sourcelocation=sourcelat.",".sourcelon
| eval destinationlocation=destlat.",".destlon
| table timestamp, eventname, sourceip, sourcelocation, destinationip, destinationlocation, volume, severity, category, detectionsource
```

#### Example 2: IDS/IPS Alerts

```spl
index=ids sourcetype=suricata
| eval timestamp=strftime(_time, "%Y-%m-%dT%H:%M:%SZ")
| eval eventname=alert.signature
| eval sourceip=src_ip
| eval destinationip=dest_ip
| eval volume=case(
    alert.severity<=1, 90,
    alert.severity=2, 70,
    alert.severity=3, 40,
    1=1, 20
  )
| eval severity=case(
    alert.severity=1, "critical",
    alert.severity=2, "high",
    alert.severity=3, "medium",
    1=1, "low"
  )
| eval category=case(
    like(alert.category, "Attempted User Privilege Gain"), "Infiltration Attempts",
    like(alert.category, "Web Application Attack"), "Web Gateway Threats",
    like(alert.category, "Trojan"), "Antivirus Malware",
    like(alert.category, "Network Scan"), "Scanning Activity",
    1=1, "Infiltration Attempts"
  )
| eval detectionsource="IDS"
| iplocation src_ip
| rename lat as sourcelat, lon as sourcelon
| iplocation dest_ip
| rename lat as destlat, lon as destlon
| eval sourcelocation=sourcelat.",".sourcelon
| eval destinationlocation=destlat.",".destlon
| fields timestamp, eventname, sourceip, sourcelocation, destinationip, destinationlocation, volume, severity, category, detectionsource
```

#### Example 3: Email Gateway (Phishing)

```spl
index=email action=blocked threat_type=phishing
| eval timestamp=strftime(_time, "%Y-%m-%dT%H:%M:%SZ")
| eval eventname=subject
| eval sourceip=sender_ip
| eval destinationip=recipient_server_ip
| eval volume=50
| eval severity="high"
| eval category="Phishing Emails"
| eval detectionsource="Email Gateway"
| eval sourcelocation=sender_country_lat.",".sender_country_lon
| eval destinationlocation=recipient_country_lat.",".recipient_country_lon
| table timestamp, eventname, sourceip, sourcelocation, destinationip, destinationlocation, volume, severity, category, detectionsource
```

#### Example 4: Web Proxy Threats

```spl
index=proxy action=blocked category=malware OR category=phishing
| eval timestamp=strftime(_time, "%Y-%m-%dT%H:%M:%SZ")
| eval eventname=threat_name
| eval sourceip=client_ip
| eval destinationip=server_ip
| eval volume=60
| eval severity=case(
    threat_level="high", "high",
    threat_level="critical", "critical",
    1=1, "medium"
  )
| eval category="Web Gateway Threats"
| eval detectionsource="Web Gateway"
| iplocation client_ip
| rename lat as sourcelat, lon as sourcelon
| iplocation server_ip
| rename lat as destlat, lon as destlon
| eval sourcelocation=sourcelat.",".sourcelon
| eval destinationlocation=destlat.",".destlon
| fields timestamp, eventname, sourceip, sourcelocation, destinationip, destinationlocation, volume, severity, category, detectionsource
```

### 3. Configure Webhook Payload

The webhook must send JSON in the following format:

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

#### Splunk Webhook Configuration

In the webhook alert action, configure:

**URL:**
```
https://threatmap.yourdomain.com/api/webhook/update
```

**HTTP Headers:**
```
Authorization: Bearer YOUR-API-TOKEN-HERE
Content-Type: application/json
```

**Payload (JSON format):**
```json
{
  "timestamp": "$result.timestamp$",
  "eventname": "$result.eventname$",
  "sourceip": "$result.sourceip$",
  "sourcelocation": "$result.sourcelocation$",
  "destinationip": "$result.destinationip$",
  "destinationlocation": "$result.destinationlocation$",
  "volume": $result.volume$,
  "severity": "$result.severity$",
  "category": "$result.category$",
  "detectionsource": "$result.detectionsource$"
}
```

### 4. GeoIP Lookup Setup

For accurate location data, configure Splunk GeoIP lookup:

#### Install GeoIP Database

1. Download MaxMind GeoLite2 database
2. Copy to `$SPLUNK_HOME/etc/apps/search/lookups/`

#### Configure transforms.conf

Edit `$SPLUNK_HOME/etc/apps/search/local/transforms.conf`:

```ini
[geoip]
filename = GeoLite2-City.mmdb
```

#### Use in Search

```spl
| iplocation src_ip
| rename lat as sourcelat, lon as sourcelon
| iplocation dest_ip
| rename lat as destlat, lon as destlon
| eval sourcelocation=sourcelat.",".sourcelon
| eval destinationlocation=destlat.",".destlon
```

### 5. Create Scheduled Alert

#### Real-time Alert (Every 5 minutes)

```ini
[ThreatMap_RealTime]
cron_schedule = */5 * * * *
dispatch.earliest_time = -5m
dispatch.latest_time = now
search = <your search query>
alert.track = 1
alert.digest_mode = 0
action.webhook = 1
action.webhook.param.url = https://threatmap.yourdomain.com/api/webhook/update
```

#### Batch Alert (Bulk Updates)

For high-volume events, use bulk endpoint:

**URL:**
```
https://threatmap.yourdomain.com/api/webhook/bulk
```

**Payload:**
```json
{
  "events": [
    {
      "timestamp": "$result.timestamp$",
      ...
    }
  ]
}
```

### 6. Test Integration

#### Test from Splunk Search

Run your search query and verify the results have all required fields:

```spl
<your search query>
| table timestamp, eventname, sourceip, sourcelocation, destinationip, destinationlocation, volume, severity, category, detectionsource
```

#### Test Webhook Manually

Using curl:

```bash
curl -X POST https://threatmap.yourdomain.com/api/webhook/update \
  -H "Authorization: Bearer YOUR-API-TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2024-01-15T14:30:45Z",
    "eventname": "Test Event from Splunk",
    "sourceip": "192.0.2.1",
    "sourcelocation": "40.7128,-74.0060",
    "destinationip": "203.0.113.5",
    "destinationlocation": "-33.8688,151.2093",
    "volume": 50,
    "severity": "medium",
    "category": "Scanning Activity",
    "detectionsource": "Splunk"
  }'
```

## Default Coordinates for Australian Sites

Use these coordinates for your Australian destinations:

```spl
| eval destinationlocation=case(
    dest_ip="YOUR-SYDNEY-IP", "-33.8688,151.2093",
    dest_ip="YOUR-MELBOURNE-IP", "-37.8136,144.9631",
    dest_ip="YOUR-BRISBANE-IP", "-27.4698,153.0251",
    1=1, destlat.",".destlon
  )
```

## Complete Alert Example

Here's a complete alert configuration:

**searches.conf:**
```ini
[ThreatMap_Firewall_Blocks]
search = index=firewall action=blocked severity=high OR severity=critical \
| eval timestamp=strftime(_time, "%Y-%m-%dT%H:%M:%SZ") \
| eval eventname=signature \
| eval sourceip=src_ip \
| eval destinationip=dest_ip \
| eval volume=case(severity="critical", 90, severity="high", 70, 1=1, 50) \
| eval severity=lower(severity) \
| eval category=case( \
    like(signature, "%exploit%"), "Infiltration Attempts", \
    like(signature, "%scan%"), "Scanning Activity", \
    1=1, "Infiltration Attempts" \
  ) \
| eval detectionsource="Firewall" \
| iplocation src_ip \
| rename lat as sourcelat, lon as sourcelon \
| eval destinationlocation=case( \
    dest_ip="203.0.113.10", "-33.8688,151.2093", \
    dest_ip="203.0.113.20", "-37.8136,144.9631", \
    dest_ip="203.0.113.30", "-27.4698,153.0251", \
    1=1, "-33.8688,151.2093" \
  ) \
| eval sourcelocation=sourcelat.",".sourcelon \
| table timestamp, eventname, sourceip, sourcelocation, destinationip, destinationlocation, volume, severity, category, detectionsource

cron_schedule = */5 * * * *
dispatch.earliest_time = -5m
dispatch.latest_time = now
enableSched = 1
```

**alerts.conf:**
```ini
[ThreatMap_Firewall_Blocks]
action.webhook = 1
action.webhook.param.url = https://threatmap.yourdomain.com/api/webhook/update
alert.track = 1
```

## Troubleshooting

### Webhook Not Firing

1. Check alert is enabled: `Settings > Searches, reports, and alerts`
2. Verify search returns results
3. Check Splunk logs: `index=_internal component=sendmodalert`

### Authentication Errors (401)

- Verify API token in webhook header
- Check token matches `config.json` on threat map server

### Forbidden Errors (403)

- Add Splunk server IP to `allowedIPs` in `config.json`
- Verify IP address using: `curl https://api.ipify.org`

### Invalid Data Errors (400)

- Ensure all required fields are present
- Check coordinate format: `lat,lon` (no spaces)
- Verify severity is: low, medium, high, or critical
- Check category matches allowed values

### View Webhook Logs in Splunk

```spl
index=_internal component=sendmodalert action=webhook
| table _time, sid, action_name, result.url, result.status, result.response
```

## Best Practices

1. **Rate Limiting**: Don't send more than 30 events per minute
2. **Filtering**: Only send high-priority events to avoid noise
3. **Deduplication**: Use Splunk's dedup to avoid duplicate events
4. **Volume Scaling**: Map actual bytes/packets to 0-100 scale appropriately
5. **Coordinates**: Maintain lookup table for internal IP to location mapping
6. **Testing**: Test in development environment first

## Support

For issues with integration:
1. Check Splunk webhook logs
2. Test API endpoint with curl
3. Verify field mappings match schema
4. Review threat map backend logs
