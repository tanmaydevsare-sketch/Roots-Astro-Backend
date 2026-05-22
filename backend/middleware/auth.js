// Auth middleware using dev bypass for local testing

const prisma = require('../config/prisma');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });

  const token = authHeader.split(' ')[1];

  // Local Dev Bypass Logic
  if (token && token.startsWith('dev_token_')) {
    const role = token.replace('dev_token_', '');
    const user = await prisma.user.findFirst({
      where: { role: role === 'ADMIN' ? 'ADMIN' : role }
    });

    if (user) {
      req.user = { id: user.id, email: user.email, role: user.role };
      return next();
    }
  }

  // Fallback (for production/real JWT)
  try {
    const jwt = require('jsonwebtoken');
    const secret = "supersecretjwtkey_astro_4b9a1c";

    const decoded = jwt.verify(token, secret);
    const userId = Number(decoded.id);

    if (isNaN(userId)) {
      console.error(`[AUTH] Invalid user ID in token: ${decoded.id}`);
      return res.status(401).json({ error: 'Invalid token data' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.error(`[AUTH] No user found for ID: ${userId}`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Normalize role to Uppercase
    req.user = { id: user.id, email: user.email, role: user.role.toUpperCase() };
    next();
  } catch (err) {
    console.error(`[AUTH] Token verification failed: ${err.message}`);
    res.status(401).json({ error: 'Invalid token' });
  }
};

const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

module.exports = { authMiddleware, roleMiddleware };
