# 🍃 MongoDB Installation Guide for Windows

## Option 1: Download MongoDB Community Server (Recommended)

### Step 1: Download MongoDB
1. Go to: https://www.mongodb.com/try/download/community
2. Select:
   - **Version:** 7.0.x (Current)
   - **Platform:** Windows
   - **Package:** msi
3. Click **Download**

### Step 2: Install MongoDB
1. Run the downloaded `.msi` file as Administrator
2. Choose **Complete** installation type
3. **Important:** During installation, make sure to:
   - ✅ Install MongoDB as a Service
   - ✅ Install MongoDB Compass (optional but helpful GUI)
   - ✅ Use default data directory: `C:\Program Files\MongoDB\Server\7.0\`

### Step 3: Verify Installation
Open a **new** PowerShell window as Administrator and run:
```powershell
# Check if MongoDB service is running
Get-Service -Name "MongoDB"

# Or try to start it manually
net start MongoDB
```

### Step 4: Test MongoDB Connection
```powershell
# Navigate to MongoDB bin directory
cd "C:\Program Files\MongoDB\Server\7.0\bin"

# Test connection
.\mongosh.exe
```

You should see MongoDB shell prompt: `test>`

---

## Option 2: Using Winget (Windows Package Manager)

If you have winget available:

```powershell
# Install MongoDB Community
winget install MongoDB.Server

# Start the service
net start MongoDB
```

---

## Option 3: Manual MongoDB Setup

If automated installation doesn't work, you can set up MongoDB manually:

### Download and Extract
1. Download ZIP version from MongoDB website
2. Extract to: `C:\Program Files\MongoDB\Server\7.0\`

### Create Data Directory
```powershell
# Create data directory
New-Item -ItemType Directory -Force -Path "C:\data\db"
```

### Start MongoDB Manually
```powershell
# Navigate to MongoDB bin
cd "C:\Program Files\MongoDB\Server\7.0\bin"

# Start MongoDB manually
.\mongod.exe --dbpath "C:\data\db"
```

---

## 🔧 Troubleshooting

### Issue 1: "MongoDB service not found"
- Reinstall MongoDB with "Install as Service" option checked
- Or start MongoDB manually using `mongod.exe`

### Issue 2: "Access denied" or Permission errors
- Run PowerShell as Administrator
- Check that data directory exists: `C:\data\db`

### Issue 3: Port 27017 already in use
```powershell
# Check what's using port 27017
netstat -ano | findstr :27017

# Kill the process if needed (replace PID)
taskkill /PID <process_id> /F
```

### Issue 4: MongoDB won't start
1. Check Windows Event Viewer for MongoDB errors
2. Verify data directory permissions
3. Try starting manually with verbose logging:
   ```powershell
   .\mongod.exe --dbpath "C:\data\db" --verbose
   ```

---

## 🚀 Quick Verification Commands

Once MongoDB is installed, run these to verify:

```powershell
# 1. Check service status
Get-Service -Name "*mongo*"

# 2. Test connection
mongosh --eval "db.runCommand('ping')"

# 3. Show databases
mongosh --eval "show dbs"
```

---

## Next Steps

After MongoDB is installed and running:

1. **Seed the database:**
   ```powershell
   cd "d:\Angular Live Project\Git\Vedic-ebook-library\backend"
   npm run seed
   ```

2. **Start the backend server:**
   ```powershell
   npm run dev
   ```

3. **Test with Swagger UI:**
   - Open: http://localhost:5000/api-docs

---

**Note:** If you encounter any issues, let me know which installation method you tried and the specific error messages you received!