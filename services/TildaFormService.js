import User from '../models/Users.js';
import Payment from '../models/Payment.js';
import Helpers from '../utils/Helpers.js';

class TildaFormService {
  processFormData(formData, tildaData = {}) {
    console.log('📝 Processing Tilda form data:', formData);
    
    // Валидация обязательных полей
    if (!formData.Email && !formData.Phone) {
      throw new Error('Email or Phone is required');
    }

    // Нормализация телефона
    const normalizedPhone = Helpers.normalizePhone(formData.Phone || '');
    
    // Генерация логина и пароля
    const login = formData.Email || `user_${Date.now()}`;
    const password = Helpers.generatePassword();

    // Подготовка данных пользователя
    const userData = {
      fullname: formData.FullName || 'Не указано',
      phone: normalizedPhone,
      email: formData.Email || '',
      login: login,
      password: password,
      yeardate: Helpers.parseYeardate(formData.Yeardate),
      city: formData.City,
      conditions: formData.Conditions === 'yes' ? 'accepted' : 'pending',
      checkbox: Helpers.parseCheckbox(formData.Checkbox),
      documents: 'pending',
      payment_status: 'pending', 
      slot_number: null,
      payment_id: null, // Будет заполнен после создания платежа
      purchased_numbers: null,
      membership_status: 'pending_payment', 
      tilda_transaction_id: tildaData.tranid || null,
      tilda_form_id: tildaData.formid || null,
      tilda_project_id: tildaData.formid ? tildaData.formid.replace('form', '') : '14245141',
      tilda_page_id: tildaData.pageid || null
    };

    console.log('✅ Processed user data:', userData);
    return { userData, credentials: { login, password } };
  }

  async createUserFromForm(formData, tildaData = {}) {
    try {
      // Обрабатываем данные формы
      const { userData, credentials } = this.processFormData(formData, tildaData);

      // Создаем пользователя в базе
      const user = await User.create(userData);

      console.log('✅ User created from Tilda form:', user.email);
      
      return {
        user,
        credentials
      };

    } catch (error) {
      console.error('❌ Error creating user from form:', error);
      throw error;
    }
  }

  async findUserByFormData(formData) {
    try {
      let user = null;

      // Ищем по email
      if (formData.Email) {
        user = await User.findByEmail(formData.Email);
      }

      // Если не нашли по email, ищем по телефону
      if (!user && formData.Phone) {
        user = await User.findByPhone(formData.Phone);
      }

      return user;
    } catch (error) {
      console.error('❌ Error finding user by form data:', error);
      return null;
    }
  }

  validateFormData(formData) {
    const errors = [];

    // Проверяем наличие email или телефона
    if (!formData.Email && !formData.Phone) {
      errors.push('Email или телефон обязателен для заполнения');
    }

    // Валидация email
    if (formData.Email && !Helpers.validateEmail(formData.Email)) {
      errors.push('Некорректный формат email');
    }

    // Валидация телефона
    if (formData.Phone && !Helpers.validatePhone(formData.Phone)) {
      errors.push('Некорректный формат телефона. Используйте формат: +79999999999');
    }

    // Проверка условий
    if (formData.Conditions !== 'yes') {
      errors.push('Необходимо принять условия соглашения');
    }

    return errors;
  }
}

export default TildaFormService;