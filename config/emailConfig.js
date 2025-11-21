import { createTransport } from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = createTransport({
    host: process.env.EMAIL_HOST || 'smtp.yandex.ru' || '77.88.21.158',
    port: process.env.EMAIL_PORT || 587, // Попробуйте порт 587 вместо 465
    secure: false, // Для порта 587 используйте false
    auth: {
      user: process.env.YANDEX_EMAIL,
      pass: process.env.YANDEX_APP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false // Для обхода проблем с SSL
    },
    connectionTimeout: 30000, // 30 секунд
    greetingTimeout: 30000,
    socketTimeout: 30000
  });

// Проверка соединения при инициализации
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP connection failed:', error);
  } else {
    console.log('✅ SMTP server is ready to take our messages');
  }
});

export default transporter;