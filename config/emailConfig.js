import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Отправка email через Resend
 */
async function sendEmail(to, subject, html, from = null) {
  try {
    // Проверка наличия API ключа
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    
    const fromEmail = from || process.env.FROM_EMAIL || 'HouseDraw <onboarding@resend.dev>';
    
    const data = await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html
    });
    
    console.log('✅ Email sent successfully');
    return data;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
}

export default sendEmail;