# Update notes

- Preserved the supplied CampusConnect MERN application and updated its existing code.
- Student-facing claim/report APIs now omit personal phone/email contact fields.
- Admin-only APIs remain protected by `protect` + `adminOnly` middleware.
- Admin dashboard supports reviewing claims and deleting student accounts/items.
- Rejected pending claims leave the item available for another claim.
- Both founder and claimant must confirm handover before claim status becomes `successful`; `returnedAt` is recorded.
- Added local setup and Render/Vercel deployment instructions in `README.md` and `RUN-LOCALLY.md`.
