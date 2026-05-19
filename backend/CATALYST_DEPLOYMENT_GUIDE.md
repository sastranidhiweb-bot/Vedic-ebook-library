# Zoho Catalyst Appsail Deployment Guide for Node.js Backend

This guide provides step-by-step instructions to deploy your Node.js backend to Zoho Catalyst Appsail.

---

## 1. Prerequisites
- Node.js and npm installed
- Catalyst CLI installed (`npm i -g zcatalyst-cli`)
- Zoho account and Catalyst project access

---

## 2. Catalyst CLI Setup
```sh
# Check Catalyst CLI version
catalyst --version

# Log in to Zoho Catalyst
catalyst login
```

---

## 3. Project Initialization
```sh
# Navigate to your backend directory
cd backend

# Initialize Catalyst project (create/select new project)
catalyst init --force
```
- When prompted, create a new project (e.g., `vedic-ebook-library-backend`).
- Select features as needed (or press Enter to skip).

---

## 4. Prepare catalyst.json
- Ensure `catalyst.json` includes your app entry point and environment variables.
- Example:
```json
{
  "project_type": "advancedio",
  "app": {
    "main": "src/server.js",
    "platform": "nodejs18"
  },
  "environment_variables": {
    "MONGODB_URI": "<your-mongodb-uri>",
    "JWT_SECRET": "<your-jwt-secret>"
  },
  "features": []
}
```

---

## 5. Set Environment Variables (Recommended)
- Go to Catalyst Console > AppSail > Configuration > Environment Variables
- Add all required variables (e.g., `MONGODB_URI`, `JWT_SECRET`, `CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET`)

---

## 6. Deploy to Appsail
```sh
# Deploy the backend to Appsail
catalyst deploy appsail
```
- When prompted:
  - AppSail name: `vedic-ebook-library-backend`
  - Build directory: `.`
  - Stack: `NodeJS 18` (or as required)
  - Start command: `npm start`

---

## 7. Restart/Redeploy to Apply Changes
- In Catalyst Console, go to AppSail > vedic-ebook-library-backend
- Click the three dots (⋯) or "More" and select **Restart** or **Redeploy**
- Or redeploy from CLI:
```sh
catalyst deploy appsail
```

---

## 8. Check Logs
- In Catalyst Console, click **View Logs** for troubleshooting.

---

## 9. Test Your App
- Visit the provided AppSail URL to verify your backend is running.

---

## Notes
- Always keep secrets (like DB URIs and API keys) in environment variables, not in code.
- For any errors, check logs in the Catalyst Console.
