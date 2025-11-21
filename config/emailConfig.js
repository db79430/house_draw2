import { Resend } from 'resend';

let resend = null;
let emailEnabled = false;

console.log('🔧 Initializing Resend...');
console.log('📧 RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);

// Инициализация Resend
if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')) {
  try {
    resend = new Resend(process.env.RESEND_API_KEY);
    emailEnabled = true;
    console.log('✅ Resend initialized successfully');
  } catch (error) {
    console.error('❌ Resend initialization failed:', error);
  }
} else {
  console.log('❌ RESEND_API_KEY is invalid or missing');
  console.log('📧 Emails will be SIMULATED only');
}

// Функция для генерации валидного UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function sendEmail(to, subject, html, from = null) {
  if (!emailEnabled) {
    console.log(`📧 [SIMULATION] Would send to: ${to}`);
    console.log(`📧 [SIMULATION] Subject: ${subject}`);
    
    // Возвращаем валидный UUID формат для Resend
    return { 
      id: generateUUID(),
      from: from || process.env.FROM_EMAIL || 'HouseDraw <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html,
      created_at: new Date().toISOString(),
      _simulated: true // Помечаем как симуляцию
    };
  }

  // РЕАЛЬНАЯ ОТПРАВКА
  try {
    const fromEmail = from || process.env.FROM_EMAIL || 'HouseDraw <onboarding@resend.dev>';
    
    console.log(`📧 [REAL] Sending email to: ${to}`);
    console.log(`📧 [REAL] Subject: ${subject}`);
    
    const data = await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html
    });
    
    console.log('✅ Email sent successfully via Resend');
    console.log('📧 Email ID:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    
    // Возвращаем валидную структуру даже при ошибке
    return { 
      id: generateUUID(),
      error: error.message,
      _error: true
    };
  }
}

export function isEmailServiceAvailable() {
  return emailEnabled;
}

export function getEmailStatus() {
  return {
    enabled: emailEnabled,
    apiKeyConfigured: !!(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')),
    fromEmail: process.env.FROM_EMAIL || 'HouseDraw <onboarding@resend.dev>'
  };
}

export default sendEmail;