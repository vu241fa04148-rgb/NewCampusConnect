# CampusConnect – 20-minute deployment checklist

This project uses a Vite frontend, Express backend, and MongoDB Atlas.

## 1. MongoDB Atlas (3 minutes)
- Open Atlas → Database → Browse Collections → `campusconnect` → `users`.
- Keep the existing database and collections; do not delete or reset them.
- If the Render logs show `bad auth`, reset the password for the database user used in the connection string. Do not share the password in chat or screenshots.

## 2. Render backend (5 minutes)
Create or open the Web Service connected to this repository.
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment variables:
  - `MONGO_URI` = Atlas connection string ending with `/campusconnect?retryWrites=true&w=majority`
  - `JWT_SECRET` = a new long random secret (do not reuse an exposed value)
  - `CORS_ORIGIN` = `https://campus-connect-five-wheat.vercel.app`
  - `NODE_ENV` = `production`
- Deploy and wait until the service is Live.
- Open `https://YOUR-RENDER-SERVICE.onrender.com/`. It should return JSON with `status: running`.

## 3. Vercel frontend (5 minutes)
Open the Vercel project connected to this repository.
- Root Directory: `frontend`
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable:
  - `VITE_API_URL` = `https://YOUR-RENDER-SERVICE.onrender.com/api`
- Redeploy after saving the environment variable.

## 4. Create admin account (2 minutes)
- Register the trusted admin account through the app first.
- Atlas → `campusconnect` → `users` → find that exact email → edit only `role` to `admin`.
- Log out and log back in. Public registration intentionally cannot create admin users.

## 5. Test (5 minutes)
1. Register/login as a student.
2. Report a found item with contact details.
3. Log in as a second student and submit a claim with proof.
4. Log in as admin; approve the claim.
5. Log in as founder; click `I Returned This Item`.
6. Log in as claimant; click `I Received My Item`.
7. Confirm status becomes `successful` and the item becomes `returned`.

## Important
- Never commit `.env` files or paste secrets into chat.
- If Atlas reports `bad auth`, fix the database username/password in Render's `MONGO_URI`; changing the local `.env` alone does not update Render.
- I cannot deploy into your private Render/Vercel accounts from this ZIP alone. The account owner must connect/push the repository and save the environment variables.
