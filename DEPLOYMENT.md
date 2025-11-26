# Deployment Guide

This guide covers deploying the Live Global Cyber Threat Map in a production SOC environment.

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Node.js 16+ and npm
- Modern browser (Chrome/Chromium)
- Network access between components

## Server Setup

### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install Git
sudo apt install -y git
```

### 2. Clone and Install Application

```bash
# Clone repository
git clone <repository-url>
cd LiveGlobalThreatMapClaude

# Install dependencies
npm install

# Copy and configure
cp config.example.json config.json
nano config.json
```

### 3. Configure Application

Edit `config.json`:

```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "security": {
    "apiToken": "CHANGE-THIS-TO-A-SECURE-RANDOM-TOKEN-MIN-32-CHARS",
    "allowedIPs": [
      "127.0.0.1",
      "YOUR-SPLUNK-SERVER-IP",
      "YOUR-SOC-NETWORK-CIDR"
    ]
  },
  "data": {
    "csvPath": "./data/threat_data.csv"
  }
}
```

**Important Security Steps:**

1. Generate a strong API token:
```bash
# Generate secure random token
openssl rand -base64 32
```

2. Add your Splunk server IP to `allowedIPs`
3. Add your SOC network range (e.g., "10.0.0.0/8")

### 4. Generate Sample Data (Optional)

For testing:

```bash
npm run generate-sample-data
```

### 5. Run Application

**Development mode:**
```bash
npm start
```

**Production mode with PM2:**

```bash
# Install PM2
sudo npm install -g pm2

# Start application
pm2 start backend/server.js --name threat-map

# Configure auto-start on boot
pm2 startup
pm2 save

# View logs
pm2 logs threat-map

# Monitor
pm2 monit
```

## Display Setup (Chromium Kiosk Mode)

### 1. Install Chromium

```bash
sudo apt install -y chromium-browser
```

### 2. Create Startup Script

Create `/home/soc/start-threat-map.sh`:

```bash
#!/bin/bash

# Wait for network
sleep 10

# Kill any existing Chromium instances
killall chromium-browser 2>/dev/null

# Start Chromium in kiosk mode
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --no-first-run \
  --fast \
  --fast-start \
  --disable-translate \
  --disable-features=TranslateUI \
  --disk-cache-dir=/dev/null \
  --password-store=basic \
  --autoplay-policy=no-user-gesture-required \
  http://localhost:3000
```

Make it executable:
```bash
chmod +x /home/soc/start-threat-map.sh
```

### 3. Auto-start on Boot

Edit crontab:
```bash
crontab -e
```

Add:
```
@reboot /home/soc/start-threat-map.sh
```

### 4. Disable Screen Blanking

```bash
# Edit lightdm configuration
sudo nano /etc/lightdm/lightdm.conf
```

Add under `[Seat:*]`:
```
xserver-command=X -s 0 -dpms
```

Or use xset:
```bash
xset s off
xset -dpms
xset s noblank
```

## Reverse Proxy Setup (Nginx)

For production, use Nginx as reverse proxy with SSL:

### 1. Install Nginx

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Configure Nginx

Create `/etc/nginx/sites-available/threat-map`:

```nginx
server {
    listen 80;
    server_name threatmap.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name threatmap.yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/threatmap.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/threatmap.yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Increase timeouts for long-running requests
    proxy_connect_timeout 600;
    proxy_send_timeout 600;
    proxy_read_timeout 600;
    send_timeout 600;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/threat-map /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Get SSL Certificate

```bash
sudo certbot --nginx -d threatmap.yourdomain.com
```

## Firewall Configuration

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS (if using Nginx)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application port (if not using Nginx)
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable
```

## Monitoring and Maintenance

### Log Rotation

Create `/etc/logrotate.d/threat-map`:

```
/home/soc/LiveGlobalThreatMapClaude/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 soc soc
}
```

### CSV File Management

The CSV file is automatically limited to 10,000 most recent events. For manual cleanup:

```bash
# Keep only last 5000 events
tail -n 5000 data/threat_data.csv > data/threat_data.csv.tmp
mv data/threat_data.csv.tmp data/threat_data.csv
```

### Backup Script

Create `/home/soc/backup-threat-data.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/backup/threat-map"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup CSV data
cp data/threat_data.csv $BACKUP_DIR/threat_data_$DATE.csv

# Keep only last 7 days of backups
find $BACKUP_DIR -name "threat_data_*.csv" -mtime +7 -delete
```

Add to crontab:
```bash
0 2 * * * /home/soc/backup-threat-data.sh
```

## Performance Tuning

### Node.js Process

For high-volume environments:

```bash
pm2 start backend/server.js --name threat-map --max-memory-restart 500M -i 2
```

### System Limits

Edit `/etc/security/limits.conf`:

```
*    soft    nofile    65535
*    hard    nofile    65535
```

## Troubleshooting

### Check Application Status

```bash
pm2 status
pm2 logs threat-map
```

### Check Port Binding

```bash
sudo netstat -tlnp | grep 3000
```

### Test API Endpoint

```bash
curl http://localhost:3000/api/health
```

### View Recent Logs

```bash
pm2 logs threat-map --lines 100
```

### Restart Application

```bash
pm2 restart threat-map
```

## Security Checklist

- [ ] Changed default API token to strong random value
- [ ] Configured IP whitelist for webhook endpoints
- [ ] Enabled firewall (ufw)
- [ ] Set up SSL/TLS certificates
- [ ] Configured log rotation
- [ ] Set up automated backups
- [ ] Disabled SSH password authentication (use keys)
- [ ] Configured fail2ban for SSH protection
- [ ] Regular security updates scheduled
- [ ] Monitoring and alerting configured

## Support

For issues or questions:
- Check logs: `pm2 logs threat-map`
- Review configuration: `cat config.json`
- Test connectivity: `curl http://localhost:3000/api/health`
- Contact SOC administrator
