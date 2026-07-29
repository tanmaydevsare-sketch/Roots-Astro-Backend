const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Route imports
const authRoutes = require('./routes/auth.routes');
const astrologerRoutes = require('./routes/astrologer.routes');
const bookingRoutes = require('./routes/booking.routes');
const financeRoutes = require('./routes/finance.routes');
const settingsRoutes = require('./routes/settings.routes');
const adminServiceRoutes = require('./routes/admin_services.routes');
const uploadRoutes = require('./routes/upload.routes');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) 
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Allow mobile/curl/postman/scripts
    
    const isAllowed = allowedOrigins.length === 0 || 
                      allowedOrigins.includes(origin) || 
                      allowedOrigins.includes('*') ||
                      origin.endsWith('rootsastro.com') ||
                      origin.endsWith('web.app') ||
                      origin.endsWith('firebaseapp.com') ||
                      origin.startsWith('http://localhost') ||
                      origin.startsWith('http://127.0.0.1');
                          
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// API Lockdown Middleware (Restricts external third-party API access when enabled)
// Settings are cached in memory after first load to avoid a DB hit on every request.
let _cachedSettings = undefined;
let _settingsLastFetched = 0;
const SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let _lockdownErrLogged = false;

app.use(async (req, res, next) => {
  if (req.path === '/api/settings/public/global' || req.path === '/api/health' || req.path.startsWith('/api/docs')) {
    return next();
  }

  try {
    const now = Date.now();
    if (_cachedSettings === undefined || now - _settingsLastFetched > SETTINGS_CACHE_TTL) {
      const prisma = require('./config/prisma');
      _cachedSettings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
      _settingsLastFetched = now;
      _lockdownErrLogged = false; // reset on successful fetch
    }

    if (_cachedSettings && _cachedSettings.apiLockdown) {
      const origin = req.headers.origin || req.headers.referer;
      
      const isAllowedOrigin = !origin || 
                              origin.includes('rootsastro.com') ||
                              origin.includes('roots-astro.web.app') ||
                              origin.includes('firebaseapp.com') ||
                              origin.includes('localhost') ||
                              origin.includes('127.0.0.1');

      if (!isAllowedOrigin) {
        console.warn(`[API LOCKDOWN] Blocked request to ${req.path} from unauthorized origin: ${origin}`);
        return res.status(403).json({ error: 'API Lockdown Active: External third-party API access is restricted.' });
      }
    }
  } catch (err) {
    if (!_lockdownErrLogged) {
      console.warn('[API LOCKDOWN] Could not reach DB to check settings (requests will proceed normally):', err.message);
      _lockdownErrLogged = true;
    }
    _cachedSettings = null; // treat as lockdown disabled when DB unreachable
  }
  next();
});


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Swagger Configuration ---
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Roots Astro API',
      version: '1.0.0',
      description: 'API for Roots Astro platform - Astrology Consultation',
    },
    servers: [
      {
        url: process.env.API_BASE_URL || `http://localhost:${PORT}`,
        description: 'Roots Astro Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./routes/*.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/astrologers', astrologerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminServiceRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Roots Astro API running' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong.' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📄 Swagger documentation available at http://localhost:${PORT}/api/docs`);

  // ── Keep-Alive Ping (prevents Render free-tier from sleeping) ──────────────
  // Pings /api/health every 14 minutes so the service never idles out.
  // This keeps all roles (CLIENT, ASTROLOGER, WRITER, ADMIN) accessible on
  // rootsastro.com without the 30–90 second cold-start delay.
  if (process.env.NODE_ENV === 'production') {
    const PING_URL = process.env.API_BASE_URL
      ? `${process.env.API_BASE_URL}/api/health`
      : `http://localhost:${PORT}/api/health`;

    const FOURTEEN_MINUTES = 14 * 60 * 1000;

    setInterval(async () => {
      try {
        const http = require('http');
        const https = require('https');
        const client = PING_URL.startsWith('https') ? https : http;
        client.get(PING_URL, (res) => {
          console.log(`[Keep-Alive] Self-ping → ${PING_URL} — status: ${res.statusCode}`);
        }).on('error', (err) => {
          console.warn(`[Keep-Alive] Self-ping failed: ${err.message}`);
        });
      } catch (err) {
        console.warn('[Keep-Alive] Ping error:', err.message);
      }
    }, FOURTEEN_MINUTES);

    console.log(`⏰ Keep-alive ping scheduled every 14 minutes → ${PING_URL}`);
  }
});
