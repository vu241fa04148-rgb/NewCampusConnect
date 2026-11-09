# CampusConnect — updated existing project

This is an update to the supplied CampusConnect MERN project. It keeps the existing React/Vite frontend, Express API, MongoDB models and styling.

## Main changes
- Student and admin experiences are separated; admin users land on the Admin Dashboard after login.
- Student reports are restricted to `I Lost This` and `I Found This`.
- Students can browse listings, report items, submit claims, and track reports/claims.
- Admin APIs are protected by database-backed role checks. Public registration cannot assign the admin role.
- Admin can review/approve/reject claims, inspect users/items/claims, and delete student accounts or items. An item with an approved claim cannot be deleted until the claim is resolved.
- Founder and claimant confirmations are separate. A claim becomes `successful` only after both parties confirm; `returnedAt` stores the completion date/time.
- Student-facing APIs do not return phone/email contact fields. Admin-only views retain contact access.
- Rejecting an approved claim is not allowed; when a pending claim is rejected, the item remains available. The item is reserved on approval.
- Existing styling retained and responsive layouts preserved.

## Requirements
- Node.js 18 or newer (Node 20 LTS recommended)
- npm
- MongoDB Atlas account / database

## Run locally (Windows PowerShell)

### 1. Extract and open
Extract the ZIP. Open the extracted `CampusConnect` folder (the folder containing `backend`, `frontend`, and `README.md`) in VS Code.

### 2. Configure MongoDB and backend
1. In MongoDB Atlas, create a database user and allow your current IP address in Network Access.
2. Copy the Atlas connection string. Replace the username/password placeholders and use database name `campusconnect`.
3. Open a terminal:

```powershell
cd backend
Copy-Item .env.example .env
```

4. Edit `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/campusconnect?retryWrites=true&w=majority
JWT_SECRET=PASTE_A_LONG_RANDOM_SECRET_HERE
CORS_ORIGIN=http://localhost:5173
```

Use a long random JWT secret. Do not commit `.env` to GitHub.

5. Install and start backend:

```powershell
npm install
npm run dev
```

Expected: `MongoDB Connected Successfully` and `Server running on port 5000`.
Test in browser: `http://localhost:5000/`.

### 3. Configure and start frontend
Open a second terminal:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Ensure `frontend/.env` contains:

```env
VITE_API_URL=http://localhost:5000/api
```

Open the Vite URL printed in terminal, normally `http://localhost:5173`.

### 4. Create an admin account securely
1. Register the intended admin account through the normal registration form.
2. In MongoDB Atlas → `campusconnect` database → `users` collection, find that exact account.
3. Change only its `role` field from `student` to `admin`.
4. Log out and log back in. The backend checks the role from MongoDB on every protected request; students cannot call admin APIs by changing frontend state.

Never add a public admin-registration option or hardcode admin credentials.

## Build check
From `frontend`:

```powershell
npm run build
```

## Deploy

### Backend — Render
- Create a new Web Service connected to this GitHub repository.
- Root Directory: `backend` (the folder containing `package.json` and `server.js`).
- Build Command: `npm install`
- Start Command: `npm start`
- Add environment variables: `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`.
- `CORS_ORIGIN` must contain your exact Vercel frontend origin, e.g. `https://your-app.vercel.app`. For local development, include `http://localhost:5173` separated by a comma.
- Render supplies `PORT` automatically; no need to set it.

### Frontend — Vercel
- Import the same repository.
- Root Directory: `CampusConnect-main/frontend` (or `frontend` if repository root is the extracted project folder).
- Framework preset: Vite.
- Build Command: `npm run build`
- Output Directory: `dist`
- Add environment variable `VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`.
- Redeploy after adding the variable.
- Add the final Vercel URL to backend `CORS_ORIGIN` in Render and redeploy the backend.

## Important privacy/security notes
- Student item listings and student claim/report pages intentionally hide phone numbers and email addresses.
- Admin pages can display contact information to support moderation and handover administration.
- Admin role is assigned only through the trusted database procedure above.
- Keep MongoDB credentials and JWT secret private. If a secret was ever committed to GitHub, rotate it.

## Troubleshooting
- `MONGO_URI is missing`: create `backend/.env` from `.env.example` and fill it.
- MongoDB connection error: check Atlas database username/password, IP allowlist, and URL-encode special characters in the password.
- CORS error: make `CORS_ORIGIN` exactly match the frontend origin (scheme + hostname, no trailing slash), then restart/redeploy backend.
- Frontend cannot reach API: check `VITE_API_URL`, then restart Vite or redeploy Vercel.
- Admin link missing: confirm the account's MongoDB `role` is `admin`, log out, and log in again.
