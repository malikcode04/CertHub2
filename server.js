
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
        department VARCHAR(100),
        current_class VARCHAR(100),
        section VARCHAR(50),
        roll_number VARCHAR(50) UNIQUE,
        mobile_number VARCHAR(20),
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

    // 3. Schema Migrations (Ensure missing columns exist)
    console.log('🔄 Running Schema Migrations...');
    try { await connection.execute('ALTER TABLE users ADD COLUMN department VARCHAR(100)'); } catch (e) { }
    try { await connection.execute('ALTER TABLE users ADD COLUMN current_class VARCHAR(100)'); } catch (e) { }
    try { await connection.execute('ALTER TABLE users ADD COLUMN section VARCHAR(50)'); } catch (e) { }
    try { await connection.execute('ALTER TABLE users ADD COLUMN roll_number VARCHAR(50)'); } catch (e) { }
    try { await connection.execute('ALTER TABLE users ADD COLUMN mobile_number VARCHAR(20)'); } catch (e) { }
    try { await connection.execute('ALTER TABLE users ADD UNIQUE INDEX idx_roll (roll_number)'); } catch (e) { }

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
const apiRouter = express.Router();

// Health Check (At root level)
app.get('/', (req, res) => {
  res.send('CertHub API is running');
});

// Admin: Audit Logs
apiRouter.get('/admin/logs', async (req, res) => {
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
apiRouter.get('/public/certificates/:id', async (req, res) => {
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
apiRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, department, currentClass, section, rollNumber, mobileNumber } = req.body;

    // Check if user exists
    const connection = await mysql.createConnection(dbConfig);

    try {
      const [existing] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Check rollback number uniqueness if provided
      if (rollNumber) {
        const [existingRoll] = await connection.execute('SELECT * FROM users WHERE roll_number = ?', [rollNumber]);
        if (existingRoll.length > 0) {
          return res.status(400).json({ error: 'Roll Number already exists' });
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
      const id = `u${Date.now()}`;

      // Insert User
      await connection.execute(
        'INSERT INTO users (id, name, email, password, role, department, current_class, section, roll_number, mobile_number, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, name, email, hashedPassword, role, department || null, currentClass || null, section || null, rollNumber || null, mobileNumber || null, avatar]
      );

      // --- Auto-Sync Class Logic ---
      if (currentClass) {
        // 1. Check if class exists
        const [classes] = await connection.execute('SELECT * FROM classes WHERE name = ?', [currentClass]);
        let classId = null;

        if (classes.length > 0) {
          classId = classes[0].id;
        } else {
          // 2. Create class if it doesn't exist
          // We need a teacher_id for the class. Pick the first Admin or Teacher available.
          const [staff] = await connection.execute("SELECT id FROM users WHERE role IN ('ADMIN', 'TEACHER') LIMIT 1");
          if (staff.length > 0) {
            const teacherId = staff[0].id;
            classId = `c${Date.now()}`;
            await connection.execute(
              'INSERT INTO classes (id, name, course_name, teacher_id) VALUES (?, ?, ?, ?)',
              [classId, currentClass, currentClass, teacherId] // Using class name as course name for now
            );
          }
        }

        // 3. Enroll student if classId found
        if (classId) {
          const enrollId = `e${Date.now()}`;
          // Check if already enrolled (shouldn't happen on register but good practice)
          // Actually, ignore duplicates
          try {
            await connection.execute(
              'INSERT INTO class_enrollments (id, class_id, student_id) VALUES (?, ?, ?)',
              [enrollId, classId, id]
            );
          } catch (ignore) {
            // Ignore duplicate entry errors
          }
        }
      }

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
apiRouter.post('/login', async (req, res) => {
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

apiRouter.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const connection = await mysql.createConnection(dbConfig);
    try {
      const [users] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);

      if (users.length === 0) {
        return res.json({ success: true, message: 'If your email is registered, you will receive a reset link.' });
      }

      const user = users[0];
      const resetToken = jwt.sign({ id: user.id, type: 'reset' }, JWT_SECRET, { expiresIn: '15m' });

      const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
      const subject = 'Password Reset Request';
      const text = `Hi ${user.name},\n\nYou requested a password reset. Click here to reset: ${resetLink}\n\nLink expires in 15 minutes.`;
      const html = `<p>Hi ${user.name},</p><p>You requested a password reset.</p><p><a href="${resetLink}">Click here to reset password</a></p><p>Link expires in 15 minutes.</p>`;

      await sendEmail(email, subject, text, html);

      res.json({ success: true, message: 'If your email is registered, you will receive a reset link.' });
    } finally {
      await connection.end();
    }
  } catch (err) {
    console.error('Forgot Password Error:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/certificates', async (req, res) => {
  try {
    const { title, platform, issuedDate, studentId, imageBase64 } = req.body;
    const uploadRes = await cloudinary.uploader.upload(imageBase64, { folder: 'certhub_certificates' });
    const fileUrl = uploadRes.secure_url;
    const connection = await mysql.createConnection(dbConfig);
    let studentDetails = { name: 'Unknown', roll: '', class: '', section: '' };
    try {
      const [uRows] = await connection.execute('SELECT name, roll_number, current_class, section FROM users WHERE id = ?', [studentId]);
      if (uRows.length > 0) {
        studentDetails = { name: uRows[0].name, roll: uRows[0].roll_number, class: uRows[0].current_class, section: uRows[0].section };
      }
      const id = `c${Date.now()}`;
      const status = req.body.autoVerify ? 'VERIFIED' : 'PENDING';
      await connection.execute(
        'INSERT INTO certificates (id, student_id, title, platform, issued_date, file_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, studentId, title, platform, issuedDate, fileUrl, status]
      );
      res.json({ id, studentId, studentName: studentDetails.name, studentRoll: studentDetails.roll, studentClass: studentDetails.class, studentSection: studentDetails.section, title, platform, issuedDate, fileUrl });
    } finally {
      await connection.end();
    }
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/certificates', async (req, res) => {
  try {
    const { studentId, teacherId, title } = req.query;
    let query = `
      SELECT c.*, 
      COALESCE(NULLIF(u.name, ''), CONCAT('Student ', c.student_id)) as student_name, 
      COALESCE(NULLIF(u.roll_number, ''), 'N/A') as student_roll, 
      COALESCE(NULLIF(u.current_class, ''), 'N/A') as student_class, 
      COALESCE(NULLIF(u.section, ''), '') as student_section 
      FROM certificates c 
      LEFT JOIN users u ON c.student_id = u.id
    `;
    let params = [];
    let conditions = [];
    if (studentId) { conditions.push('c.student_id = ?'); params.push(studentId); }
    if (title) { conditions.push('c.title = ?'); params.push(title); }
    if (conditions.length > 0) { query += ' WHERE ' + conditions.join(' AND '); }
    query += ' ORDER BY c.issued_date DESC, c.created_at DESC';
    const connection = await mysql.createConnection(dbConfig);
    let rows;
    try { [rows] = await connection.execute(query, params); } finally { await connection.end(); }
    const certificates = rows.map(row => ({
      id: row.id, studentId: row.student_id, studentName: row.student_name, studentRoll: row.student_roll, studentClass: row.student_class, studentSection: row.student_section, title: row.title, platform: row.platform, issuedDate: row.issued_date, fileUrl: row.file_url, status: row.status, remarks: row.remarks || '', verifiedBy: row.verified_by || 'Not Verified', verifiedAt: row.verified_at
    }));
    res.json(certificates);
  } catch (err) {
    console.error('Get Certificates Error:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/certificates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.query;
    if (!userId) { return res.status(401).json({ error: 'User ID is required for deletion' }); }
    const connection = await mysql.createConnection(dbConfig);
    try {
      const [certs] = await connection.execute('SELECT * FROM certificates WHERE id = ?', [id]);
      if (certs.length === 0) return res.status(404).json({ error: 'Certificate not found' });
      const cert = certs[0];
      if (role !== 'ADMIN' && cert.student_id !== userId) {
        console.warn(`🛑 Unauthorized delete attempt for cert ${id} by user ${userId} (role: ${role})`);
        return res.status(403).json({ error: 'Unauthorized to delete this certificate' });
      }
      await connection.execute('DELETE FROM certificates WHERE id = ?', [id]);
      const [uRows] = await connection.execute('SELECT name FROM users WHERE id = ?', [userId]);
      const userName = (uRows.length > 0) ? uRows[0].name : 'Unknown User';
      await logAction(userId, userName, 'DELETE_CERT', `Deleted certificate ${id} (${cert.title})`);
      res.json({ success: true, message: 'Certificate deleted successfully' });
    } finally {
      await connection.end();
    }
  } catch (err) {
    console.error('Delete Certificate Error:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/certificates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, verifiedBy } = req.body;
    const connection = await mysql.createConnection(dbConfig);
    try {
      const [certs] = await connection.execute('SELECT c.*, u.email, u.name as studentName FROM certificates c JOIN users u ON c.student_id = u.id WHERE c.id = ?', [id]);
      if (certs.length === 0) return res.status(404).json({ error: 'Certificate not found' });
      const cert = certs[0];
      await connection.execute('UPDATE certificates SET status = ?, remarks = ?, verified_by = ?, verified_at = NOW() WHERE id = ?', [status, remarks || null, verifiedBy, id]);
      await logAction(verifiedBy, 'SYSTEM', status === 'VERIFIED' ? 'VERIFY' : 'REJECT', `Certificate ${id} marked as ${status}`);
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
apiRouter.get('/users', async (req, res) => {
  try {
    const { role } = req.query;
    let query = 'SELECT id, name, email, role, avatar, department, current_class as currentClass, section, roll_number as rollNumber, mobile_number as mobileNumber FROM users';
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

// Users: Delete (Admin Only)
apiRouter.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    try {
      const [users] = await connection.execute('SELECT * FROM users WHERE id = ?', [id]);
      if (users.length === 0) return res.status(404).json({ error: 'User not found' });

      const userToDelete = users[0];
      if (userToDelete.role === 'ADMIN') {
        return res.status(403).json({ error: 'Admins cannot be deleted via this endpoint' });
      }

      await connection.execute('DELETE FROM class_enrollments WHERE student_id = ?', [id]);
      await connection.execute('UPDATE classes SET teacher_id = "deleted" WHERE teacher_id = ?', [id]);
      await connection.execute('DELETE FROM certificates WHERE student_id = ?', [id]);
      await connection.execute('DELETE FROM users WHERE id = ?', [id]);

      await logAction('ADMIN', 'SYSTEM', 'DELETE_USER', `Deleted user ${userToDelete.name} (${id})`);

      res.json({ success: true, message: `User ${userToDelete.name} deleted successfully` });
    } finally {
      await connection.end();
    }
  } catch (err) {
    console.error('Delete User Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Platforms: Get All & Add
apiRouter.get('/platforms', async (req, res) => {
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

apiRouter.post('/platforms', async (req, res) => {
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

// --- CLASSES ---

apiRouter.get('/classes', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    try {
      const [rows] = await connection.execute(`
        SELECT c.*, u.name as teacherName,
        (SELECT COUNT(*) FROM class_enrollments WHERE class_id = c.id) as studentCount
        FROM classes c
        JOIN users u ON c.teacher_id = u.id
      `);
      res.json(rows);
    } finally {
      await connection.end();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/classes', async (req, res) => {
  try {
    const { name, courseName, teacherId } = req.body;
    const id = `cls${Date.now()}`;
    const connection = await mysql.createConnection(dbConfig);
    try {
      await connection.execute(
        'INSERT INTO classes (id, name, course_name, teacher_id) VALUES (?, ?, ?, ?)',
        [id, name, courseName, teacherId]
      );
      res.json({ id, name, courseName, teacherId });
    } finally {
      await connection.end();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/classes/:id/enroll', async (req, res) => {
  try {
    const { id: classId } = req.params;
    const { studentIds } = req.body;

    const connection = await mysql.createConnection(dbConfig);
    try {
      for (const studentId of studentIds) {
        const id = `enr${Date.now()}${Math.floor(Math.random() * 1000)}`;
        await connection.execute(
          'INSERT IGNORE INTO class_enrollments (id, class_id, student_id) VALUES (?, ?, ?)',
          [id, classId, studentId]
        );
      }
      res.json({ success: true, count: studentIds.length });
    } finally {
      await connection.end();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Shared Database connection cache for serverless
let dbInstance = null;
const ensureDB = async () => {
  if (!dbInstance) {
    await initDB();
    dbInstance = true;
  }
};

// Database Initialization Middleware (Shared between Vercel and traditional environments)
app.use(async (req, res, next) => {
  if (req.path === '/') return next(); // Skip DB for health check
  try {
    await ensureDB();
    next();
  } catch (err) {
    console.error('DB_INITIALIZATION_ERROR:', err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Use API Router
app.use('/api', apiRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('SERVER_ERROR:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message
  });
});

export default app;

const PORT = parseInt(process.env.PORT || '5000');

if (process.env.NODE_ENV !== 'production' || process.env.RENDER || !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => console.log(`🚀 CertHub Server running on http://localhost:${PORT}`));
}
