const db = require('./database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const scamData = [
  { type: 'phone', identifier: '03001234567', description: 'Fraudulent investment scheme claiming 500% returns', risk_score: 95, upvotes: 128, report_count: 34, verified: 1 },
  { type: 'phone', identifier: '03111111111', description: 'Fake bank representative asking for OTP', risk_score: 98, upvotes: 245, report_count: 67, verified: 1 },
  { type: 'phone', identifier: '03215555555', description: 'Lottery scam - claiming prize money', risk_score: 88, upvotes: 89, report_count: 22, verified: 1 },
  { type: 'whatsapp', identifier: '03451234567', description: 'Job offer scam asking for registration fee', risk_score: 92, upvotes: 156, report_count: 41, verified: 1 },
  { type: 'link', identifier: 'https://jazzcash-verify.fake-pk.com', description: 'Phishing site mimicking JazzCash payment portal', risk_score: 99, upvotes: 312, report_count: 89, verified: 1 },
  { type: 'link', identifier: 'https://easypaisa-update.scam-pk.net', description: 'Fake Easypaisa account update page', risk_score: 99, upvotes: 278, report_count: 76, verified: 1 },
  { type: 'social_media', identifier: 'fb.com/jazzcash.official.fake', description: 'Fake JazzCash Facebook page collecting credentials', risk_score: 87, upvotes: 94, report_count: 28, verified: 1 },
  { type: 'sms', identifier: '03001111111', description: 'SMS claiming SIM card will be deactivated', risk_score: 85, upvotes: 67, report_count: 19, verified: 0 },
  { type: 'email', identifier: 'noreply@hbl-secure.fake.com', description: 'Phishing email asking to verify HBL account', risk_score: 96, upvotes: 201, report_count: 55, verified: 1 },
  { type: 'phone', identifier: '03331234567', description: 'Impersonating FBR (tax) and demanding fines', risk_score: 91, upvotes: 113, report_count: 31, verified: 1 },
  { type: 'whatsapp', identifier: '03091234567', description: 'Fake job in Dubai — asking for processing fee', risk_score: 89, upvotes: 78, report_count: 24, verified: 0 },
  { type: 'link', identifier: 'http://pk-prize-winner.com', description: 'Prize winner scam requiring personal details', risk_score: 97, upvotes: 189, report_count: 52, verified: 1 },
];

console.log('🌱 Seeding database...');

// Seed a demo user
const hashedPw = bcrypt.hashSync('Demo@123', 10);
const demoUserId = uuidv4();
try {
  db.prepare(`INSERT OR IGNORE INTO users (id, name, email, password, plan, role) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(demoUserId, 'Demo User', 'demo@fraudradar.pk', hashedPw, 'plus', 'user');
  console.log('✅ Demo user created: demo@fraudradar.pk / Demo@123');
} catch (e) {
  console.log('⚠️  Demo user already exists');
}

// Seed an admin user
const adminHashedPw = bcrypt.hashSync('Admin@123', 10);
const adminUserId = uuidv4();
try {
  db.prepare(`INSERT OR IGNORE INTO users (id, name, email, password, plan, role) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(adminUserId, 'System Admin', 'admin@fraudradar.pk', adminHashedPw, 'business', 'admin');
  console.log('✅ Admin user created: admin@fraudradar.pk / Admin@123');
} catch (e) {
  console.log('⚠️  Admin user already exists');
}

// Seed scam reports
for (const scam of scamData) {
  try {
    db.prepare(`INSERT OR IGNORE INTO scam_reports (id, type, identifier, description, status, risk_score, upvotes, report_count, verified)
                VALUES (?, ?, ?, ?, 'confirmed', ?, ?, ?, ?)`)
      .run(uuidv4(), scam.type, scam.identifier, scam.description, scam.risk_score, scam.upvotes, scam.report_count, scam.verified);
  } catch (e) { }
}
console.log(`✅ Seeded ${scamData.length} scam reports`);
console.log('🎉 Seeding complete!');
process.exit(0);
