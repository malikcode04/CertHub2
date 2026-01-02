
import express from 'express';
import mysql from 'mysql2/promise';
import { v2 as cloudinary } from 'cloudinary';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();

// --- SECURITY & LOGGING ---
app.use(helmet()); // Basic security headers
app.use(morgan('dev')); // Request logging
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate Limiting: Limit public/auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);
app.use('/api/public', authLimiter);

// --- CONFIGURATION ---
// Put your keys in .env file or Vercel Environment Variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('❌ CRITICAL: JWT_SECRET is missing in production!');
  process.exit(1);
}

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: process.env.DB_HOST === 'localhost' ? undefined : { rejectUnauthorized: true }
};

import nodemailer from 'nodemailer';

// --- CONFIGURATION ---
// ... (rest of config)

const transporter = (process.env.EMAIL_USER && process.env.EMAIL_PASS)
  ? nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })
  : null;

const sendEmail = async (to, subject, text, html) => {
  if (!transporter) {
    console.log('Skipping email: No credentials configured');
    return;
  }
  try {
    await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text, html });
  } catch (err) {
    console.error('Email Send Error:', err);
  }
};

// --- HELPER ---
const validateEnv = () => {
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'CLOUDINARY_CLOUD_NAME'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ CRITICAL: Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
};
validateEnv();

