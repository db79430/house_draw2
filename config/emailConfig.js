import { Resend } from 'resend';

let resend = null;
let emailEnabled = false;

// Проверяем и инициализируем Resend
console.log('🔧 Checking Resend configuration...');
console.log('📧 RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);

if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')) {
  try {
    resend = new Resend(process.env.RESEND_API_KEY);
    emailEnabled = true;
    console.log('✅ Resend initialized successfully');
  } catch (error) {
    console.error('❌ Resend initialization error:', error.message);
  }
} else {
  console.log('⚠️ RESEND_API_KEY not configured. Emails will be logged but not sent.');
}

/**
 * Универсальная функция отправки email
 * Всегда возвращает валидный объект без поля 'id' чтобы избежать ошибок валидации
 */
async function sendEmail(to, subject, html, from = null) {
  const fromEmail = from || process.env.FROM_EMAIL || 'HouseDraw <onboarding@resend.dev>';
  
  // Логируем информацию о письме
  console.log(`\n📧 EMAIL DETAILS:`);
  console.log(`   To: ${to}`);
  console.log(`   From: ${fromEmail}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Length: ${html.length} chars`);
  
  if (!emailEnabled) {
    console.log('   Status: 📝 SIMULATED (RESEND_API_KEY not configured)');
    console.log('   Action: Email would be sent if RESEND_API_KEY was configured');
    
    // Возвращаем простой объект без ID чтобы избежать ошибок валидации
    return {
      success: true,
      simulated: true,
      message: 'Email simulation mode - RESEND_API_KEY not configured',
      to: to,
      subject: subject,
      timestamp: new Date().toISOString()
    };
  }

  // Реальная отправка через Resend
  try {
    console.log('   Status: 🚀 SENDING via Resend...');
    
    const data = await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html
    });
    
    console.log('   Status: ✅ SENT successfully');
    console.log('   Resend ID:', data.id);
    
    // Возвращаем данные от Resend
    return {
      success: true,
      ...data,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('   Status: ❌ SEND FAILED');
    console.error('   Error:', error.message);
    
    // Возвращаем объект ошибки без проблемных полей
    return {
      success: false,
      error: error.message,
      simulated: false,
      timestamp: new Date().toISOString()
    };
  }
}

// Экспортируем функцию проверки статуса
export function getEmailStatus() {
  return {
    enabled: emailEnabled,
    apiKeyExists: !!process.env.RESEND_API_KEY,
    apiKeyValid: !!(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')),
    fromEmail: process.env.FROM_EMAIL || 'HouseDraw <onboarding@resend.dev>'
  };
}

export default sendEmail;