import { Resend } from 'resend';

// Создаем экземпляр Resend с проверкой
let resend;

try {
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is missing in environment variables');
    // Не бросаем ошибку здесь, чтобы приложение могло запуститься
  } else {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend initialized successfully');
  }
} catch (error) {
  console.error('❌ Resend initialization failed:', error);
}

/**
 * Отправка email через Resend
 */
async function sendEmail(to, subject, html, from = null) {
  try {
    // Проверка инициализации Resend
    if (!resend) {
      throw new Error('Resend is not configured. Check RESEND_API_KEY environment variable.');
    }

    const fromEmail = from || process.env.FROM_EMAIL || 'HouseDraw <onboarding@resend.dev>';
    
    console.log(`📧 Attempting to send email to: ${to}`);
    
    const data = await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html
    });
    
    console.log('✅ Email sent successfully');
    return data;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw error;
  }
}

/**
 * Проверка конфигурации email
 */
export function checkEmailConfig() {
  return {
    resendConfigured: !!resend,
    apiKeyExists: !!process.env.RESEND_API_KEY,
    fromEmail: process.env.FROM_EMAIL || 'HouseDraw <onboarding@resend.dev>'
  };
}

export default sendEmail;