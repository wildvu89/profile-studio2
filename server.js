const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniq = Date.now() + '-' + Math.random().toString(36).slice(2,8);
    cb(null, uniq + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json({limit:'10mb'}));
app.use(express.urlencoded({extended:true}));

// Serve static
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/', express.static(path.join(__dirname, 'public')));

// Initialize SQLite (better-sqlite3)
const DB_FILE = path.join(__dirname, 'db.sqlite');
const db = new Database(DB_FILE);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    album_id TEXT,
    filename TEXT,
    url TEXT,
    type TEXT,
    comment TEXT,
    liked INTEGER DEFAULT 0,
    created_at TEXT,
    FOREIGN KEY(album_id) REFERENCES albums(id) ON DELETE CASCADE
  );
`);

// Helpers
const now = () => new Date().toISOString();

// Albums CRUD
app.post('/api/albums', (req, res) => {
  const { name, description } = req.body;
  if(!name) return res.status(400).json({error:'Missing name'});
  const id = Math.random().toString(36).slice(2,10);
  const stmt = db.prepare('INSERT INTO albums (id,name,description,created_at) VALUES (?,?,?,?)');
  stmt.run(id, name, description||'', now());
  res.json({ id, name, description });
});

app.get('/api/albums', (req, res) => {
  const rows = db.prepare('SELECT id,name,description,created_at FROM albums ORDER BY created_at DESC').all();
  res.json(rows);
});

app.get('/api/albums/:id', (req, res) => {
  const album = db.prepare('SELECT id,name,description,created_at FROM albums WHERE id = ?').get(req.params.id);
  if(!album) return res.status(404).json({error:'Album not found'});
  const photos = db.prepare('SELECT id,filename,url,type,comment,liked,created_at FROM photos WHERE album_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ album, photos });
});

// Add photo to album (multipart or JSON with url)
app.post('/api/albums/:id/photos', upload.single('file'), (req, res) => {
  const albumId = req.params.id;
  const album = db.prepare('SELECT id FROM albums WHERE id = ?').get(albumId);
  if(!album) return res.status(404).json({error:'Album not found'});

  if(req.file){
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const id = Math.random().toString(36).slice(2,10);
    const stmt = db.prepare('INSERT INTO photos (id,album_id,filename,url,type,comment,liked,created_at) VALUES (?,?,?,?,?,?,?,?)');
    const type = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    stmt.run(id, albumId, req.file.filename, url, type, '', 0, now());
    return res.json({ id, url, filename:req.file.filename });
  } else if(req.body.url){
    const id = Math.random().toString(36).slice(2,10);
    const url = req.body.url;
    const type = url.includes('.mp4') || url.includes('video') ? 'video' : 'image';
    db.prepare('INSERT INTO photos (id,album_id,filename,url,type,comment,liked,created_at) VALUES (?,?,?,?,?,?,?,?)')
      .run(id, albumId, '', url, type, '', 0, now());
    return res.json({ id, url });
  } else {
    return res.status(400).json({ error:'No file or url provided' });
  }
});

// Update photo (comment, like)
app.put('/api/photos/:id', (req, res) => {
  const id = req.params.id; const { comment, liked } = req.body;
  const photo = db.prepare('SELECT id FROM photos WHERE id = ?').get(id);
  if(!photo) return res.status(404).json({error:'Photo not found'});
  db.prepare('UPDATE photos SET comment = COALESCE(?,comment), liked = COALESCE(?,liked) WHERE id = ?').run(comment, liked, id);
  res.json({ ok:true });
});

// Delete photo
app.delete('/api/photos/:id', (req, res) => {
  const id = req.params.id;
  const p = db.prepare('SELECT filename FROM photos WHERE id=?').get(id);
  if(!p) return res.status(404).json({error:'Photo not found'});
  if(p.filename){ // delete file from uploads
    try{ fs.unlinkSync(path.join(UPLOAD_DIR, p.filename)); }catch(e){ /* ignore */ }
  }
  db.prepare('DELETE FROM photos WHERE id = ?').run(id);
  res.json({ ok:true });
});

// Simple health
app.get('/api/ping', (req,res)=>res.json({ok:true}));

app.listen(PORT, ()=> console.log(`Server listening on http://localhost:${PORT}`));
