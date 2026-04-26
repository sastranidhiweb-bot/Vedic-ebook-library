# 🚀 Vedic E-Books VPS Deployment Guide

Complete guide to deploy your Vedic E-Books application on Hostinger VPS using Git.

## 📋 Prerequisites

- Hostinger VPS with Ubuntu 20.04+
- Domain name pointed to VPS
- Git repository (GitHub/GitLab)
- SSH access to VPS

## 🔧 Quick Setup Commands

### 1. Initial VPS Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 and Nginx
sudo npm install pm2 -g
sudo apt install nginx git -y

# Create app directory
sudo mkdir -p /var/www/vedic-ebooks
sudo chown -R $USER:$USER /var/www/vedic-ebooks
```

### 2. Clone and Deploy
```bash
# Clone your repository
cd /var/www
git clone https://github.com/yourusername/vedic-ebooks.git vedic-ebooks
cd vedic-ebooks

# Install dependencies
npm install --production

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.json
pm2 save
pm2 startup
```

### 3. Configure Nginx
```bash
# Copy Nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/vedic-ebooks
sudo ln -s /etc/nginx/sites-available/vedic-ebooks /etc/nginx/sites-enabled/

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
```

### 4. SSL Certificate (Optional)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

## 🔄 Future Updates

### Update Application
```bash
cd /var/www/vedic-ebooks
git pull origin main
npm install --production
npm run build
pm2 restart vedic-ebooks
```

### Monitor Application
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs vedic-ebooks

# Monitor resources
pm2 monit
```

## 📁 File Structure on VPS

```
/var/www/vedic-ebooks/
├── src/                    # Application source
├── public/
│   └── books/             # Uploaded Word documents
├── .next/                 # Built application
├── package.json
├── server.js              # Production server
├── ecosystem.config.json  # PM2 configuration
└── nginx.conf            # Nginx configuration
```

## 🔧 Configuration Files

### Environment Variables (.env.production)
```env
NODE_ENV=production
PORT=3000
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://yourdomain.com
MAX_FILE_SIZE=52428800
UPLOAD_DIR=public/books
```

### PM2 Configuration (ecosystem.config.json)
```json
{
  "apps": [{
    "name": "vedic-ebooks",
    "script": "server.js",
    "instances": 1,
    "autorestart": true,
    "max_memory_restart": "1G",
    "env": {
      "NODE_ENV": "production",
      "PORT": 3000
    }
  }]
}
```

## 🔍 Troubleshooting

### Check Application Status
```bash
# PM2 status
pm2 status

# Application logs
pm2 logs vedic-ebooks

# Nginx status
sudo systemctl status nginx

# Check ports
sudo netstat -tlnp | grep 3000
```

### Common Issues

1. **Port 3000 already in use**
   ```bash
   sudo lsof -i :3000
   sudo kill -9 [PID]
   ```

2. **Nginx configuration error**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. **File upload not working**
   - Check directory permissions: `ls -la public/books/`
   - Ensure write permissions: `chmod 755 public/books/`

## 🎯 Final Result

Your application will be available at:
- **HTTP**: http://yourdomain.com (redirects to HTTPS)
- **HTTPS**: https://yourdomain.com

Features:
✅ File-based storage (unlimited capacity)
✅ Word document upload and conversion
✅ Beautiful Sanskrit-themed interface
✅ Pagination and search
✅ Mobile responsive
✅ SSL encrypted
✅ Production optimized

## 📞 Support

- Application runs on port 3000 (proxied through Nginx)
- Uploaded books stored in `/var/www/vedic-ebooks/public/books/`
- Logs available via `pm2 logs vedic-ebooks`
- Process managed by PM2 (auto-restart on crashes)

Happy reading! 📚🕉️