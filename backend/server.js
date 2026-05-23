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
});
