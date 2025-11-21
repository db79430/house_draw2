import { Resend } from 'resend';

let resend = null;
let emailEnabled = false;

console.log('🔧 Checking Resend configuration...');
console.log('📧 RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);

// Инициализируем Resend согласно документации
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
 * Отправка email через Resend (согласно официальной документации)
 */
async function sendEmail(to, subject, html, from = null) {
  const fromEmail = from || process.env.FROM_EMAIL || 'HouseDraw <onboarding@resend.dev>';
  
  console.log(`\n📧 EMAIL DETAILS:`);
  console.log(`   To: ${to}`);
  console.log(`   From: ${fromEmail}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Length: ${html.length} chars`);
  
  if (!emailEnabled || !resend) {
    console.log('   Status: 📝 SIMULATED (RESEND_API_KEY not configured)');
    console.log('   Action: Email would be sent if RESEND_API_KEY was configured');
    
    return {
      success: true,
      simulated: true,
      message: 'Email simulation mode - RESEND_API_KEY not configured'
    };
  }

  // РЕАЛЬНАЯ ОТПРАВКА согласно документации Resend
  try {
    console.log('   Status: 🚀 SENDING via Resend...');
    
    // Синтаксис из официальной документации Resend
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html
    });
    
    if (error) {
      console.error('   Status: ❌ SEND FAILED');
      console.error('   Resend Error:', error);
      return {
        success: false,
        error: error.message,
        simulated: false
      };
    }
    
    console.log('   Status: ✅ SENT successfully');
    console.log('   Resend ID:', data?.id);
    
    return {
      success: true,
      data: data,
      simulated: false
    };
  } catch (error) {
    console.error('   Status: ❌ SEND FAILED');
    console.error('   Error:', error.message);
    
    return {
      success: false,
      error: error.message,
      simulated: false
    };
  }
}

export function getEmailStatus() {
  return {
    enabled: emailEnabled,
    apiKeyExists: !!process.env.RESEND_API_KEY,
    apiKeyValid: !!(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')),
    fromEmail: process.env.FROM_EMAIL || 'HouseDraw <onboarding@resend.dev>'
  };
}

export default sendEmail;