
# 🚀 CertHub Production Deployment Guide

Follow these steps to deploy CertHub as a real-world application.

## 1. Prerequisites
- **MySQL**: Local installation or Cloud instance (e.g., Aiven, DigitalOcean).
- **Node.js**: Installed on your machine.
- **Accounts**: Cloudinary (Image storage), Render (Backend), Firebase (Frontend).

## 2. Backend Setup (Render)
1. Initialize a new repo with `server.js` and `package.json`.
2. Create a "Web Service" on Render.
3. Add these Environment Variables:
   - `DB_HOST`: Your MySQL host.
   - `DB_USER`: Your MySQL username.
   - `DB_PASSWORD`: Your MySQL password.
   - `DB_NAME`: Your MySQL database name.
   - `CLOUDINARY_CLOUD_NAME`: From Cloudinary dashboard.
   - `CLOUDINARY_API_KEY`: From Cloudinary dashboard.
   - `CLOUDINARY_API_SECRET`: From Cloudinary dashboard.
   - `API_KEY`: Your Google Gemini API Key.
   - `JWT_SECRET`: A long random string.

## 3. Database Setup
1. Open your MySQL client (Workbench, phpMyAdmin).
2. Execute the contents of `database/schema.sql`.

## 4. Frontend Setup (Firebase)
1. In `App.tsx`, change `API_BASE_URL` to your Render URL.
2. Install Firebase CLI: `npm install -g firebase-tools`.
3. Run `firebase login`.
4. Run `firebase init hosting`.
5. Run `npm run build`.
6. Deploy: `firebase deploy`.

## 5. Security Note
All sensitive operations (AI Analysis, Database credentials) are now handled on the **Backend (Render)** to ensure users cannot see your private keys in the browser.
