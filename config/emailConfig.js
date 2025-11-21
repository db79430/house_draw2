import { Resend } from 'resend';

let resend = null;
let emailEnabled = false;

// Безопасная инициализация
try {
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')) {
    resend = new Resend(process.env.RESEND_API_KEY);
    emailEnabled = true;
    console.log('✅ Resend initialized successfully');
    console.log('📧 Using API key:', process.env.RESEND_API_KEY.substring(0, 10) + '...');
  } else {
    console.log('⚠️ RESEND_API_KEY not configured. Emails will be simulated.');
    console.log('📧 Current RESEND_API_KEY:', process.env.RESEND_API_KEY || 'NOT SET');
  }
} catch (error) {
  console.error('❌ Resend init error:', error.message);
}

async function sendEmail(to, subject, html, from = null) {
  // Если email отключен - логируем и возвращаем успех для непрерывности работы
  if (!emailEnabled) {
    console.log(`📧 [SIMULATED] To: ${to}, Subject: ${subject}`);
    console.log('📧 Email content (first 200 chars):', html.substring(0, 200) + '...');
    return { 
      id: 'simulated_' + Date.now(),
      message: 'Email simulated - RESEND_API_KEY not configured'
    };
  }

  try {
    const fromEmail = from || process.env.FROM_EMAIL || 'HouseDraw <onboarding@resend.dev>';
    
    console.log(`📧 Sending real email to: ${to}`);
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
    // Не бросаем ошибку, чтобы не ломать основной поток
    return { error: error.message };
  }
}

export function isEmailServiceAvailable() {
  return emailEnabled;
}

export default sendEmail;