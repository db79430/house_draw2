import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  /**
   * Инициализация транспортера
   */
  initTransporter() {
    const emailStatus = EmailService.getEmailStatus();
    
    if (emailStatus.enabled) {
      try {
        this.transporter = nodemailer.createTransport({
          host: 'smtp.yandex.ru',
          port: 465,
          secure: true,
          auth: {
            user: process.env.YANDEX_EMAIL,
            pass: process.env.YANDEX_APP_PASSWORD
          }
        });
        
        // Проверяем соединение
        this.transporter.verify((error, success) => {
          if (error) {
            console.error('❌ SMTP connection failed:', error);
            this.transporter = null;
          } else {
            console.log('✅ Email transporter initialized and verified');
          }
        });
        
      } catch (error) {
        console.error('❌ Error initializing email transporter:', error);
        this.transporter = null;
      }
    } else {
      console.log('📧 Email service disabled - simulation mode');
      
      if (!emailStatus.configured) {
        console.log('   ❌ Reason: YANDEX_EMAIL or YANDEX_APP_PASSWORD not set');
      } else if (emailStatus.hasDefaultValues) {
        console.log('   ❌ Reason: Using default values from .env example');
      }
    }
  }

  /**
   * Основная функция отправки email
   */
  static async sendEmail(to, subject, htmlContent, textContent = null) {
    try {
      const emailStatus = EmailService.getEmailStatus();
      
      if (!emailStatus.enabled) {
        console.log('📧 Email service disabled - simulation mode');
        return {
          success: true,
          simulated: true,
          message: 'Email would be sent in production'
        };
      }

      // Создаем временный транспортер для статического метода
      const transporter = nodemailer.createTransport({
        host: 'smtp.yandex.ru',
        port: 465,
        secure: true,
        auth: {
          user: process.env.YANDEX_EMAIL,
          pass: process.env.YANDEX_APP_PASSWORD
        }
      });

      const mailOptions = {
        from: `"Клуб НПК ВДВ" <${process.env.YANDEX_EMAIL}>`,
        to: to,
        subject: subject,
        html: htmlContent,
        text: textContent || EmailService.convertHtmlToText(htmlContent)
      };

      const result = await transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully:', {
        to: to,
        messageId: result.messageId,
        subject: subject
      });

      return {
        success: true,
        simulated: false,
        messageId: result.messageId,
        response: result.response
      };

    } catch (error) {
      console.error('❌ Error sending email:', error);
      return {
        success: false,
        simulated: false,
        error: error.message
      };
    }
  }
  
  /**
   * Получение статуса email сервиса
   */
  static getEmailStatus() {
    const yandexEmail = process.env.YANDEX_EMAIL;
    const yandexPassword = process.env.YANDEX_APP_PASSWORD;
    
    const isConfigured = yandexEmail && yandexPassword;
    const isDefaultValues = yandexEmail === 'd0mdarom@yandex.ru' || 
                           yandexPassword === 'juzdmjbesuiwkmon';
    
    console.log('🔧 Email Configuration Check:');
    console.log('   YANDEX_EMAIL:', yandexEmail ? '✅ Set' : '❌ Not set');
    console.log('   YANDEX_APP_PASSWORD:', yandexPassword ? '✅ Set' : '❌ Not set');
    console.log('   Using default values:', isDefaultValues ? '❌ Yes' : '✅ No');
    
    return {
      enabled: isConfigured && !isDefaultValues,
      configured: isConfigured,
      hasDefaultValues: isDefaultValues
    };
  }
  
  /**
   * Конвертация HTML в простой текст
   */
  static convertHtmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
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
  // static async sendCredentialsEmail(email, login, password, userData, phone, city) {
  //   try {
  //     console.log(`\n🎯 Preparing to send credentials to: ${email}`);
      
  //     const emailStatus = EmailService.getEmailStatus();
  //     console.log(`📧 Email service status: ${emailStatus.enabled ? 'ENABLED' : 'DISABLED'}`);

  //     const subject = 'Данные для входа в личный кабинет 🔐';
  //     const htmlContent = await this.generateCredentialsTemplate(userData, login, password);

  //     if (!emailStatus.enabled) {
  //       console.log('📧 SIMULATION MODE - Email would be sent:');
  //       console.log(`   To: ${email}`);
  //       console.log(`   Login: ${login}`);
  //       console.log(`   Password: ${password}`);
  //       return { 
  //         success: true, 
  //         simulated: true,
  //         message: 'Email simulation completed'
  //       };
  //     }

  //     // Используем статический метод для отправки
  //     const result = await EmailService.sendEmail(
  //       email, 
  //       subject, 
  //       htmlContent, 
  //       this.generatePlainTextCredentials(userData, login, password)
  //     );
      
  //     if (result.success && !result.simulated) {
  //       console.log('✅ Credentials email sent successfully');
  //       console.log(`   Message ID: ${result.messageId}`);
  //     }
      
  //     return result;

  //   } catch (error) {
  //     console.error('❌ Failed to send credentials email:', error);
  //     return { 
  //       success: false, 
  //       error: error.message,
  //       simulated: false
  //     };
  //   }
  // }

  /**
   * Отправка приветственного письма с номером члена клуба
   */
  static async sendWelcomeEmail(userData, memberNumber) {
    try {
      console.log(`🎯 Подготовка приветственного письма для: ${userData.email}`);
      
      const subject = 'Добро пожаловать в клуб! Ваш номер члена клуба 🎉';
      const htmlContent = await EmailService.generateWelcomeTemplate(userData, memberNumber);
      
      const emailStatus = EmailService.getEmailStatus();
      console.log(`📧 Email service status: ${emailStatus.enabled ? 'ENABLED' : 'DISABLED'}`);
      
      // Используем статический метод sendEmail
      const result = await EmailService.sendEmail(userData.email, subject, htmlContent);
      
      if (result.success) {
        if (result.simulated) {
          console.log('✅ Приветственное письмо было бы отправлено (simulation mode)');
          console.log(`   Номер члена клуба: ${memberNumber}`);
          console.log(`   Получатель: ${userData.email}`);
        } else {
          console.log('✅ Приветственное письмо отправлено успешно');
        }
        return { success: true, result };
      } else {
        console.error('❌ Не удалось отправить приветственное письмо');
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Ошибка в sendWelcomeEmail:', error);
      return { success: false, error: error.message };
    }
  }



  /**
   * Генерация HTML шаблона приветственного письма
   */
  static async generateWelcomeTemplate(userData, memberNumber) {
    const appUrl = process.env.APP_URL || 'https://npkvdv.ru';
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@your-club.com';
    const supportPhone = process.env.SUPPORT_PHONE || '+7 (999) 999-99-99';

    try {
      // Пробуем прочитать шаблон из файла
      const templatePath = path.join(process.cwd(), 'email-templates', 'welcome-email-number.html');
      let htmlContent = await fs.readFile(templatePath, 'utf8');

      // Заменяем плейсхолдеры
      htmlContent = htmlContent
        .replace(/{{fullname}}/g, userData.name || 'Уважаемый участник')
        .replace(/{{membership_number}}/g, memberNumber)
        .replace(/{{appUrl}}/g, appUrl)
        .replace(/{{supportEmail}}/g, supportEmail)
        .replace(/{{supportPhone}}/g, supportPhone)
        .replace(/{{currentYear}}/g, new Date().getFullYear());

      return htmlContent;
      
    } catch (error) {
      console.log('⚠️ Welcome template file not found, using fallback template');
      return EmailService.getFallbackWelcomeTemplate(userData, memberNumber, appUrl, supportEmail, supportPhone);
    }
  }

  /**
   * Fallback шаблон приветственного письма
   */
  static getFallbackWelcomeTemplate(userData, memberNumber, appUrl, supportEmail, supportPhone) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%); color: white; padding: 40px; text-align: center; }
        .content { padding: 40px; }
        .member-card { background: #e8f5e9; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 5px solid #4CAF50; text-align: center; }
        .footer { background: #2d5016; color: white; padding: 30px; text-align: center; }
        .button { background: #4CAF50; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0 0 15px 0;">Добро пожаловать в наш клуб! 🎉</h1>
            <p style="margin: 0; opacity: 0.9;">Регистрация успешно завершена</p>
        </div>
        
        <div class="content">
            <h2 style="color: #2d5016;">Уважаемый(ая) ${userData.name || 'участник'}!</h2>
            
            <p>Благодарим вас за регистрацию в нашем клубе. Ваша заявка успешно принята, и мы рады приветствовать вас в нашем сообществе.</p>
            
            <div class="member-card">
                <h3 style="color: #2d5016; margin-top: 0;">🎫 Ваш номер члена клуба</h3>
                <div style="font-size: 32px; font-weight: bold; color: #2E7D32; margin: 15px 0;">${memberNumber}</div>
                <p style="color: #666; margin: 0;">Сохраните этот номер для дальнейшего взаимодействия с клубом</p>
            </div>
            
            <p><strong>Что дальше?</strong></p>
            <ul>
                <li>Перейдите на страницу оплаты вступительного взноса для завершения регистрации</li>
                <li>После оплаты вы получите данные для входа в личный кабинет</li>
                <li>В личном кабинете вы сможете управлять своим профилем</li>
            </ul>
            
            <p style="text-align: center;">
                <a href="${appUrl}/paymentfee?memberNumber=${memberNumber}" class="button">💳 Перейти к оплате</a>
            </p>
        </div>
        
        <div class="footer">
            <p style="margin: 0 0 10px 0;">С уважением, Команда Клуба</p>
            <p style="margin: 5px 0; opacity: 0.8;">Телефон: ${supportPhone} | Email: ${supportEmail}</p>
            <p style="margin: 15px 0 0 0; opacity: 0.6;">© ${new Date().getFullYear()} Наш Клуб. Все права защищены.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  static async sendCredentialsEmail(email, 
    login, 
    password, 
    fullname, 
    yeardate, 
    city, 
    membership_number, 
    phone) {
    try {
      console.log(`🎯 Подготовка письма авторизации для: ${email}`);

      const userData = {
        email,
        login,
        fullname,
        yeardate, 
        city,
        membership_number,
        phone
      };
      
      
      const subject = 'Добро пожаловать в клуб! Ваш номер члена клуба 🎉';
      const htmlContent = await EmailService.generateCredentialsTemplate(userData, password);
      
      const emailStatus = EmailService.getEmailStatus();
      console.log(`📧 Email service status: ${emailStatus.enabled ? 'ENABLED' : 'DISABLED'}`);
      
      // Используем статический метод sendEmail
      const result = await EmailService.sendEmail(userData.email, subject, htmlContent);
      
      if (result.success) {
        if (result.simulated) {
          console.log('✅ Приветственное письмо было бы отправлено (simulation mode)');
          console.log(`   Номер члена клуба: ${userData.memberNumber}`);
          console.log(`   Получатель: ${userData.email}`);
        } else {
          console.log('✅ Приветственное письмо отправлено успешно');
        }
        return { success: true, result };
      } else {
        console.error('❌ Не удалось отправить приветственное письмо');
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Ошибка в sendWelcomeEmail:', error);
      return { success: false, error: error.message };
    }
  }


  /**
   * Генерация HTML шаблона для данных входа
   */
  static async generateCredentialsTemplate(userData, password) {
    const appUrl = process.env.APP_URL || 'https://npkvdv.ru/auth';
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.YANDEX_EMAIL;
    const supportPhone = process.env.SUPPORT_PHONE || '+7 (XXX) XXX-XX-XX';

    try {
      const templatePath = path.join(__dirname, '../email-templates/credentials.html');
      let htmlContent = await fs.readFile(templatePath, 'utf8');

      // 🔥 ДОБАВЛЯЕМ: Получаем содержимое блока statement
      const statementContent = await this.getStatementContent();

      // Заменяем плейсхолдеры
      htmlContent = htmlContent
        .replace(/{{fullname}}/g, userData.name || userData.fullname || 'Уважаемый участник')
        .replace(/{{login}}/g, login)
        .replace(/{{city}}/g, userData.city || 'Не указан')
        .replace(/{{phone}}/g, userData.phone || 'Не указан')
        .replace(/{{yeardate}}/g, userData.yeardate || new Date().getFullYear())
        .replace(/{{email}}/g, userData.email || 'Не указан')
        .replace(/{{password}}/g, password)
        .replace(/{{appUrl}}/g, appUrl)
        .replace(/{{supportEmail}}/g, supportEmail)
        .replace(/{{supportPhone}}/g, supportPhone)
        .replace(/{{membership_number}}/g, userData.memberNumber || userData.membership_number || '')
        .replace(/{{currentYear}}/g, new Date().getFullYear())
        // 🔥 ДОБАВЛЯЕМ: Заменяем плейсхолдер statement
        .replace('{{statement}}', statementContent);

      return htmlContent;
      
    } catch (error) {
      console.log('⚠️ Template file not found, using fallback template');
      return this.getFallbackCredentialsTemplate(userData, login, password, appUrl, supportEmail, supportPhone);
    }
}

/**
 * Генерация блока с заявлением
 */
static async getStatementContent() {
    try {
        // Пробуем прочитать из отдельного файла
        const statementPath = path.join(__dirname, '../email-templates/statement-section.html');
        return await fs.readFile(statementPath, 'utf8');
    } catch (error) {
        console.log('⚠️ Statement file not found, using default statement');
        // Возвращаем заявление по умолчанию
        return this.getDefaultStatement();
    }
}

/**
 * Заявление по умолчанию
 */
static getDefaultStatement() {
    return `
<div class="statement" style="background: #f8f9fa; padding: 25px; border-radius: 10px; border: 2px solid #e9ecef; margin: 25px 0;">
    <div class="statement-title" style="text-align: center; font-weight: bold; font-size: 18px; color: #2d5016; margin-bottom: 20px; text-transform: uppercase;">
        ЗАЯВЛЕНИЕ
    </div>
    
    <p style="margin: 12px 0; line-height: 1.5;">Прошу принять меня участником закрытого Клуба «В ДУХЕ ВРЕМЕНИ»*</p>
    
    <p style="margin: 12px 0; line-height: 1.5;">С Уставом и учредительными документами, размещёнными на сайте https://npk-vdv.ru/ ознакомлен и согласен.</p>
    
    <p style="margin: 12px 0; line-height: 1.5;">Мне известно, что паевые взносы являются возвратными в установленные Уставом сроки в сумме, оставшейся на л/с пайщика на момент подачи заявления на возврат.</p>
    
    <p style="margin: 12px 0; line-height: 1.5;">В случае моего неучастия** в жизни и развитии Клуба в течение 3 месяцев, прошу считать меня выбывшим из Кооператива по собственному желанию. Взнос в 10 рублей прошу вернуть путем пополнения мобильной связи телефона, указанного в заявлении. (**Участие – это внесение паевых взносов для удовлетворения своих потребностей).</p>
    
    <p style="margin: 12px 0; line-height: 1.5;">Считаю указанные в Заявлении свои персональные данные считать ОБЩЕДОСТУПНЫМИ (№152-ФЗ: общедоступными являются персональные данные, доступ неограниченного круга лиц к которым предоставлен самим субъектом персональных данных либо по его просьбе.)</p>
    
    <p style="margin: 15px 0 10px 0; font-weight: bold;">О себе сообщаю:</p>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p style="margin: 8px 0;"><strong>1. Фамилия Имя Отчество:</strong> {{fullname}}</p>
        <p style="margin: 8px 0;"><strong>2. Индивидуальный № пайщика (для идентификации взноса):</strong> {{membership_number}}</p>
        <p style="margin: 8px 0;"><strong>3. Год рождения:</strong> {{yeardate}}</p>
        <p style="margin: 8px 0;"><strong>4. Электронная почта:</strong> {{email}}</p>
        <p style="margin: 8px 0;"><strong>5. Телефон:</strong> {{phone}}</p>
        <p style="margin: 8px 0;"><strong>6. Место жительства:</strong> {{city}}</p>
    </div>
    
    <p style="margin: 12px 0; line-height: 1.5;">Информация, внесенная в Заявление, предназначена только для внутреннего использования. Кооператив гарантирует, что персональные данные не распространяются, а также не предоставляются третьим лицам без согласия субъекта персональных данных и используются кооперативом исключительно для заключения договоров с субъектом персональных данных (№152-ФЗ).</p>
    
    <p style="margin: 12px 0; line-height: 1.5; font-weight: bold;">Своей оплатой паевого взноса подтверждаю достоверность переданных данных (самоидентификацию) и согласие с условиями участия в качестве члена Клуба НПК «В ДУХЕ ВРЕМЕНИ».</p>
    
    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #dee2e6;">
        <p style="margin: 5px 0; font-size: 12px; color: #666;">* Клуб «В ДУХЕ ВРЕМЕНИ» - некоммерческий потребительский кооператив</p>
        <p style="margin: 5px 0; font-size: 12px; color: #666;">** Участие – это внесение паевых взносов для удовлетворения своих потребностей</p>
    </div>
</div>
    `;
}

static getFallbackCredentialsTemplate(userData, login, password, appUrl, supportEmail, supportPhone) {
  const statementContent = this.getDefaultStatement()
      .replace(/{{fullname}}/g, userData.name || userData.fullname || 'Уважаемый участник')
      .replace(/{{membership_number}}/g, userData.memberNumber || userData.membership_number || '')
      .replace(/{{yeardate}}/g, userData.yeardate || new Date().getFullYear())
      .replace(/{{email}}/g, userData.email || 'Не указан')
      .replace(/{{phone}}/g, userData.phone || 'Не указан')
      .replace(/{{city}}/g, userData.city || 'Не указан');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
      .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%); color: white; padding: 40px 30px; text-align: center; }
      .content { padding: 40px 30px; }
      .credentials { background: #e8f5e9; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 5px solid #4CAF50; }
      .footer { background: #2d5016; color: white; padding: 30px; text-align: center; }
      .button { background: #4CAF50; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: bold; }
      .user-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
      .statement { background: #f8f9fa; padding: 25px; border-radius: 10px; border: 2px solid #e9ecef; margin: 25px 0; }
      .statement-title { text-align: center; font-weight: bold; font-size: 18px; color: #2d5016; margin-bottom: 20px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="container">
      <div class="header">
          <h1 style="margin: 0 0 15px 0;">Добро пожаловать в клуб! 🎉</h1>
          <p style="margin: 0; opacity: 0.9;">Ваш вступительный взнос успешно оплачен</p>
      </div>
      
      <div class="content">
          <h2 style="color: #2d5016;">Уважаемый(ая) ${userData.name || userData.fullname || 'участник'}!</h2>
          
          <p>Благодарим вас за регистрацию в нашем клубе и успешную оплату вступительного взноса.</p>
          
          <div class="user-info">
              <h3 style="color: #2d5016; margin-top: 0;">📋 Ваши данные:</h3>
              <p><strong>ФИО:</strong> ${userData.name || userData.fullname || 'Не указано'}</p>
              <p><strong>Телефон:</strong> ${userData.phone || 'Не указан'}</p>
              <p><strong>Город:</strong> ${userData.city || 'Не указан'}</p>
              ${userData.memberNumber ? `<p><strong>Номер члена клуба:</strong> ${userData.memberNumber}</p>` : ''}
          </div>
          
          <div class="credentials">
              <h3 style="color: #2d5016; margin-top: 0;">🔐 Данные для входа в личный кабинет</h3>
              <p><strong>Логин:</strong> ${login}</p>
              <p><strong>Пароль:</strong> ${password}</p>
              <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">
                  ⚠️ Сохраните эти данные в надежном месте
              </p>
          </div>
          ${statementContent}
          
          <p>Для входа в личный кабинет перейдите по ссылке:</p>
          <p style="text-align: center;">
              <a href="${appUrl}" class="button">Войти в личный кабинет</a>
          </p>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                  <strong>💡 Рекомендация:</strong> После первого входа смените пароль в настройках профиля.
              </p>
          </div>
      </div>
      
      <div class="footer">
          <p style="margin: 0 0 10px 0; font-size: 16px;">С уважением, Команда Клуба НПК ВДВ</p>
          <p style="margin: 5px 0; opacity: 0.8;">Телефон: ${supportPhone} | Email: ${supportEmail}</p>
          <p style="margin: 15px 0 0 0; opacity: 0.6; font-size: 14px;">
              © ${new Date().getFullYear()} Клуб НПК ВДВ. Все права защищены.
          </p>
      </div>
  </div>
</body>
</html>
  `;
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

export default EmailService;