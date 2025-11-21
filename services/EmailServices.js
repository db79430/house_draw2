import dotenv from 'dotenv';
import transporter from '../config/emailConfig.js';

dotenv.config();

class EmailService {
  /**
   * Отправляет приветственное письмо после успешной регистрации
   */
  static async sendWelcomeEmail(user, login, password) {
    try {
      const mailOptions = {
        from: process.env.YANDEX_EMAIL,
        to: user.email,
        subject: 'Добро пожаловать в клуб! 🎉',
        html: this.generateWelcomeTemplate(user, login, password)
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent to:', user.email);
      return { success: true, result };
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Отправляет письмо с данными для входа после оплаты
   */
  static async sendCredentialsEmail(email, login, password, fullname) {
    try {
      const user = { email, fullname };
      const mailOptions = {
        from: process.env.YANDEX_EMAIL,
        to: email,
        subject: 'Данные для входа в личный кабинет 🔐',
        html: this.generateCredentialsTemplate(user, login, password)
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Login credentials sent to:', email);
      return { success: true, result };
    } catch (error) {
      console.error('❌ Error sending credentials email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Шаблон приветственного письма
   */
  static generateWelcomeTemplate(user, login, password) {
    const appUrl = process.env.APP_URL || 'https://your-club.com';
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@your-club.com';
    const supportPhone = process.env.SUPPORT_PHONE || '+7 (999) 999-99-99';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 40px 30px; background: #f9f9f9; }
        .credentials { background: white; border: 2px dashed #667eea; padding: 25px; margin: 25px 0; border-radius: 8px; }
        .footer { text-align: center; padding: 25px; color: #666; font-size: 13px; background: white; }
        .button { display: inline-block; background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 15px 0; }
        ul { padding-left: 20px; }
        li { margin-bottom: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 32px;">Добро пожаловать в клуб! 🎉</h1>
        </div>
        <div class="content">
            <h2 style="color: #333;">Уважаемый(ая) ${user.fullname},</h2>
            
            <p>Мы рады приветствовать вас в нашем клубе! Ваша регистрация успешно завершена.</p>
            
            <p>Теперь у вас есть доступ к эксклюзивным возможностям:</p>
            <ul>
                <li>Участие в розыгрышах призов</li>
                <li>Личный кабинет с историей участий</li>
                <li>Специальные предложения для членов клуба</li>
                <li>Поддержка 24/7</li>
            </ul>

            <div class="credentials">
                <h3 style="color: #333; margin-top: 0;">🔐 Ваши данные для входа:</h3>
                <p><strong>Логин:</strong> ${login}</p>
                <p><strong>Пароль:</strong> ${password}</p>
                <p><strong>Ссылка для входа:</strong> <a href="${appUrl}/login">${appUrl}/login</a></p>
            </div>

            <p style="color: #666;">Рекомендуем сохранить эти данные в надежном месте.</p>

            <div style="text-align: center;">
                <a href="${appUrl}/login" class="button">Войти в личный кабинет</a>
            </div>
        </div>
        
        <div class="footer">
            <p>Если у вас возникли вопросы, свяжитесь с нами:</p>
            <p>Email: ${supportEmail} | Телефон: ${supportPhone}</p>
            <p>© 2024 Ваш Клуб. Все права защищены.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Шаблон письма с данными для входа
   */
  static generateCredentialsTemplate(user, login, password) {
    const appUrl = process.env.APP_URL || 'https://your-club.com';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
        .header { background: #28a745; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background: #f8f9fa; }
        .credentials-box { background: white; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .button { display: inline-block; background: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">Ваш доступ к личному кабинету 🔐</h1>
        </div>
        <div class="content">
            <p>Уважаемый(ая) ${user.fullname},</p>
            
            <p>Ваш взнос в клуб успешно оплачен! Вот данные для входа в личный кабинет:</p>
            
            <div class="credentials-box">
                <h3 style="margin-top: 0; color: #333;">Данные для входа:</h3>
                <p><strong>Логин:</strong> ${login}</p>
                <p><strong>Пароль:</strong> ${password}</p>
                <p><strong>Ссылка для входа:</strong> <a href="${appUrl}/login">${appUrl}/login</a></p>
            </div>

            <div class="warning">
                <p><strong>⚠️ Важно:</strong> Сохраните эти данные. Для безопасности рекомендуется сменить пароль после первого входа.</p>
            </div>

            <div style="text-align: center;">
                <a href="${appUrl}/login" class="button">Войти в личный кабинет</a>
            </div>

            <p>Если у вас возникли проблемы со входом, свяжитесь с нашей поддержкой.</p>
            
            <p>С уважением,<br>Команда клуба</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Отправка тестового письма
   */
  static async sendTestEmail(toEmail) {
    try {
      const mailOptions = {
        from: process.env.YANDEX_EMAIL,
        to: toEmail,
        subject: 'Тестовое письмо от клуба ✅',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
            <div style="background: white; padding: 30px; border-radius: 10px; text-align: center;">
              <h1 style="color: #28a745;">Тестовое письмо</h1>
              <p>Почтовая система работает корректно!</p>
              <p>Время отправки: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        `
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Test email sent successfully to:', toEmail);
      return { success: true, result };
    } catch (error) {
      console.error('❌ Error sending test email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Отправка письма о покупке слотов
   */
  static async sendSlotPurchaseEmail(email, slotNumbers, totalSlots) {
    try {
      const slotsList = slotNumbers.map(num => `<li style="margin: 8px 0;">Слот #${num}</li>`).join('');
      
      const mailOptions = {
        from: process.env.YANDEX_EMAIL,
        to: email,
        subject: `Поздравляем с покупкой ${totalSlots > 1 ? 'слотов' : 'слота'}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
            <div style="background: white; padding: 30px; border-radius: 10px;">
              <h1 style="color: #28a745; text-align: center;">${totalSlots > 1 ? 'Слоты успешно приобретены!' : 'Слот успешно приобретен!'}</h1>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #333;">Ваши номера слотов:</h3>
                <ul>${slotsList}</ul>
                <p><strong>Всего приобретено слотов:</strong> ${totalSlots}</p>
              </div>
              
              <p>Эти номера отображаются в вашем личном кабинете.</p>
              
              <div style="text-align: center; margin-top: 25px;">
                <a href="${process.env.APP_URL || 'https://your-club.com'}/login" 
                   style="display: inline-block; background: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">
                  Перейти в личный кабинет
                </a>
              </div>
            </div>
          </div>
        `
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Slot purchase email sent to:', email);
      return { success: true, result };
    } catch (error) {
      console.error('❌ Error sending slot purchase email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Отправка письма о покупке дополнительных слотов
   */
  static async sendMultipleSlotsPurchaseEmail(email, newSlots, totalUserSlots) {
    try {
      const newSlotsList = newSlots.map(slot => 
        `<li style="margin: 8px 0;">Слот #${slot.slot_number} (приобретен ${new Date(slot.purchase_date).toLocaleDateString('ru-RU')})</li>`
      ).join('');
      
      const mailOptions = {
        from: process.env.YANDEX_EMAIL,
        to: email,
        subject: 'Поздравляем с покупкой дополнительных слотов!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
            <div style="background: white; padding: 30px; border-radius: 10px;">
              <h1 style="color: #28a745; text-align: center;">Дополнительные слоты успешно приобретены!</h1>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #333;">Новые приобретенные слоты:</h3>
                <ul>${newSlotsList}</ul>
                <p><strong>Теперь у вас всего слотов:</strong> ${totalUserSlots}</p>
              </div>
              
              <p>Все номера слотов отображаются в вашем личном кабинете.</p>
              
              <div style="text-align: center; margin-top: 25px;">
                <a href="${process.env.APP_URL || 'https://your-club.com'}/login" 
                   style="display: inline-block; background: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">
                  Перейти в личный кабинет
                </a>
              </div>
            </div>
          </div>
        `
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Multiple slots purchase email sent to:', email);
      return { success: true, result };
    } catch (error) {
      console.error('❌ Error sending multiple slots email:', error);
      return { success: false, error: error.message };
    }
  }
}

export default EmailService;