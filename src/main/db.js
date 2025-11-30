const Database = require('better-sqlite3');

function init(dbPath) {
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY, title TEXT, description TEXT, published_at TEXT, raw TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY, channel_id TEXT, title TEXT, description TEXT, tags TEXT, duration_seconds INTEGER,
      is_shorts INTEGER DEFAULT 0, published_at TEXT, raw TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS video_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT, video_id TEXT, snapshot_at TEXT, view_count INTEGER,
      like_count INTEGER, comment_count INTEGER, raw TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_video_metrics_video_time ON video_metrics (video_id, snapshot_at);
  `);

  return {
    getSetting: (key) => {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
      return row ? row.value : null;
    },
    setSetting: (key, value) => {
      const stmt = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
      stmt.run(key, String(value));
    },
    upsertChannel: (ch) => {
      const stmt = db.prepare(`INSERT INTO channels(id,title,description,published_at,raw) VALUES(?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description, raw=excluded.raw`);
      stmt.run(ch.id, ch.title, ch.description, ch.publishedAt || null, JSON.stringify(ch.raw || {}));
    },
    upsertVideo: (v) => {
      const stmt = db.prepare(`INSERT INTO videos(id,channel_id,title,description,tags,duration_seconds,is_shorts,published_at,raw)
        VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description,
        tags=excluded.tags, duration_seconds=excluded.duration_seconds, is_shorts=excluded.is_shorts, raw=excluded.raw`);
      stmt.run(v.id, v.channelId, v.title, v.description, JSON.stringify(v.tags || []), v.duration_seconds, v.is_shorts ? 1 : 0, v.published_at || null, JSON.stringify(v.raw || {}));
    },
    insertMetric: (m) => {
      const stmt = db.prepare(`INSERT INTO video_metrics(video_id, snapshot_at, view_count, like_count, comment_count, raw)
        VALUES(?,?,?,?,?,?)`);
      stmt.run(m.video_id, m.snapshot_at, m.view_count || 0, m.like_count || 0, m.comment_count || 0, JSON.stringify(m.raw || {}));
    },
    getTopShorts: (limit) => {
      const rows = db.prepare(`
        SELECT v.id, v.title, v.channel_id, v.duration_seconds, v.is_shorts,
               (SELECT view_count FROM video_metrics vm WHERE vm.video_id = v.id ORDER BY snapshot_at DESC LIMIT 1) as view_count,
               (SELECT like_count FROM video_metrics vm WHERE vm.video_id = v.id ORDER BY snapshot_at DESC LIMIT 1) as like_count,
               (SELECT comment_count FROM video_metrics vm WHERE vm.video_id = v.id ORDER BY snapshot_at DESC LIMIT 1) as comment_count,
               (SELECT snapshot_at FROM video_metrics vm WHERE vm.video_id = v.id ORDER BY snapshot_at DESC LIMIT 1) as snapshot_at
        FROM videos v
        WHERE v.is_shorts = 1
        ORDER BY COALESCE(view_count, 0) DESC
        LIMIT ?
      `).all(limit || 50);
      return rows;
    },
    getVideoMetrics: (videoId) => {
      return db.prepare(`SELECT snapshot_at, view_count, like_count, comment_count FROM video_metrics WHERE video_id = ? ORDER BY snapshot_at ASC`).all(videoId);
    },
    exportCSV: (kind) => {
      if (kind === 'videos') {
        const rows = db.prepare('SELECT id,title,channel_id,is_shorts,duration_seconds,created_at FROM videos').all();
        const header = 'id,title,channel_id,is_shorts,duration_seconds,created_at\n';
        const body = rows.map(r => `${r.id},"${(r.title||'').replace(/"/g,'""')}",${r.channel_id},${r.is_shorts},${r.duration_seconds},${r.created_at}`).join('\n');
        return header + body;
      } else if (kind === 'metrics') {
        const rows = db.prepare('SELECT video_id,snapshot_at,view_count,like_count,comment_count FROM video_metrics').all();
        const header = 'video_id,snapshot_at,view_count,like_count,comment_count\n';
        const body = rows.map(r => `${r.video_id},${r.snapshot_at},${r.view_count},${r.like_count},${r.comment_count}`).join('\n');
        return header + body;
      }
      return '';
    }
  };
}

module.exports = { init };
