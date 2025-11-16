import EmailServices from "../services/EmailServices.js";
import Helpers from "../utils/Helpers.js";

class EmailController {
  async testEmail(req, res) {
    try {
      const { email, name } = req.body;
      
      const credentials = Helpers.generateCredentials();
      const emailResult = await EmailServices.sendCredentialsEmail(
        email || 'test@example.com',
        credentials.login,
        credentials.password,
        name || 'Тестовый пользователь'
      );

      res.json({
        Success: emailResult.success,
        Message: emailResult.success ? 'Тестовый email отправлен' : 'Ошибка отправки email',
        Credentials: credentials,
        Details: emailResult
      });

    } catch (error) {
      res.json({
        Success: false,
        Message: error.message
      });
    }
  }

  async testSMTPConnection(req, res) {
    try {
      const isConnected = await EmailServices.testConnection();
      
      res.json({
        Success: isConnected,
        Message: isConnected ? 'SMTP соединение установлено' : 'Ошибка SMTP соединения'
      });

    } catch (error) {
      res.json({
        Success: false,
        Message: error.message
      });
    }
  }
}

export default EmailController;