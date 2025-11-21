// routes/diagnostic.js
import express from 'express';
import { createTransport } from 'nodemailer';
import dns from 'dns';
import net from 'net';

const router = express.Router();

/**
 * Проверка DNS и сетевых подключений
 */
router.get('/network/test', async (req, res) => {
  const dnsPromises = dns.promises;
  const tests = [];
  
  try {
    // Тест DNS для Яндекс
    try {
      const addresses = await dnsPromises.resolve4('smtp.yandex.ru');
      tests.push({ 
        test: 'DNS Resolution - smtp.yandex.ru', 
        success: true, 
        addresses 
      });
    } catch (error) {
      tests.push({ 
        test: 'DNS Resolution - smtp.yandex.ru', 
        success: false, 
        error: error.message 
      });
    }

    // Тест подключения к портам Яндекс
    const ports = [587, 465, 25];
    const hosts = ['smtp.yandex.ru', '77.88.21.66', '77.88.21.67'];
    
    for (const host of hosts) {
      for (const port of ports) {
        try {
          await new Promise((resolve, reject) => {
            const socket = new net.Socket();
            socket.setTimeout(5000);
            
            socket.connect(port, host, () => {
              socket.destroy();
              resolve();
            });
            
            socket.on('timeout', () => reject(new Error('Timeout')));
            socket.on('error', reject);
          });
          
          tests.push({ 
            test: `Port ${port} - ${host}`, 
            success: true 
          });
        } catch (error) {
          tests.push({ 
            test: `Port ${port} - ${host}`, 
            success: false, 
            error: error.message 
          });
        }
      }
    }

    res.json({ 
      success: true,
      tests,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Проверка IP адресов Яндекс
 */
router.get('/network/yandex-ips', async (req, res) => {
  const dnsPromises = dns.promises;
  
  try {
    const hosts = [
      'smtp.yandex.ru',
      'smtp.yandex.com',
      'mail.yandex.ru'
    ];
    
    const results = {};
    
    for (const host of hosts) {
      try {
        const addresses4 = await dnsPromises.resolve4(host);
        results[host] = {
          ipv4: addresses4
        };
      } catch (error) {
        results[host] = { error: error.message };
      }
    }
    
    res.json({ 
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Тест email конфигурации
 */
router.get('/email/test-config', async (req, res) => {
  try {
    const config = {
      YANDEX_EMAIL: process.env.YANDEX_EMAIL ? 'SET' : 'MISSING',
      YANDEX_APP_PASSWORD: process.env.YANDEX_APP_PASSWORD ? 'SET' : 'MISSING',
      EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.yandex.ru',
      EMAIL_PORT: process.env.EMAIL_PORT || '465'
    };

    // Тестируем разные конфигурации
    const testConfigs = [
      { host: 'smtp.yandex.ru', port: 587, secure: false, name: 'Yandex 587' },
      { host: 'smtp.yandex.ru', port: 465, secure: true, name: 'Yandex 465' },
      { host: '77.88.21.66', port: 587, secure: false, name: 'Yandex IP 587' },
      { host: 'smtp.gmail.com', port: 587, secure: false, name: 'Gmail 587' }
    ];

    const results = [];

    for (const config of testConfigs) {
      try {
        const startTime = Date.now();
        const transporter = createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: {
            user: process.env.YANDEX_EMAIL,
            pass: process.env.YANDEX_APP_PASSWORD
          },
          connectionTimeout: 10000
        });

        await transporter.verify();
        const endTime = Date.now();

        results.push({
          ...config,
          success: true,
          time: `${endTime - startTime}ms`
        });
      } catch (error) {
        results.push({
          ...config,
          success: false,
          error: error.message,
          code: error.code
        });
      }
    }

    res.json({
      config,
      tests: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Проверка статуса приложения
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    node_version: process.version
  });
});

export default router;