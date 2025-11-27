import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  /**
   * Инициализация SMTP транспортера для Яндекс
   */
  initTransporter() {
    const emailConfig = {
      host: 'smtp.yandex.ru',
      port: 465,
      secure: true, // SSL
      auth: {
        user: process.env.YANDEX_EMAIL,
        pass: process.env.YANDEX_APP_PASSWORD // Пароль приложения
      }
    };

    // Проверяем конфигурацию
    const isConfigured = emailConfig.auth.user && emailConfig.auth.pass;
    
    if (isConfigured) {
      this.transporter = nodemailer.createTransport(emailConfig);
      console.log('✅ SMTP transporter initialized for Yandex');
    } else {
      console.log('⚠️ Email service disabled - YANDEX_EMAIL or YANDEX_APP_PASSWORD not set');
    }
  }

  /**
   * Проверка доступности email сервиса
   */
  isEnabled() {
    return this.transporter !== null;
  }

  /**
   * Отправка email с данными для входа
   */
  async sendCredentialsEmail(email, login, password, userData) {
    try {
      console.log(`\n🎯 Preparing to send credentials to: ${email}`);
      console.log(`📧 Email service status: ${this.isEnabled() ? 'ENABLED' : 'DISABLED'}`);

      const subject = 'Данные для входа в личный кабинет 🔐';
      const htmlContent = await this.generateCredentialsTemplate(userData, login, password);

      if (!this.isEnabled()) {
        // Режим симуляции
        console.log('📧 SIMULATION MODE - Email would be sent:');
        console.log(`   To: ${email}`);
        console.log(`   Login: ${login}`);
        console.log(`   Password: ${password}`);
        return { 
          success: true, 
          simulated: true,
          message: 'Email simulation completed'
        };
      }

      const mailOptions = {
        from: `"Клуб НПК ВДВ" <${process.env.YANDEX_EMAIL}>`,
        to: email,
        subject: subject,
        html: htmlContent,
        text: this.generatePlainTextCredentials(userData, login, password)
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Credentials email sent successfully');
      console.log(`   Message ID: ${result.messageId}`);
      
      return { 
        success: true, 
        messageId: result.messageId,
        simulated: false
      };

    } catch (error) {
      console.error('❌ Failed to send credentials email:', error);
      return { 
        success: false, 
        error: error.message,
        simulated: false
      };
    }
  }

  /**
   * Отправка приветственного письма
   */
  async sendWelcomeEmail(userData, login, password) {
    try {
      const subject = 'Добро пожаловать в наш клуб! 🎉';
      const htmlContent = await this.generateWelcomeTemplate(userData, login, password);

      if (!this.isEnabled()) {
        console.log('📧 SIMULATION MODE - Welcome email would be sent to:', userData.email);
        return { 
          success: true, 
          simulated: true 
        };
      }

      const mailOptions = {
        from: `"Клуб НПК ВДВ" <${process.env.YANDEX_EMAIL}>`,
        to: userData.email,
        subject: subject,
        html: htmlContent,
        text: this.generatePlainTextWelcome(userData, login, password)
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Welcome email sent successfully to:', userData.email);
      
      return { 
        success: true, 
        messageId: result.messageId,
        simulated: false
      };

    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Генерация HTML шаблона для данных входа
   */
  async generateCredentialsTemplate(userData, login, password) {
    const appUrl = process.env.APP_URL || 'https://npkvdv.ru/auth';
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.YANDEX_EMAIL;
    const supportPhone = process.env.SUPPORT_PHONE || '+7 (XXX) XXX-XX-XX';

    try {
      // Пробуем прочитать HTML шаблон из файла
      const templatePath = path.join(__dirname, '../email-templates/welcome-email.html', '../email-templates/statement-section.html');
      let htmlContent = await fs.readFile(templatePath, 'utf8');

      // Заменяем плейсхолдеры
      htmlContent = htmlContent
        .replace(/{{fullname}}/g, userData.name || userData.fullname || 'Уважаемый участник')
        .replace(/{{login}}/g, login)
        .replace(/{{password}}/g, password)
        .replace(/{{appUrl}}/g, appUrl)
        .replace(/{{supportEmail}}/g, supportEmail)
        .replace(/{{supportPhone}}/g, supportPhone)
        .replace(/{{membership_number}}/g, userData.memberNumber || userData.membership_number || '')
        .replace(/{{currentYear}}/g, new Date().getFullYear());

      return htmlContent;
      
    } catch (error) {
      console.log('⚠️ Template file not found, using fallback template');
      return this.getFallbackCredentialsTemplate(userData, login, password, appUrl, supportEmail, supportPhone);
    }
  }

  /**
   * Генерация HTML шаблона приветственного письма
   */
  async generateWelcomeTemplate(userData, login, password) {
    // Можно использовать тот же шаблон или создать отдельный
    return this.generateCredentialsTemplate(userData, login, password);
  }

  /**
   * Fallback шаблон для данных входа
   */
  getFallbackCredentialsTemplate(userData, login, password, appUrl, supportEmail, supportPhone) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; }
        .credentials { background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50; }
        .footer { background: #2d5016; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
        .button { background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Добро пожаловать в клуб! 🎉</h1>
            <p>Ваша регистрация успешно завершена</p>
        </div>
        
        <div class="content">
            <h2>Уважаемый(ая) ${userData.name || 'участник'}!</h2>
            
            <p>Благодарим вас за регистрацию в нашем клубе. Ваш вступительный взнос успешно оплачен.</p>
            
            <div class="credentials">
                <h3>🔐 Данные для входа в личный кабинет:</h3>
                <p><strong>Логин:</strong> ${login}</p>
                <p><strong>Пароль:</strong> ${password}</p>
                ${userData.memberNumber ? `<p><strong>Номер члена клуба:</strong> ${userData.memberNumber}</p>` : ''}
            </div>
            
            <p>Для входа в личный кабинет перейдите по ссылке:</p>
            <p>
                <a href="${appUrl}" class="button">Войти в личный кабинет</a>
            </p>
            
            <p><strong>Рекомендуем:</strong> После первого входа смените пароль в настройках профиля.</p>
        </div>
        
        <div class="footer">
            <p>С уважением, Команда Клуба НПК ВДВ</p>
            <p>Телефон: ${supportPhone} | Email: ${supportEmail}</p>
            <p>© ${new Date().getFullYear()} Клуб НПК ВДВ</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Текстовая версия письма для почтовых клиентов
   */
  generatePlainTextCredentials(userData, login, password) {
    const appUrl = process.env.APP_URL || 'https://npkvdv.ru/auth';
    
    return `
Добро пожаловать в клуб!

Уважаемый(ая) ${userData.name || 'участник'}!

Благодарим вас за регистрацию в нашем клубе. Ваш вступительный взнос успешно оплачен.

Данные для входа в личный кабинет:
Логин: ${login}
Пароль: ${password}
${userData.memberNumber ? `Номер члена клуба: ${userData.memberNumber}` : ''}

Для входа перейдите по ссылке: ${appUrl}

Рекомендуем после первого входа сменить пароль в настройках профиля.

С уважением,
Команда Клуба НПК ВДВ
    `;
  }

  generatePlainTextWelcome(userData, login, password) {
    return this.generatePlainTextCredentials(userData, login, password);
  }

  /**
   * Проверка соединения с SMTP сервером
   */
  async verifyConnection() {
    if (!this.transporter) {
      return { success: false, error: 'Transporter not initialized' };
    }

    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Создаем и экспортируем экземпляр сервиса
const emailService = new EmailService();
export default emailService;