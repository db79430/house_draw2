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

    console.log('🔧 Email Configuration Check:');
    console.log('   YANDEX_EMAIL:', yandexEmail ? '✅ Set' : '❌ Not set');
    console.log('   YANDEX_APP_PASSWORD:', yandexPassword ? '✅ Set' : '❌ Not set');
    console.log('   Using default values:', !isConfigured ? '✅ Yes' : '❌ No');

    return {
      enabled: isConfigured, // Включаем если оба значения заданы
      configured: isConfigured,
      hasDefaultValues: !isConfigured
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

  static async sendEmailNotification(user, slots, purchaseData) {
    try {
      console.log(`🎯 Подготовка письма о покупке слотов для:`, {
        email: user.email,
        name: user.fullname || user.name,
        slotCount: slots.length
      });

      // Проверяем что есть email
      if (!user.email) {
        console.error('❌ У пользователя нет email');
        return { success: false, error: 'No email address' };
      }

      const subject = `✅ Успешная покупка ${slots.length} слота (ов) в Клубе НПК ВДВ`;

      // Генерируем HTML контент
      const htmlContent = await this.generatePurchaseNotificationTemplate(user, slots, purchaseData);

      // Проверяем статус email сервиса
      console.log(`📧 Email service config:`, {
        host: process.env.SMTP_HOST || 'localhost',
        port: process.env.SMTP_PORT || 1025,
        enabled: process.env.SMTP_ENABLED !== 'false'
      });

      // Отправляем email
      const result = await this.sendEmail(user.email, subject, htmlContent);

      if (result.success) {
        console.log('✅ Письмо о покупке отправлено успешно');
        if (result.messageId) {
          console.log(`   Message ID: ${result.messageId}`);
        }
        return { success: true, messageId: result.messageId };
      } else {
        console.error('❌ Не удалось отправить письмо о покупке');
        console.error('   Ошибка:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Ошибка в sendEmailNotification:', error);
      return { success: false, error: error.message };
    }
  }

  static async generatePurchaseNotificationTemplate(user, slots, purchaseData) {
    const appUrl = process.env.APP_URL || 'https://npkvdv.ru';
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@npkvdv.ru';
    const supportPhone = process.env.SUPPORT_PHONE || '+7 (999) 999-99-99';

    const slotNumbers = slots.map(s => s.slot_number || s.id).join(', ');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; border: 1px solid #ddd; margin-top: 20px; }
          .info-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Покупка слотов подтверждена! 🎉</h1>
          </div>
          
          <div class="content">
            <h2>Уважаемый(ая) ${user.fullname || user.name || 'Клиент'}!</h2>
            
            <p>Ваша покупка успешно завершена. Ниже приведены детали вашего заказа:</p>
            
            <div class="info-box">
              <h3>📋 Детали покупки</h3>
              <p><strong>Номер заказа:</strong> ${purchaseData.orderId}</p>
              <p><strong>Дата покупки:</strong> ${purchaseData.purchaseDate}</p>
              <p><strong>Количество слотов:</strong> ${slots.length}</p>
              <p><strong>Сумма:</strong> ${purchaseData.amount / 100} руб.</p>
              <p><strong>Номера слотов:</strong> ${slotNumbers}</p>
              ${user.membership_number ? `<p><strong>Ваш номер члена клуба:</strong> ${user.membership_number}</p>` : ''}
            </div>
            
            <p>Спасибо за вашу покупку! Ваши слоты уже активны в вашем личном кабинете.</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/dashboard" style="
                background: #4CAF50; 
                color: white; 
                padding: 15px 30px; 
                text-decoration: none; 
                border-radius: 5px; 
                display: inline-block;
                font-weight: bold;
              ">Перейти в личный кабинет</a>
            </p>
            
            <div class="footer">
              <p>Если у вас есть вопросы, обращайтесь:</p>
              <p>📧 ${supportEmail} | 📞 ${supportPhone}</p>
              <p>© ${new Date().getFullYear()} Клуб НПК ВДВ</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static htmlToText(html) {
    // Простая конвертация HTML в текст
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Генерация HTML шаблона для данных входа
   */
  // static async generateCredentialsTemplate(userData, password) {
  //   const appUrl = process.env.APP_URL || 'https://npkvdv.ru/auth';
  //   const supportEmail = process.env.SUPPORT_EMAIL || process.env.YANDEX_EMAIL;
  //   const supportPhone = process.env.SUPPORT_PHONE || '+7 (XXX) XXX-XX-XX';

  //   try {
  //     const templatePath = path.join(__dirname, '../email-templates/credentials.html');
  //     let htmlContent = await fs.readFile(templatePath, 'utf8');

  //     const statementContent = await this.getStatementContent();

  //     // Заменяем плейсхолдеры
  //     htmlContent = htmlContent
  //       .replace(/{{fullname}}/g, userData.name || userData.fullname || 'Уважаемый участник')
  //       .replace(/{{login}}/g, userData.login)
  //       .replace(/{{city}}/g, userData.city || 'Не указан')
  //       .replace(/{{phone}}/g, userData.phone || 'Не указан')
  //       .replace(/{{yeardate}}/g, userData.yeardate)
  //       .replace(/{{email}}/g, userData.email || 'Не указан')
  //       .replace(/{{password}}/g, password)
  //       .replace(/{{appUrl}}/g, appUrl)
  //       .replace(/{{supportEmail}}/g, supportEmail)
  //       .replace(/{{supportPhone}}/g, supportPhone)
  //       .replace(/{{membership_number}}/g, userData.memberNumber || userData.membership_number || '')
  //       .replace(/{{currentYear}}/g, new Date().getFullYear())
  //       // 🔥 ДОБАВЛЯЕМ: Заменяем плейсхолдер statement
  //       .replace('{{statement}}', statementContent);

  //     return htmlContent;

  //   } catch (error) {
  //     console.log('⚠️ Template file not found, using fallback template');
  //     return this.getFallbackCredentialsTemplate(userData, login, password, appUrl, supportEmail, supportPhone);
  //   }
  // }

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

  //   static async getFallbackCredentialsTemplate(userData, login, password, appUrl, supportEmail, supportPhone) {
  //     const statementContent = this.getDefaultStatement()
  //       .replace(/{{fullname}}/g, userData.name || userData.fullname || 'Уважаемый участник')
  //       .replace(/{{membership_number}}/g, userData.memberNumber || userData.membership_number || '')
  //       .replace(/{{yeardate}}/g, userData.yeardate || new Date().getFullYear())
  //       .replace(/{{email}}/g, userData.email || 'Не указан')
  //       .replace(/{{phone}}/g, userData.phone || 'Не указан')
  //       .replace(/{{city}}/g, userData.city || 'Не указан');

  //     return `
  // <!DOCTYPE html>
  // <html>
  // <head>
  //   <meta charset="utf-8">
  //   <style>
  //       body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
  //       .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
  //       .header { background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%); color: white; padding: 40px 30px; text-align: center; }
  //       .content { padding: 40px 30px; }
  //       .credentials { background: #e8f5e9; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 5px solid #4CAF50; }
  //       .footer { background: #2d5016; color: white; padding: 30px; text-align: center; }
  //       .button { background: #4CAF50; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: bold; }
  //       .user-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
  //       .statement { background: #f8f9fa; padding: 25px; border-radius: 10px; border: 2px solid #e9ecef; margin: 25px 0; }
  //       .statement-title { text-align: center; font-weight: bold; font-size: 18px; color: #2d5016; margin-bottom: 20px; text-transform: uppercase; }
  //   </style>
  // </head>
  // <body>
  //   <div class="container">
  //       <div class="header">
  //           <h1 style="margin: 0 0 15px 0;">Добро пожаловать в клуб! 🎉</h1>
  //           <p style="margin: 0; opacity: 0.9;">Ваш вступительный взнос успешно оплачен</p>
  //       </div>

  //       <div class="content">
  //           <h2 style="color: #2d5016;">Уважаемый(ая) ${userData.name || userData.fullname || 'участник'}!</h2>

  //           <p>Благодарим вас за регистрацию в нашем клубе и успешную оплату вступительного взноса.</p>

  //           <div class="user-info">
  //               <h3 style="color: #2d5016; margin-top: 0;">📋 Ваши данные:</h3>
  //               <p><strong>ФИО:</strong> ${userData.name || userData.fullname || 'Не указано'}</p>
  //               <p><strong>Телефон:</strong> ${userData.phone || 'Не указан'}</p>
  //               <p><strong>Город:</strong> ${userData.city}</p>
  //               ${userData.memberNumber ? `<p><strong>Номер члена клуба:</strong> ${userData.memberNumber}</p>` : ''}
  //           </div>

  //           <div class="credentials">
  //               <h3 style="color: #2d5016; margin-top: 0;">🔐 Данные для входа в личный кабинет</h3>
  //               <p><strong>Логин:</strong> ${login}</p>
  //               <p><strong>Пароль:</strong> ${password}</p>
  //               <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">
  //                   ⚠️ Сохраните эти данные в надежном месте
  //               </p>
  //           </div>
  //           ${statementContent}

  //           <p>Для входа в личный кабинет перейдите по ссылке:</p>
  //           <p style="text-align: center;">
  //               <a href="${appUrl}" class="button">Войти в личный кабинет</a>
  //           </p>

  //           <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
  //               <p style="margin: 0; color: #856404;">
  //                   <strong>💡 Рекомендация:</strong> После первого входа смените пароль в настройках профиля.
  //               </p>
  //           </div>
  //       </div>

  //       <div class="footer">
  //           <p style="margin: 0 0 10px 0; font-size: 16px;">С уважением, Команда Клуба НПК ВДВ</p>
  //           <p style="margin: 5px 0; opacity: 0.8;">Телефон: ${supportPhone} | Email: ${supportEmail}</p>
  //           <p style="margin: 15px 0 0 0; opacity: 0.6; font-size: 14px;">
  //               © ${new Date().getFullYear()} Клуб НПК ВДВ. Все права защищены.
  //           </p>
  //       </div>
  //   </div>
  // </body>
  // </html>
  //   `;
  //   }

  static async sendCredentialsEmail(fullUser, password) {
    try {
      console.log('📧 Отправка данных для входа:', {
        email: fullUser.email,
        name: fullUser.fullname,
        memberNumber: fullUser.membership_number,
        city: fullUser.city,
        yeardate: fullUser.yeardate,
        phone: fullUser.phone
      });

      // Готовим данные для шаблона
      const userData = {
        name: fullUser.fullname || fullUser.name || '',
        phone: fullUser.phone,
        city: fullUser.city,
        email: fullUser.email,
        yeardate: fullUser.yeardate
      };

      console.log('UserData', userData)

      const login = fullUser.email || fullUser.phone;

      // Генерируем HTML контент письма
      const htmlContent = await this.getFallbackCredentialsTemplate(
        userData,
        fullUser.membership_number,
        login,
        password
      );

      if (!htmlContent) {
        throw new Error('Не удалось сгенерировать шаблон письма');
      }

      // Отправляем email
      const result = await this.sendEmail(
        fullUser.email,
        'Данные для входа в личный кабинет клуба',
        htmlContent
      );

      if (result.success) {
        console.log('✅ Данные для входа отправлены на:', fullUser.email);
        return {
          success: true,
          message: 'Email с данными для входа отправлен',
          email: fullUser.email
        };
      } else {
        console.error('❌ Ошибка отправки email с данными для входа:', result.error);
        return {
          success: false,
          error: result.error || 'Ошибка отправки email'
        };
      }

    } catch (error) {
      console.error('❌ Ошибка в sendCredentialsEmail:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // static async generateCredentialsTemplate(userData, memberNumber, login, password) {
  //   const appUrl = process.env.APP_URL || 'https://npkvdv.ru';
  //   const supportEmail = process.env.SUPPORT_EMAIL || 'support@your-club.com';
  //   const supportPhone = process.env.SUPPORT_PHONE || '+7 (999) 999-99-99';

  //   try {
  //     // Пробуем прочитать шаблон из файла
  //     const templatePath = path.join(process.cwd(), 'email-templates', 'welcome-email-number.html');
  //     let htmlContent = await fs.readFile(templatePath, 'utf8');

  //     // Генерируем блок с заявлением
  //     const statementHtml = this.generateStatementHtml(userData, memberNumber);

  //     // Заменяем плейсхолдеры
  //     htmlContent = htmlContent
  //       .replace(/{{fullname}}/g, userData.name || 'Уважаемый участник')
  //       .replace(/{{membership_number}}/g, memberNumber || 'Не присвоен')
  //       .replace(/{{phone}}/g, userData.phone || 'Не указан')
  //       .replace(/{{city}}/g, userData.city || 'Не указан')
  //       .replace(/{{email}}/g, userData.email || 'Не указан')
  //       .replace(/{{yeardate}}/g, userData.yeardate || 'Не указан')
  //       .replace(/{{login}}/g, login || userData.email)
  //       .replace(/{{password}}/g, password || '')
  //       .replace(/{{statement}}/g, statementHtml) // Вставляем сгенерированное заявление
  //       .replace(/{{appUrl}}/g, appUrl)
  //       .replace(/{{supportEmail}}/g, supportEmail)
  //       .replace(/{{supportPhone}}/g, supportPhone)
  //       .replace(/{{currentYear}}/g, new Date().getFullYear());

  //     return htmlContent;

  //   } catch (error) {
  //     console.log('⚠️ Credentials template file not found, using fallback template');
  //     return this.getFallbackCredentialsTemplate(userData, memberNumber, login, password, appUrl, supportEmail, supportPhone);
  //   }
  // }

  static generateStatementHtml(userData, memberNumber) {
    const birthDate = new Date(userData.yeardate);
    const birthYear = birthDate.getFullYear();
    return `
      <div class="statement">
        <div class="statement-title">ЗАЯВЛЕНИЕ</div>
        <p>Прошу принять меня участником закрытого Клуба «В ДУХЕ ВРЕМЕНИ»*</p>
        <p>С Уставом и учредительными документами, размещёнными на сайте https://npk-vdv.ru/ ознакомлен и согласен.</p>
        <p>Мне известно, что паевые взносы являются возвратными в установленные Уставом сроки в сумме, оставшейся на л/с пайщика на момент подачи заявления на возврат.</p>
        <p>В случае моего неучастия** в жизни и развитии Клуба в течение 3 месяцев, прошу считать меня выбывшим из Кооператива по собственному желанию. Взнос в 10 рублей прошу вернуть путем пополнения мобильной связи телефона, указанного в заявлении. (**Участие – это внесение паевых взносов для удовлетворения своих потребностей).</p>
        <p>Считаю указанные в Заявлении свои персональные данные ОБЩЕДОСТУПНЫМИ (№152-ФЗ: общедоступными являются персональные данные, доступ неограниченного круга лиц к которым предоставлен самим субъектом персональных данных либо по его просьбе.)</p>
        
        <p><strong>О себе сообщаю:</strong></p>
        <p>1. Фамилия Имя Отчество: ${userData.name || 'Не указано'}</p>
        <p>2. Индивидуальный № пайщика (для идентификации взноса) ${memberNumber}</p>
        <p>3. Год рождения: ${birthYear}</p>
        <p>4. Электронная почта: ${userData.email}</p>
        <p>5. Телефон: ${userData.phone}</p>
        <p>6. Место жительства: ${userData.city}</p>
        
        <p>Информация, внесенная в Заявление, предназначена только для внутреннего использования. Кооператив гарантирует, что персональные данные не распространяются, а также не предоставляются третьим лицам без согласия субъекта персональных данных и используются кооперативом исключительно для заключения договоров с субъектом персональных данных (№152-ФЗ).</p>
        
        <p>Своей оплатой "Паевого взноса в размере 10 рублей (десять рублей) я подтверждаю достоверность переданных данных (самоидентификацию) и согласие с условиями участия в качестве члена Клуба НПК «В ДУХЕ ВРЕМЕНИ».</p>
        <p>*Клуб «В ДУХЕ ВРЕМЕНИ» ведёт свою деятельность в организационно правовой форме Потребительского кооператива, созданного по Закону 3085-1. Полное наименование: НЕКОММЕРЧЕСКОЕ ПОТРЕБИТЕЛЬСКОЕ ОБЩЕСТВО (КООПЕРАТИВ) "В ДУХЕ ВРЕМЕНИ". Участие в кооперативе подразумевает внесение добровольных паевых взносов для удовлетворения потребностей пайщиков.</p>
      </div>
    `;
  }

  static getYearFromDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.getFullYear().toString();
    } catch (error) {
      console.error('Ошибка при получении года из даты:', error);
      return '';
    }
  }

  static async getFallbackCredentialsTemplate(userData, memberNumber, login, password, appUrl, supportEmail, supportPhone) {
    const statementHtml = this.generateStatementHtml(userData, memberNumber);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: 'Arial', sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background: #f5f5f5;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(46, 125, 50, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%); 
            color: white; 
            padding: 50px 40px; 
            text-align: center; 
          }
          .content { 
            padding: 50px 40px; 
          }
          .credentials { 
            background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%); 
            padding: 30px; 
            border-radius: 12px; 
            margin: 30px 0; 
            border: 2px dashed #4CAF50;
            text-align: center;
          }
          .footer { 
            background: #2d5016; 
            color: white; 
            padding: 40px; 
            text-align: center; 
          }
          .button { 
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); 
            color: white; 
            padding: 18px 45px; 
            text-decoration: none; 
            border-radius: 10px; 
            display: inline-block; 
            margin: 25px 0; 
            font-weight: bold;
            font-size: 18px;
          }
          .user-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border-left: 4px solid #4CAF50;
          }
          .security-note {
            background: #fff3cd;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #ffc107;
          }
          .statement {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 10px;
            border: 2px solid #e9ecef;
            margin: 25px 0;
          }
          .statement-title {
            text-align: center;
            font-weight: bold;
            font-size: 18px;
            color: #2d5016;
            margin-bottom: 20px;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0 0 20px 0; font-size: 36px;">Добро пожаловать в клуб! 🎉</h1>
            <p style="margin: 0; opacity: 0.9; font-size: 18px;">Регистрация успешно завершена</p>
          </div>
          
          <div class="content">
            <h2 style="color: #2d5016; margin-bottom: 25px;">Уважаемый(ая) ${userData.name}!</h2>
            
            <p style="font-size: 16px; line-height: 1.7;">Благодарим вас за регистрацию в нашем клубе и успешную оплату вступительного взноса.</p>
            
            <div class="user-card">
              <h3 style="color: #2d5016; margin-top: 0;">📋 Ваш профиль</h3>
              <p><strong>ФИО:</strong> ${userData.name}</p>
              <p><strong>Телефон:</strong> ${userData.phone}</p>
              <p><strong>Город:</strong> ${userData.city}</p>
              <p><strong>Номер члена клуба:</strong> ${memberNumber}</p>
            </div>
            
            <div class="credentials">
              <h3 style="color: #2d5016; margin-top: 0; margin-bottom: 25px;">🔐 Данные для входа</h3>
              <div style="font-size: 20px; margin: 15px 0;">
                <strong>Логин:</strong> ${login}
              </div>
              <div style="font-size: 20px; margin: 15px 0;">
                <strong>Пароль:</strong> ${password}
              </div>
              <p style="color: #666; margin: 20px 0 0 0; font-size: 14px;">
                🛡️ Сохраните эти данные в надежном месте
              </p>
            </div>

            <!-- Вставляем сгенерированное заявление -->
            ${statementHtml}
            
            <p style="text-align: center; margin-top: 40px;">
              <a href="${appUrl}/auth" class="button">Войти в личный кабинет</a>
            </p>
          </div>
          
          <div class="footer">
            <p style="margin: 0 0 15px 0; font-size: 18px;">С уважением, Команда Клуба НПК ВДВ</p>
            <p style="margin: 8px 0; opacity: 0.8;">Телефон: ${supportPhone} | Email: ${supportEmail}</p>
            <p style="margin: 20px 0 0 0; opacity: 0.6; font-size: 14px;">
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