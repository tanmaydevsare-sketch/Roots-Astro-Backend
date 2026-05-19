const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const firebaseAdmin = require('../config/firebase');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required: [email, password, firstName, lastName]
 *       properties:
 *         email: { type: string, example: "user@example.com" }
 *         password: { type: string, format: "password" }
 *         firstName: { type: string, example: "John" }
 *         lastName: { type: string, example: "Doe" }
 *         role: { type: string, enum: [CLIENT, ASTROLOGER, WRITER, ADMIN], default: CLIENT }
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/User' }
 *     responses:
 *       201: { description: User created successfully }
 *       400: { description: Email already exists }
 */
router.post('/register', async (req, res) => {
  const { email, password, firstName, lastName, role } = req.body;
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName, role: role || 'CLIENT' }
    });

    // Create Role-specific Profile
    if (role === 'ASTROLOGER') {
        await prisma.astrologerProfile.create({ data: { userId: user.id } });
    } else {
        await prisma.clientProfile.create({ data: { userId: user.id } });
    }

    // Create Wallet for every user
    await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });

    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/otp/send:
 *   get:
 *     tags: [Auth]
 *     summary: Request OTP for mobile login (Client)
 */
router.post('/otp/send', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });
  // Mock: In production, send real SMS via Twilio/Msg91
  console.log(`[AUTH] Sending OTP 1234 to ${phone}`);
  res.json({ message: 'OTP sent successfully', phone });
});

/**
 * @swagger
 * /api/auth/otp/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP and sign in
 */
router.post('/otp/verify', async (req, res) => {
  const { phone, otp, role } = req.body;
  if (otp !== '1234') return res.status(401).json({ error: 'Invalid OTP' });

  try {
    let user = await prisma.user.findUnique({ where: { phone } });
    
    if (!user) {
      const assignedRole = role || 'CLIENT';
      // Auto-register new users via OTP
      user = await prisma.user.create({
        data: {
          phone,
          email: `${phone}@rootsastro.com`, // Temporary email
          password: await bcrypt.hash(Math.random().toString(), 10),
          firstName: 'New',
          lastName: 'User',
          role: assignedRole,
          status: assignedRole === 'ASTROLOGER' ? 'PENDING' : 'active'
        }
      });
      
      if (assignedRole === 'ASTROLOGER') {
          await prisma.astrologerProfile.create({ data: { userId: user.id } });
      } else {
          await prisma.clientProfile.create({ data: { userId: user.id } });
      }

      // Create Wallet for every new user
      await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET || "supersecretjwtkey_astro_4b9a1c",
      { expiresIn: '30d' } // Longer sessions for mobile
    );

    res.json({ token, user: { id: user.id, phone: user.phone, role: user.role, status: user.status, firstName: user.firstName, lastName: user.lastName } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/firebase-login:
 *   post:
 *     tags: [Auth]
 *     summary: Verify Firebase ID token and sign in/register user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken: { type: string }
 *               role: { type: string, description: "Role to assign if registering" }
 */
router.post('/firebase-login', async (req, res) => {
  const { idToken, role } = req.body;
  if (!idToken) return res.status(400).json({ error: 'Firebase ID token is required' });

  try {
    // 1. Verify the Firebase token
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    const phone = decodedToken.phone_number;

    if (!phone) {
      return res.status(400).json({ error: 'No phone number found in Firebase token' });
    }

    // 2. Find or create user
    let user = await prisma.user.findUnique({ where: { phone } });
    
    if (!user) {
      const assignedRole = role || 'CLIENT';
      // Auto-register new users
      user = await prisma.user.create({
        data: {
          phone,
          email: `${phone.replace('+', '')}@rootsastro.com`, // Temporary email
          password: await bcrypt.hash(Math.random().toString(), 10),
          firstName: 'New',
          lastName: 'User',
          role: assignedRole,
          status: assignedRole === 'ASTROLOGER' ? 'PENDING' : 'active'
        }
      });
      
      if (assignedRole === 'ASTROLOGER') {
          await prisma.astrologerProfile.create({ data: { userId: user.id } });
      } else {
          await prisma.clientProfile.create({ data: { userId: user.id } });
      }

      // Create Wallet for every new user
      await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });
    }

    // 3. Issue our own JWT
    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET || "supersecretjwtkey_astro_4b9a1c",
      { expiresIn: '30d' }
    );

    res.json({ token, user: { id: user.id, phone: user.phone, role: user.role, status: user.status, firstName: user.firstName, lastName: user.lastName } });
  } catch (error) {
    console.error('[AUTH] Firebase verification error:', error);
    res.status(401).json({ error: 'Invalid or expired Firebase token' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "admin@test.com" }
 *               password: { type: string, example: "password123" }
 *     responses:
 *       200: { description: OK }
 *       401: { description: Invalid credentials }
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "supersecretjwtkey_astro_4b9a1c",
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, role: user.role, status: user.status, firstName: user.firstName, lastName: user.lastName } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   patch:
 *     tags: [Auth]
 *     summary: Update current user details
 *     security:
 *       - bearerAuth: []
 */
router.patch('/me', authMiddleware, async (req, res) => {
  const { firstName, lastName, city, country, phone, dob, gender } = req.body;
  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { firstName, lastName, city, country, phone, dob, gender }
    });
    delete updated.password;
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current logged-in user details
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { 
        astrologerProfile: true,
        clientProfile: true,
        wallet: true
      }
    });
    delete user.password;
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users (Admin only)
 *     security:
 *       - bearerAuth: []
 */
router.get('/admin/users', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
        where: { NOT: { role: 'ADMIN' } }, // Optional: Hide admins from management
        orderBy: { createdAt: 'desc' }
    });
    const sanitized = users.map(u => { delete u.password; return u; });
    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/admin/users/{id}/status:
 *   patch:
 *     tags: [Admin]
 *     summary: Toggle user status (active/suspended)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/admin/users/:id/status', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  const { status } = req.body;
  try {
    await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { status: status } 
    });
    res.json({ message: 'User status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/admin/users/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a user
 *     security:
 *       - bearerAuth: []
 */
router.delete('/admin/users/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change user password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword]
 *             properties:
 *               oldPassword: { type: string, format: "password" }
 *               newPassword: { type: string, format: "password" }
 */
router.post('/change-password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect old password' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
