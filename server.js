import express, { json, urlencoded } from 'express';
import cors from 'cors';
import CONFIG from './config/index.js'
import runMigrations from './database/migrate.js';

// Controllers
import TinkoffController from './controllers/TinkoffController.js';
import EmailController from './controllers/EmailController.js';
import UserServices from './services/UserServices.js';
import PaymentRepository from './repositories/PaymentRepository.js';
import TildaController from './controllers/tildaFormControllers.js';
import  db  from './database/index.js';
import  processFormAndPayment  from './controllers/SimpleTildaController.js'

const app = express();

// Middleware
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

// Создаем экземпляры контроллеров (если они классы)
// const tinkoffController = new TinkoffController();
// const emailController = new EmailController();
// const tildaController = new TildaController();

// Tilda form routes
// app.post('/tilda-form-submit', (req, res) => TildaController.processFormAndPayment(req, res));
// app.post('/tilda-webhook', (req, res) => TildaController.handleTildaWebhook(req, res));
// app.post('/validate-form', (req, res) => TildaController.validateForm(req, res));
// app.post('/validate-field', (req, res) => TildaController.validateField(req, res));
// app.post('/check-payment', (req, res) => TildaController.checkPaymentStatus(req, res));


app.post('/tilda-form-submit', processFormAndPayment);

// Payment routes
app.post('/payment-notification', (req, res) => TinkoffController.handleNotification(req, res));

// Email routes
app.post('/test-email', (req, res) => EmailController.testEmail(req, res));
app.get('/test-smtp', (req, res) => EmailController.testSMTPConnection(req, res));

// Admin routes
app.get('/admin/stats', async (req, res) => {
  try {
    const userStats = await UserServices.getSystemStats();
    const paymentStats = await PaymentRepository.getDailyStatistics();
    
    res.json({
      Success: true,
      UserStats: userStats,
      PaymentStats: paymentStats,
      Timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      Success: false,
      Message: error.message
    });
  }
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await db.one('SELECT 1 as test');
    
    res.json({ 
      status: 'OK', 
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
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

// Start server
async function startServer() {
  try {
    await runMigrations();
    
    app.listen(CONFIG.APP.PORT, () => {
      console.log('🚀 Server started successfully');
      console.log(`📍 Port: ${CONFIG.APP.PORT}`);
      console.log(`🔑 TerminalKey: ${CONFIG.TINKOFF.TERMINAL_KEY}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();