import express, { json, urlencoded } from 'express';
import CONFIG from './config/index.js'
import runMigrations from './database/migrate.js';
import path from 'path';

// Импортируем классы контроллеров
import TinkoffController from './controllers/TinkoffController.js';
import EmailController from './controllers/EmailController.js';
import TildaController from "./controllers/tildaFormControllers.js"

// Services and repositories
import UserServices from './services/UserServices.js';
import PaymentRepository from './repositories/PaymentRepository.js';
import db from './database/index.js';
import tildaAuthMiddleware from './middlewares/authMiddleware.js';
import diagnosticRoutes from './routes/network.js';
// import { checkEmailConfig }  from './config/emailConfig.js';
import AuthController from './controllers/AuthController.js';
import User from './models/Users.js';
import SlotController from './controllers/SlotController.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)

const app = express();
// app.use(cors());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Парсинг данных
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  console.log('📄 Serving index.html');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/paymentfee', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'paymentfee.html'));
});

app.get('/auth', (req, res) => {
  console.log('📄 Serving auth.html');
  res.sendFile(path.join(__dirname, 'public','auth.html'));
});

app.get('/dashboard', (req, res) => {
  console.log('📄 Serving dashboard.html');
  res.sendFile(path.join(__dirname, 'public','dashboard.html'));
});


// API роуты - ПОСЛЕ HTML
app.get('/api/health', async (req, res) => {
  try {
    await db.one('SELECT 1 as test');
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'Tilda Webhook Handler',
      message: 'Сервер работает корректно'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

const tildaController = new TildaController();
const tinkoffController = new TinkoffController(); 
const emailController = new EmailController();
const authController = new AuthController();

app.get('/tilda-webhook', (req, res) => {
  console.log('🔔 GET /tilda-webhook - Tilda test request');
  
  res.json({
    Success: true,
    Message: 'GET webhook test successful',
    Method: 'GET',
    Test: 'OK',
    Timestamp: new Date().toISOString()
  });
});

app.post('/tilda-webhook', tildaAuthMiddleware, (req, res) => { tildaController.handleTildaWebhook(req, res)});

// Tilda routes
app.post('/tilda-validate', tildaAuthMiddleware, (req, res) => tildaController.validateForm(req, res));
app.post('/check-payment', tildaAuthMiddleware, (req, res) => tildaController.checkPaymentStatus(req, res));

// Tinkoff Callback
app.post('/tinkoff-callback', (req, res) => tinkoffController.handleNotification(req, res));

// app.post('/find-order', tildaAuthMiddleware, (req, res) => tildaController.findOrder(req, res));

app.post('/create-payment', (req, res) => tildaController.createPayment(req, res));
app.get('/get-member/:memberNumber', (req, res) => tildaController.getMemberData(req, res));
app.get('/check-payment-status/:memberNumber', (req, res) => tildaController.checkPaymentStatus(req, res));

// Email routes
app.post('/test-email', tildaAuthMiddleware, (req, res) => emailController.testEmail(req, res));

// Fallback route 
app.post('/tilda-fallback', tildaAuthMiddleware);

// Auth routes 
app.post('/auth-login', (req, res) => authController.login(req, res));
app.post('/auth-validate', (req, res) => authController.validate(req, res));
app.get('/auth-profile', (req, res) => authController.getProfile(req, res));
// app.post('/auth-change-password', (req, res) => authController.changePassword(req, res));
app.post('/auth-logout', (req, res) => authController.logout(req, res));

app.get('/auth', (req, res) => {
  res.sendFile(path.join(__dirname, 'auth.html'));
});

// app.get('/dashboard', SlotController.getDashboard);
app.post('/purchase-slots', SlotController.purchaseSlots);
app.get('/purchase-history', SlotController.getPurchaseHistory);




// Start server
async function startServer() {
  try {
    await runMigrations();
    
    app.listen(CONFIG.APP.PORT, '0.0.0.0', () => {
      console.log('🚀 Server started successfully');
      console.log(`📍 Port: ${CONFIG.APP.PORT}`);
      console.log(`🔐 Tilda API Key: 770a56bbd1fdada08l`);
      console.log('✅ Контроллеры инициализированы');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

