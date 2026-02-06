
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
import nodemailer from 'nodemailer';

dotenv.config();
const app = express();

// --- CONFIGURATION ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_HOST === 'localhost' ? undefined : { rejectUnauthorized: true }
};

// Use a Pool for better stability in serverless environments
const pool = mysql.createPool(dbConfig);

const transporter = (process.env.EMAIL_USER && process.env.EMAIL_PASS)
  ? nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  }) : null;

// --- MIDDLEWARE ---
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' }
});

app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);
app.use('/api/public', authLimiter);


// --- HELPERS (Hoisted) ---

async function sendEmail(to, subject, text, html) {
  if (!transporter) {
    console.log('Skipping email: No credentials configured');
    return;
  }
  try {
    await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text, html });
  } catch (err) {
    console.error('Email Error:', err);
  }
}

async function logAction(userId, userName, action, details) {
  try {
    const id = `log${Date.now()}`;
    await pool.execute(
      'INSERT INTO audit_logs (id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)',
      [id, userId, userName, action, details]
    );
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
}

// --- HANDLERS (Hoisted function declarations) ---

async function handleGetCertificates(req, res) {
  try {
    const { studentId } = req.query;
    console.log(`[CERT_FETCH] Request for studentId: ${studentId || 'ALL'}`);

    // SUPER JOIN: Matches by ID, Roll Number, or ID without 'u' prefix
    let query = `
      SELECT c.*, 
      u.name as u_name,
      u.roll_number as u_roll,
      u.current_class as u_class,
      u.section as u_section,
      u.email as u_email,
      u.mobile_number as u_mobile,
      u.department as u_department,
      u.avatar as u_avatar
      FROM certificates c 
      LEFT JOIN users u ON (
        TRIM(c.student_id) = TRIM(u.id)
        OR TRIM(c.student_id) = TRIM(u.roll_number)
        OR REPLACE(REPLACE(TRIM(LOWER(c.student_id)), 'u', ''), ' ', '') = 
           REPLACE(REPLACE(TRIM(LOWER(u.id)), 'u', ''), ' ', '')
      )
    `;

    let params = [];
    if (studentId) {
      query += ' WHERE c.student_id = ?';
      params.push(studentId);
    }
    query += ' ORDER BY c.issued_date DESC, c.created_at DESC';

    const [rows] = await pool.execute(query, params);

    const certificates = rows.map(row => ({
      ...row,
      studentName: row.u_name || `ID: ${row.student_id}`,
      studentRoll: row.u_roll || 'N/A',
      studentClass: row.u_class || 'N/A',
      studentSection: row.u_section || '',
      studentEmail: row.u_email || 'N/A',
      studentMobile: row.u_mobile || 'N/A',
      studentDepartment: row.u_department || 'N/A',
      studentAvatar: row.u_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.student_id}`,
      issuedDate: row.issued_date,
      fileUrl: row.file_url
    }));

    res.json(certificates);
  } catch (err) {
    console.error('Fetch certificates error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function handleCertDelete(req, res) {
  try {
    const { id } = req.params;
    const { userId, role } = req.query;
    console.log(`[CERT_DELETE] Request for ${id} by User: ${userId}, Role: ${role}`);

    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const [certs] = await pool.execute('SELECT * FROM certificates WHERE id = ?', [id]);
    if (certs.length === 0) return res.status(404).json({ error: 'Certificate not found' });

    const cert = certs[0];
    const reqRole = (role || '').toString().toUpperCase();

    // FUZZY PERMISSION CHECK
    const normalize = (val) => (val || '').toString().trim().toLowerCase().replace(/^u/, '');
    const isOwner = normalize(userId) === normalize(cert.student_id);

    if (reqRole !== 'ADMIN' && !isOwner) {
      console.warn(`🛑 Unauthorized delete attempt by ${userId} for cert ${id}`);
      return res.status(403).json({ error: 'Unauthorized to delete this certificate' });
    }

    await pool.execute('DELETE FROM certificates WHERE id = ?', [id]);

    const [uRows] = await pool.execute('SELECT name FROM users WHERE id = ?', [userId]);
    const userName = (uRows.length > 0) ? uRows[0].name : 'System';
    await logAction(userId, userName, 'DELETE_CERT', `Deleted cert: ${cert.title} (${id})`);

    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    console.error('Delete Error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function handleUpdateCertificate(req, res) {
  try {
    const { id } = req.params;
    const { status, remarks, verifiedBy } = req.body;
    const [certs] = await pool.execute('SELECT c.*, u.email, u.name FROM certificates c JOIN users u ON c.student_id = u.id WHERE c.id = ?', [id]);
    if (certs.length === 0) return res.status(404).json({ error: 'Not found' });

    const cert = certs[0];
    await pool.execute('UPDATE certificates SET status = ?, remarks = ?, verified_by = ?, verified_at = NOW() WHERE id = ?', [status, remarks || null, verifiedBy, id]);

    await logAction(verifiedBy, 'SYSTEM', status, `Cert ${id} marked ${status}`);
    await sendEmail(cert.email, `Certificate ${status}`, `Your certificate ${cert.title} was ${status}.`, `<p>Your certificate <b>${cert.title}</b> was ${status}.</p>`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function handleUploadCertificate(req, res) {
  try {
    const { title, platform, issuedDate, studentId, imageBase64, autoVerify } = req.body;
    const uploadRes = await cloudinary.uploader.upload(imageBase64, { folder: 'certhub' });
    const id = `c${Date.now()}`;
    const status = autoVerify ? 'VERIFIED' : 'PENDING';

    await pool.execute(
      'INSERT INTO certificates (id, student_id, title, platform, issued_date, file_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, studentId, title, platform, issuedDate, uploadRes.secure_url, status]
    );

    res.json({ success: true, id, fileUrl: uploadRes.secure_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function handleLogin(req, res) {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'User not found' });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function handleRegister(req, res) {
  try {
    const { name, email, password, role, department, currentClass, section, rollNumber, mobileNumber } = req.body;
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'User exists' });

    const id = `u${Date.now()}`;
    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;

    await pool.execute(
      'INSERT INTO users (id, name, email, password, role, department, current_class, section, roll_number, mobile_number, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, email, hashedPassword, role, department || null, currentClass || null, section || null, rollNumber || null, mobileNumber || null, avatar]
    );

    const token = jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id, name, email, role, avatar } });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function handleForgotPassword(req, res) {
  try {
    const { email } = req.body;
    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);

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
  } catch (err) {
    console.error('Forgot Password Error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function handleGetAuditLogs(req, res) {
  try {
    const [rows] = await pool.execute('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100');
    res.json(rows);
  } catch (err) {
    console.error('Get Logs Error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function handlePublicVerifyCertificate(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT certificates.*, users.name as student_name 
       FROM certificates 
       JOIN users ON certificates.student_id = users.id 
       WHERE certificates.id = ?`,
      [id]
    );

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
}

async function handleGetUsers(req, res) {
  try {
    const { role } = req.query;
    let query = 'SELECT id, name, email, role, avatar, department, current_class as currentClass, section, roll_number as rollNumber, mobile_number as mobileNumber FROM users';
    let params = [];

    if (role) {
      query += ' WHERE role = ?';
      params.push(role);
    }

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function handleDeleteUser(req, res) {
  try {
    const { id } = req.params;
    const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    const userToDelete = users[0];
    if (userToDelete.role === 'ADMIN') {
      return res.status(403).json({ error: 'Admins cannot be deleted via this endpoint' });
    }

    await pool.execute('DELETE FROM class_enrollments WHERE student_id = ?', [id]);
    await pool.execute('DELETE FROM certificates WHERE student_id = ?', [id]);
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);

    await logAction('ADMIN', 'SYSTEM', 'DELETE_USER', `Deleted user ${userToDelete.name} (${id})`);

    res.json({ success: true, message: `User ${userToDelete.name} deleted successfully` });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function handleGetPlatforms(req, res) {
  try {
    const [rows] = await pool.execute('SELECT * FROM platforms');
    res.json(rows);
  } catch (err) {
    console.error('Get Platforms Error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function handleAddPlatform(req, res) {
  try {
    const { name, color, icon } = req.body;
    const id = `p${Date.now()}`;
    await pool.execute(
      'INSERT INTO platforms (id, name, color, icon) VALUES (?, ?, ?, ?)',
      [id, name, color, icon]
    );
    res.json({ id, name, color, icon });
  } catch (err) {
    console.error('Add Platform Error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function handleGetClasses(req, res) {
  try {
    const [rows] = await pool.execute(`
      SELECT c.*, u.name as teacherName,
      (SELECT COUNT(*) FROM class_enrollments WHERE class_id = c.id) as studentCount
      FROM classes c
      JOIN users u ON c.teacher_id = u.id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function handleAddClass(req, res) {
  try {
    const { name, courseName, teacherId } = req.body;
    const id = `cls${Date.now()}`;
    await pool.execute(
      'INSERT INTO classes (id, name, course_name, teacher_id) VALUES (?, ?, ?, ?)',
      [id, name, courseName, teacherId]
    );
    res.json({ id, name, courseName, teacherId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function handleEnrollStudentsInClass(req, res) {
  try {
    const { id: classId } = req.params;
    const { studentIds } = req.body;

    for (const studentId of studentIds) {
      const id = `enr${Date.now()}${Math.floor(Math.random() * 1000)}`;
      await pool.execute(
        'INSERT IGNORE INTO class_enrollments (id, class_id, student_id) VALUES (?, ?, ?)',
        [id, classId, studentId]
      );
    }
    res.json({ success: true, count: studentIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// --- ROUTER SETUP ---
const apiRouter = express.Router();

// Auth Routes
apiRouter.post('/login', handleLogin);
apiRouter.post('/register', handleRegister);
apiRouter.post('/forgot-password', handleForgotPassword);

// Certificate Routes
apiRouter.get('/certificates', handleGetCertificates);
apiRouter.post('/certificates', handleUploadCertificate);
apiRouter.put('/certificates/:id', handleUpdateCertificate);
apiRouter.delete('/certificates/:id', handleCertDelete);
apiRouter.get('/public/certificates/:id', handlePublicVerifyCertificate);

// User Routes
apiRouter.get('/users', handleGetUsers);
apiRouter.delete('/users/:id', handleDeleteUser);

// Admin Routes
apiRouter.get('/admin/logs', handleGetAuditLogs);

// Platform Routes
apiRouter.get('/platforms', handleGetPlatforms);
apiRouter.post('/platforms', handleAddPlatform);

// Class Routes
apiRouter.get('/classes', handleGetClasses);
apiRouter.post('/classes', handleAddClass);
apiRouter.post('/classes/:id/enroll', handleEnrollStudentsInClass);

// Diagnostics
apiRouter.get('/health', (req, res) => res.json({ status: 'OK', time: new Date().toISOString() }));

// --- APP MOUNTING ---
app.get('/', (req, res) => res.send('CertHub API Live'));

// Mount API at both /api and root (fallback for Vercel)
app.use('/api', apiRouter);

// JSON 404 Catch-all for /api routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('GLOBAL_ERROR:', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message
  });
});

export default app;

// Local Development
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Development server on http://localhost:${PORT}`));
}
