const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// Read/write helpers for tables
const getFilePath = (table) => path.join(dbDir, `${table}.json`);

const readTable = (table) => {
  const file = getFilePath(table);
  if (!fs.existsSync(file)) {
    if (table === 'platform_stats') {
      return [{ id: 1, total_protected: 10432, scams_blocked: 25891, reports_today: 47 }];
    }
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return [];
  }
};

const writeTable = (table, data) => {
  fs.writeFileSync(getFilePath(table), JSON.stringify(data, null, 2), 'utf8');
};

// SQL Mock Engine
const db = {
  pragma: () => {},
  exec: () => {},
  
  prepare: (sql) => {
    const cleanSql = sql.replace(/\s+/g, ' ').trim();
    
    return {
      get: (...params) => {
        // --- 1. count tables ---
        if (cleanSql.includes('SELECT COUNT(*) as count FROM scam_reports WHERE verified = 1')) {
          const rows = readTable('scam_reports');
          return { count: rows.filter(r => r.verified === 1 || r.verified === true).length };
        }
        if (cleanSql.includes('SELECT COUNT(*) as count FROM scam_reports')) {
          const rows = readTable('scam_reports');
          return { count: rows.length };
        }
        if (cleanSql.includes('SELECT COUNT(*) as count FROM whatsapp_subscribers WHERE active = 1')) {
          const rows = readTable('whatsapp_subscribers');
          return { count: rows.filter(r => r.active === 1 || r.active === true).length };
        }
        if (cleanSql.includes('SELECT COUNT(*) as count FROM platform_stats')) {
          const rows = readTable('platform_stats');
          return { count: rows.length };
        }

        // --- 2. stats table select ---
        if (cleanSql.includes('SELECT * FROM platform_stats WHERE id = 1')) {
          const rows = readTable('platform_stats');
          return rows[0] || { id: 1, total_protected: 10432, scams_blocked: 25891, reports_today: 47 };
        }

        if (cleanSql.includes('SELECT id FROM users WHERE email = ?') || cleanSql.includes('SELECT * FROM users WHERE email = ?')) {
          const email = params[0]?.toLowerCase();
          const rows = readTable('users');
          const u = rows.find(r => r.email?.toLowerCase() === email);
          if (!u) return null;
          return { ...u, role: u.role || 'user' };
        }
        if (cleanSql.includes('SELECT id, name, email, plan, created_at FROM users WHERE id = ?')) {
          const id = params[0];
          const rows = readTable('users');
          const u = rows.find(r => r.id === id);
          if (!u) return null;
          return { id: u.id, name: u.name, email: u.email, plan: u.plan, role: u.role || 'user', created_at: u.created_at };
        }

        // --- 4. scam_reports find by id (admin verify check) ---
        if (cleanSql.includes('SELECT id FROM scam_reports WHERE id = ?')) {
          const id = params[0];
          const rows = readTable('scam_reports');
          return rows.find(r => r.id === id) || null;
        }

        // --- 4b. scam_reports find by identifier ---
        if (cleanSql.includes('SELECT id FROM scam_reports WHERE identifier = ?')) {
          const identifier = params[0];
          const rows = readTable('scam_reports');
          return rows.find(r => r.identifier === identifier) || null;
        }

        // --- 5. whatsapp subscriber find ---
        if (cleanSql.includes('SELECT id FROM whatsapp_subscribers WHERE phone = ?')) {
          const phone = params[0];
          const rows = readTable('whatsapp_subscribers');
          return rows.find(r => r.phone === phone) || null;
        }

        // --- 6. check logs count for user today ---
        if (cleanSql.includes('SELECT COUNT(*) as count FROM check_logs WHERE user_id = ?')) {
          const userId = params[0];
          const rows = readTable('check_logs');
          const today = new Date().toISOString().substring(0, 10);
          const userRows = rows.filter(r => r.user_id === userId && r.created_at && r.created_at.startsWith(today));
          return { count: userRows.length };
        }

        // --- 7. payment find by id ---
        if (cleanSql.includes('SELECT * FROM payments WHERE id = ?')) {
          const id = params[0];
          const rows = readTable('payments');
          return rows.find(r => r.id === id) || null;
        }

        return null;
      },

      all: (...params) => {
        // --- 0. admin select all whatsapp subscribers ---
        if (cleanSql === 'SELECT * FROM whatsapp_subscribers ORDER BY created_at DESC') {
          const rows = readTable('whatsapp_subscribers');
          rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          return rows;
        }

        // --- 0.5. admin select all scam reports ---
        if (cleanSql === 'SELECT * FROM scam_reports ORDER BY created_at DESC') {
          const rows = readTable('scam_reports');
          rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          return rows;
        }

        // --- 1. scam reports check by identifier LIKE ---
        if (cleanSql.includes('SELECT * FROM scam_reports WHERE identifier LIKE ?')) {
          const queryParam = params[0].replace(/%/g, '').toLowerCase();
          const rows = readTable('scam_reports');
          return rows.filter(r => r.identifier?.toLowerCase().includes(queryParam));
        }

        // --- 2. recent scam list with type filter, order, and pagination ---
        if (cleanSql.includes('SELECT * FROM scam_reports')) {
          let rows = readTable('scam_reports');
          
          // filter
          if (params.length > 0 && typeof params[0] === 'string' && params[0] !== '') {
            const filterType = params[0];
            rows = rows.filter(r => r.type === filterType);
          }
          
          // sort DESC by date
          rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
          // pagination params are usually last: limit, offset
          const offsetIdx = params.length - 1;
          const limitIdx = params.length - 2;
          const limit = (limitIdx >= 0 && typeof params[limitIdx] === 'number') ? params[limitIdx] : 10;
          const offset = (offsetIdx >= 0 && typeof params[offsetIdx] === 'number') ? params[offsetIdx] : 0;
          
          return rows.slice(offset, offset + limit);
        }

        // --- 3. select all payments ---
        if (cleanSql === 'SELECT * FROM payments ORDER BY created_at DESC') {
          const rows = readTable('payments');
          rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          return rows;
        }

        return [];
      },

      run: (...params) => {
        // --- 1. Insert User ---
        if (cleanSql.includes('INSERT INTO users') || cleanSql.includes('INSERT OR IGNORE INTO users')) {
          const rows = readTable('users');
          const [id, name, email, password, plan = 'free', role = 'user'] = params;
          
          // check duplicate
          if (rows.some(u => u.email?.toLowerCase() === email?.toLowerCase())) {
            return { changes: 0 };
          }
          
          rows.push({
            id, name, email, password, plan, role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          writeTable('users', rows);
          return { changes: 1 };
        }

        // --- 2. Insert Scam Report ---
        if (cleanSql.includes('INSERT INTO scam_reports')) {
          const rows = readTable('scam_reports');
          // Support both 6-param (no verified) and 7-param (with verified) signatures
          const [id, user_id, type, identifier, description, risk_score = 50, verified = 0] = params;
          rows.push({
            id, user_id, type, identifier, description, risk_score,
            status: verified === 1 ? 'confirmed' : 'pending',
            upvotes: 0,
            report_count: 1,
            verified: Number(verified),
            created_at: new Date().toISOString()
          });
          writeTable('scam_reports', rows);
          return { changes: 1 };
        }

        // --- 3. Update scam report counts ---
        if (cleanSql.includes('UPDATE scam_reports SET report_count = report_count + 1 WHERE id = ?')) {
          const id = params[0];
          const rows = readTable('scam_reports');
          const idx = rows.findIndex(r => r.id === id);
          if (idx !== -1) {
            rows[idx].report_count += 1;
            writeTable('scam_reports', rows);
          }
          return { changes: 1 };
        }
        
        if (cleanSql.includes('UPDATE scam_reports SET upvotes = upvotes + 1 WHERE id = ?')) {
          const id = params[0];
          const rows = readTable('scam_reports');
          const idx = rows.findIndex(r => r.id === id);
          if (idx !== -1) {
            rows[idx].upvotes += 1;
            writeTable('scam_reports', rows);
          }
          return { changes: 1 };
        }

        // --- 4. Update stats ---
        if (cleanSql.includes('UPDATE platform_stats SET reports_today = reports_today + 1 WHERE id = 1')) {
          const stats = readTable('platform_stats');
          if (stats[0]) {
            stats[0].reports_today += 1;
            writeTable('platform_stats', stats);
          }
          return { changes: 1 };
        }

        // --- 5. WhatsApp Subscription insert or update ---
        if (cleanSql.includes('INSERT INTO whatsapp_subscribers')) {
          const rows = readTable('whatsapp_subscribers');
          const [id, phone, categories] = params;
          rows.push({
            id, phone, categories, active: 1,
            created_at: new Date().toISOString()
          });
          writeTable('whatsapp_subscribers', rows);
          return { changes: 1 };
        }

        if (cleanSql.includes('UPDATE whatsapp_subscribers SET categories = ?, active = 1 WHERE phone = ?')) {
          const [categories, phone] = params;
          const rows = readTable('whatsapp_subscribers');
          const idx = rows.findIndex(r => r.phone === phone);
          if (idx !== -1) {
            rows[idx].categories = categories;
            rows[idx].active = 1;
            writeTable('whatsapp_subscribers', rows);
          }
          return { changes: 1 };
        }

        if (cleanSql.includes('UPDATE whatsapp_subscribers SET active = 0 WHERE phone = ?')) {
          const phone = params[0];
          const rows = readTable('whatsapp_subscribers');
          const idx = rows.findIndex(r => r.phone === phone);
          if (idx !== -1) {
            rows[idx].active = 0;
            writeTable('whatsapp_subscribers', rows);
          }
          return { changes: 1 };
        }

        // --- 5.5. Admin Update/Delete scam reports ---
        if (cleanSql.includes('UPDATE scam_reports SET status = ?, verified = ?, risk_score = ? WHERE id = ?')) {
          const [status, verified, risk_score, id] = params;
          const rows = readTable('scam_reports');
          const idx = rows.findIndex(r => r.id === id);
          if (idx !== -1) {
            rows[idx].status = status;
            rows[idx].verified = Number(verified);
            rows[idx].risk_score = Number(risk_score);
            writeTable('scam_reports', rows);
          }
          return { changes: 1 };
        }

        if (cleanSql.includes('DELETE FROM scam_reports WHERE id = ?')) {
          const id = params[0];
          const rows = readTable('scam_reports');
          const filtered = rows.filter(r => r.id !== id);
          writeTable('scam_reports', filtered);
          return { changes: 1 };
        }

        // --- 6. Check logs ---
        if (cleanSql.includes('INSERT INTO check_logs')) {
          const rows = readTable('check_logs');
          const [id, user_id, check_type, query, result, risk_score] = params;
          rows.push({
            id, user_id, check_type, query, result, risk_score,
            created_at: new Date().toISOString()
          });
          writeTable('check_logs', rows);
          return { changes: 1 };
        }

        // --- 7. Insert Payment Proof ---
        if (cleanSql.includes('INSERT INTO payments')) {
          const rows = readTable('payments');
          const [id, user_id, user_name, user_email, plan, amount, payment_method, transaction_id, screenshot, status, created_at] = params;
          rows.push({
            id, user_id, user_name, user_email, plan, amount, payment_method, transaction_id, screenshot, status, created_at
          });
          writeTable('payments', rows);
          return { changes: 1 };
        }

        // --- 8. Update payment status ---
        if (cleanSql.includes('UPDATE payments SET status = ? WHERE id = ?')) {
          const [status, id] = params;
          const rows = readTable('payments');
          const idx = rows.findIndex(r => r.id === id);
          if (idx !== -1) {
            rows[idx].status = status;
            writeTable('payments', rows);
          }
          return { changes: 1 };
        }

        // --- 9. Update user plan ---
        if (cleanSql.includes('UPDATE users SET plan = ? WHERE id = ?')) {
          const [plan, id] = params;
          const rows = readTable('users');
          const idx = rows.findIndex(r => r.id === id);
          if (idx !== -1) {
            rows[idx].plan = plan;
            writeTable('users', rows);
          }
          return { changes: 1 };
        }

        return { changes: 0 };
      }
    };
  }
};

module.exports = db;
