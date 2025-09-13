# Profile Studio - SQLite edition

This package contains a frontend (public/index.html) and an Express backend using SQLite (better-sqlite3).
It supports:
- Albums CRUD (SQLite)
- Upload media to server (/api/albums/:id/photos)
- Crop on frontend (Cropper.js) with preset ratios and export quality options
- API endpoints for photos: update comment/like, delete photo

## Run locally
1. npm install
2. npm start
3. Open http://localhost:3000

## Notes
- Uploaded files are stored in /uploads and their URLs saved in SQLite.
- Frontend stores some UI state in localStorage but primarily can use backend for persistent storage.
