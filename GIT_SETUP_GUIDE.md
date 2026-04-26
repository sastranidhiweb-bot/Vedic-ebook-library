# 🚀 Git Setup and VPS Deployment Instructions

## Step 1: Install Git on Windows

### Option A: Download Git for Windows
1. Go to: https://git-scm.com/download/win
2. Download and install Git for Windows
3. During installation, choose "Git from the command line and also from 3rd-party software"

### Option B: Install via Package Manager (if you have Chocolatey)
```powershell
choco install git
```

### Option C: Install via Winget
```powershell
winget install --id Git.Git -e --source winget
```

## Step 2: Setup Git Repository

### Initialize Repository
```bash
cd "d:\Angualr Live Project\EBooksApp"
git init
git add .
git commit -m "Initial commit - Vedic E-Books Application"
```

### Create GitHub Repository
1. Go to https://github.com and create new repository
2. Name it: `vedic-ebooks` or `vedic-ebooks-app`
3. Don't initialize with README (we already have files)
4. Copy the repository URL

### Push to GitHub
```bash
git remote add origin https://github.com/yourusername/vedic-ebooks.git
git branch -M main
git push -u origin main
```

## Step 3: VPS Deployment Commands

### Connect to Your Hostinger VPS
```bash
ssh root@your-vps-ip
# OR if you have a user account:
ssh username@your-vps-ip
```

### One-Command Deployment
```bash
# Update system and install requirements
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && \
sudo apt-get install -y nodejs nginx git && \
sudo npm install pm2 -g && \

# Clone and setup application
cd /var/www && \
sudo git clone https://github.com/yourusername/vedic-ebooks.git vedic-ebooks && \
sudo chown -R $USER:$USER vedic-ebooks && \
cd vedic-ebooks && \

# Install and build
npm install --production && \
npm run build && \

# Configure and start
sudo cp nginx.conf /etc/nginx/sites-available/vedic-ebooks && \
sudo ln -s /etc/nginx/sites-available/vedic-ebooks /etc/nginx/sites-enabled/ && \
sudo nginx -t && \
sudo systemctl restart nginx && \

# Start application
pm2 start ecosystem.config.json && \
pm2 save && \
pm2 startup
```

## Step 4: Configure Your Domain

### Update Nginx Configuration
```bash
# Edit the nginx configuration with your domain
sudo nano /etc/nginx/sites-available/vedic-ebooks

# Replace 'your-domain.com' with your actual domain
# Save and restart nginx
sudo systemctl restart nginx
```

### Optional: Setup SSL
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## 🔄 Future Updates Workflow

When you make changes to your app:

### On Your Local Machine:
```bash
cd "d:\Angualr Live Project\EBooksApp"
git add .
git commit -m "Description of changes"
git push origin main
```

### On Your VPS:
```bash
cd /var/www/vedic-ebooks
git pull origin main
npm install --production
npm run build
pm2 restart vedic-ebooks
```

## 📁 What Gets Deployed

✅ **Included in Git:**
- Source code (`src/` folder)
- Configuration files
- Production server setup
- Sample books (if you want them)
- Documentation

❌ **Excluded from Git:**
- `node_modules/` (will be installed on VPS)
- `.next/` build folder (will be built on VPS)
- Development files
- Local environment files

## 🎯 Final Setup Checklist

- [ ] Install Git on Windows
- [ ] Create GitHub repository
- [ ] Push code to GitHub
- [ ] Connect to Hostinger VPS
- [ ] Run deployment command
- [ ] Configure domain in nginx
- [ ] Setup SSL certificate
- [ ] Test application

## 📞 Quick Reference

### Important Commands:
```bash
# Check application status
pm2 status

# View logs
pm2 logs vedic-ebooks

# Restart application
pm2 restart vedic-ebooks

# Check nginx status
sudo systemctl status nginx
```

### Your Application URLs:
- **Local Development**: http://localhost:3000
- **Production VPS**: https://yourdomain.com

🎉 **Your Vedic E-Books library will be live on the internet!** 📚🕉️