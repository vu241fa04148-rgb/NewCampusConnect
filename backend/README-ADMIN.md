# Admin account setup

1. Register the account through the normal CampusConnect registration page.
2. In MongoDB Atlas, open `campusconnect` → `users`.
3. Find the trusted account by its exact email address.
4. Change only its `role` field from `student` to `admin`.
5. Log out and log in again so the frontend receives the updated role in a fresh token/session.

Public registration intentionally does not accept a `role` value. Never make admin role selection available to normal users.
