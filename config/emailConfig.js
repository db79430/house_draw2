// import { createTransport } from 'nodemailer';
// import dotenv from 'dotenv';

// dotenv.config();

// // const transporter = createTransport({
// //     host: process.env.EMAIL_HOST || 'smtp.yandex.ru' || '77.88.21.158',
// //     port: process.env.EMAIL_PORT || 587 || 465, // Попробуйте порт 587 вместо 465
// //     secure: false, // Для порта 587 используйте false
// //     auth: {
// //       user: process.env.YANDEX_EMAIL,
// //       pass: process.env.YANDEX_APP_PASSWORD
// //     },
// //     tls: {
// //       rejectUnauthorized: false // Для обхода проблем с SSL
// //     },
// //     connectionTimeout: 30000, // 30 секунд
// //     greetingTimeout: 30000,
// //     socketTimeout: 30000
// //   });

// const { Resend } = require('resend');
// const resend = new Resend(process.env.RESEND_API_KEY);

// async function sendEmail(to, subject, html) {
//   try {
//     const data = await resend.emails.send({
//       from: 'your-domain.com <onboarding@resend.dev>',
//       to: [to],
//       subject: subject,
//       html: html
//     });
//     return data;
//   } catch (error) {
//     console.error('Email error:', error);
//     throw error;
//   }
// }

// // Проверка соединения при инициализации
// transporter.verify((error, success) => {
//   if (error) {
//     console.error('❌ SMTP connection failed:', error);
//   } else {
//     console.log('✅ SMTP server is ready to take our messages');
//   }
// });

// export default transporter;

import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Отправка email через Resend
 * @param {string} to - Email получателя
 * @param {string} subject - Тема письма
 * @param {string} html - HTML содержимое
 * @param {string} from - Отправитель (опционально)
 * @returns {Promise} Результат отправки
 */
async function sendEmail(to, subject, html, from = null) {
  try {
    const fromEmail = from || process.env.FROM_EMAIL || 'onboarding@resend.dev';
    
    const data = await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html
    });
    
    console.log('✅ Email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
}

/**
 * Проверка конфигурации Resend
 */
async function verifyEmailConfig() {
  try {
    // Простая проверка - попробуем отправить тестовое письмо
    console.log('🔧 Checking Resend configuration...');
    
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in environment variables');
    }
    
    console.log('✅ Resend API key is configured');
    return true;
  } catch (error) {
    console.error('❌ Resend configuration check failed:', error);
    return false;
  }
}

// Экспорт функций
export { sendEmail, verifyEmailConfig, resend };
export default sendEmail;