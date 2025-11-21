import { createTransport } from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = createTransport({
  host: process.env.EMAIL_HOST || 'smtp.yandex.ru',
  port: process.env.EMAIL_PORT || 465,
  secure: true,
  auth: {
    user: process.env.YANDEX_EMAIL,
    pass: process.env.YANDEX_APP_PASSWORD
  },
  debug: process.env.NODE_ENV === 'development',
  logger: process.env.NODE_ENV === 'development'
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