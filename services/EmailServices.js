import { createTransport } from 'nodemailer';
import CONFIG  from '../config/index.js';

class EmailServices {
  constructor() {
    this.transporter = createTransport({
      host: CONFIG.EMAIL.HOST,
      port: CONFIG.EMAIL.PORT,
      secure: true,
      auth: {
        user: CONFIG.EMAIL.YANDEX_EMAIL,
        pass: CONFIG.EMAIL.YANDEX_APP_PASSWORD
      }
    });
  }

  async sendCredentialsEmail(email, login, password, userName) {
    try {
      const mailOptions = {
        from: CONFIG.EMAIL.FROM,
        to: email,
        subject: 'Доступ к личному кабинету',
        html: this.getEmailTemplate(userName, login, password)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email отправлен на:', email);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Ошибка отправки email:', error);
      return { success: false, error: error.message };
    }
  }

  getEmailTemplate(userName, login, password) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Добро пожаловать!</h1>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
          <p>Уважаемый(ая) <strong>${userName}</strong>,</p>
          <p>Ваш вступительный взнос успешно оплачен. Ниже указаны данные для входа в личный кабинет:</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 25px 0;">
            <h3 style="color: #333; margin-top: 0;">Данные для входа:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;"><strong>Логин:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 16px;">${login}</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #666;"><strong>Пароль:</strong></td>
                <td style="padding: 10px; font-family: monospace; font-size: 16px;">${password}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://your-site.com/login" 
               style="display: inline-block; padding: 15px 30px; background: #667eea; color: white; 
                      text-decoration: none; border-radius: 5px; font-weight: bold;">
              Войти в личный кабинет
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Важно:</strong> Рекомендуем сменить пароль после первого входа в целях безопасности.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>Это автоматическое письмо, пожалуйста, не отвечайте на него.</p>
          <p>Если у вас возникли вопросы, обратитесь в поддержку.</p>
        </div>
      </div>
    `;
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ SMTP соединение установлено');
      return true;
    } catch (error) {
      console.error('❌ Ошибка SMTP соединения:', error);
      return false;
    }
  }
}

export default new EmailServices();