const initDB = async () => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    console.log(`🔗 Checking database schema at ${dbConfig.host}...`);

    // 1. Ensure 'users' table exists with CORE columns only
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('STUDENT', 'TEACHER', 'ADMIN') NOT NULL DEFAULT 'STUDENT',
        avatar VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Supporting Tables
    const tables = [
      `CREATE TABLE IF NOT EXISTS platforms (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(50) DEFAULT 'bg-slate-500',
        icon VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS classes (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        course_name VARCHAR(255) NOT NULL,
        teacher_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS class_enrollments (
        id VARCHAR(255) PRIMARY KEY,
        class_id VARCHAR(255) NOT NULL,
        student_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS certificates (
        id VARCHAR(255) PRIMARY KEY,
        student_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        platform VARCHAR(255) NOT NULL,
        issued_date DATE NOT NULL,
        file_url TEXT NOT NULL,
        status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
        remarks TEXT,
        verified_by VARCHAR(255),
        verified_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255),
        action VARCHAR(255) NOT NULL,
        details TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const sql of tables) {
      await connection.execute(sql);
    }

    // Performance Indexes
    try { await connection.execute('ALTER TABLE certificates ADD INDEX idx_student (student_id)'); } catch (e) { }
    try { await connection.execute('ALTER TABLE certificates ADD INDEX idx_status (status)'); } catch (e) { }

    console.log('✅ Database Schema Synchronized');
  } catch (err) {
    console.error('❌ Database Initialization Failed:', err);
    throw err;
  } finally {
    await connection.end();
  }
};
// Removed: initDB(); (We will call it in the listen block)

const logAction = async (userId, userName, action, details) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const id = `log${Date.now()}`;
    await connection.execute(
      'INSERT INTO audit_logs (id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)',
      [id, userId, userName, action, details]
    );
  } catch (err) {
    console.error('Audit Log Error:', err);
  } finally {
    await connection.end();
  }
};

// --- ROUTES ---

// Health Check
app.get('/', (req, res) => {
  res.send('CertHub API is running');
});

// Admin: Audit Logs
app.get('/api/admin/logs', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    let rows;
    try {
      [rows] = await connection.execute('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100');
    } finally {
      await connection.end();
    }
    res.json(rows);
  } catch (err) {
    console.error('Get Logs Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Public: Verify Certificate (No Auth Required)
app.get('/api/public/certificates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    let rows;
    try {
      [rows] = await connection.execute(
        `SELECT certificates.*, users.name as student_name 
         FROM certificates 
         JOIN users ON certificates.student_id = users.id 
         WHERE certificates.id = ?`,
        [id]
      );
    } finally {
      await connection.end();
    }

    if (rows.length === 0) return res.status(404).json({ error: 'Certificate not found' });

    const row = rows[0];
    res.json({
      id: row.id,
      studentId: row.student_id,
      studentName: row.student_name,
      title: row.title,
      platform: row.platform,
      issuedDate: row.issued_date,
      fileUrl: row.file_url,
      status: row.status,
      remarks: row.remarks,
      verifiedBy: row.verified_by,
      verifiedAt: row.verified_at
    });
  } catch (err) {
    console.error('Public Verify Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Auth: Register
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const connection = await mysql.createConnection(dbConfig);

    try {
      const [existing] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
      const id = `u${Date.now()}`;

      // Insert User (Simplified: No roll_number)
      await connection.execute(
        'INSERT INTO users (id, name, email, password, role, avatar) VALUES (?, ?, ?, ?, ?, ?)',
        [id, name, email, hashedPassword, role, avatar]
      );

      const token = jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '1d' });

      // Audit Log
      await logAction(id, name, 'REGISTER', `User registered as ${role}`);

      res.json({ token, user: { id, name, email, role, avatar } });

    } finally {
      await connection.end();
    }
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Auth: Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const connection = await mysql.createConnection(dbConfig);
    let rows;
    try {
      [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
    } finally {
      await connection.end();
    }

    if (rows.length === 0) return res.status(401).json({ error: 'User not found' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Certificates: Upload & AI Analyze
app.post('/api/certificates', async (req, res) => {
  try {
    const { title, platform, issuedDate, studentId, imageBase64 } = req.body;

    // 1. Upload to Cloudinary
    const uploadRes = await cloudinary.uploader.upload(imageBase64, {
      folder: 'certhub_certificates'
    });
    const fileUrl = uploadRes.secure_url;

    // 2. Insert to DB
    const id = `c${Date.now()}`;
    const connection = await mysql.createConnection(dbConfig);
    try {
      await connection.execute(
        'INSERT INTO certificates (id, student_id, title, platform, issued_date, file_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, studentId, title, platform, issuedDate, fileUrl, 'PENDING']
      );
    } finally {
      await connection.end();
    }

    // Return camelCase to match types.ts
    res.json({ id, studentId, title, platform, issuedDate, fileUrl, status: 'PENDING' });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Certificates: Get All (or filter by studentId)
app.get('/api/certificates', async (req, res) => {
  try {
    const { studentId, teacherId } = req.query;
    let query = 'SELECT * FROM certificates';
    let params = [];

    if (studentId) {
      query += ' WHERE student_id = ?';
      params.push(studentId);
    }

    // Note: For teacherId, we would need to join with users/mappings, but keeping it simple for now
    // Assuming teacher wants to see all checks or logic handles it in frontend filtering for this MVP

    const connection = await mysql.createConnection(dbConfig);
    let rows;
    try {
      [rows] = await connection.execute(query, params);
    } finally {
      await connection.end();
    }

    // Map snake_case to camelCase
    const certificates = rows.map(row => ({
      id: row.id,
      studentId: row.student_id,
      title: row.title,
      platform: row.platform,
      issuedDate: row.issued_date,
      fileUrl: row.file_url,
      status: row.status,
      remarks: row.remarks,
      verifiedBy: row.verified_by,
      verifiedAt: row.verified_at
    }));

    res.json(certificates);
  } catch (err) {
    console.error('Get Certificates Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Certificates: Update (Verify/Reject)
app.put('/api/certificates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, verifiedBy } = req.body;

    const connection = await mysql.createConnection(dbConfig);
    try {
      // Get student email for notification
      const [certs] = await connection.execute(
        'SELECT c.*, u.email, u.name as studentName FROM certificates c JOIN users u ON c.student_id = u.id WHERE c.id = ?',
        [id]
      );

      if (certs.length === 0) return res.status(404).json({ error: 'Certificate not found' });
      const cert = certs[0];

      await connection.execute(
        'UPDATE certificates SET status = ?, remarks = ?, verified_by = ?, verified_at = NOW() WHERE id = ?',
        [status, remarks || null, verifiedBy, id]
      );

      // Audit Log
      await logAction(verifiedBy, 'SYSTEM', status === 'VERIFIED' ? 'VERIFY' : 'REJECT', `Certificate ${id} marked as ${status}`);

      // Email Notification
      const subject = `Certificate ${status}: ${cert.title}`;
      const text = `Hi ${cert.studentName},\n\nYour certificate for ${cert.title} has been ${status.toLowerCase()}.\nRemarks: ${remarks || 'None'}`;
      const html = `<h3>Hi ${cert.studentName},</h3><p>Your certificate for <b>${cert.title}</b> has been <b>${status.toLowerCase()}</b>.</p><p>Remarks: ${remarks || 'None'}</p>`;

      await sendEmail(cert.email, subject, text, html);

    } finally {
      await connection.end();
    }

    res.json({ success: true, id, status });
  } catch (err) {
    console.error('Update Certificate Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Users: Get All (for Teachers to see Students)
app.get('/api/users', async (req, res) => {
  try {
    const { role } = req.query;
    let query = 'SELECT id, name, email, role, avatar FROM users';
    let params = [];

    if (role) {
      query += ' WHERE role = ?';
      params.push(role);
    }

    const connection = await mysql.createConnection(dbConfig);
    let rows;
    try {
      [rows] = await connection.execute(query, params);
    } finally {
      await connection.end();
    }

    res.json(rows);
  } catch (err) {
    console.error('Get Users Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Platforms: Get All & Add
app.get('/api/platforms', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    let rows;
    try {
      [rows] = await connection.execute('SELECT * FROM platforms');
    } finally {
      await connection.end();
    }
    res.json(rows);
  } catch (err) {
    console.error('Get Platforms Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/platforms', async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    const id = `p${Date.now()}`;
    const connection = await mysql.createConnection(dbConfig);
    try {
      await connection.execute(
        'INSERT INTO platforms (id, name, color, icon) VALUES (?, ?, ?, ?)',
        [id, name, color, icon]
      );
    } finally {
      await connection.end();
    }
    res.json({ id, name, color, icon });
  } catch (err) {
    console.error('Add Platform Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Note: Class and Enrollment endpoints removed for simplification as requested.

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('SERVER_ERROR:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message
  });
});

// Export for Vercel
export default app;

const PORT = process.env.PORT || 5000;
// Render/Standard hosts need to listen and init DB
if (process.env.NODE_ENV !== 'production' || process.env.RENDER || !process.env.VERCEL) {
  initDB().then(() => {
    app.listen(PORT, () => console.log(`🚀 CertHub Server running on http://localhost:${PORT}`));
  }).catch(err => {
    console.error('🛑 Server failed to start due to DB initialization error');
    process.exit(1);
  });
}
