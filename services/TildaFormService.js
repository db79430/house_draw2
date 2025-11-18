import Helpers from '../utils/Helpers.js';
import User from '../models/Users.js';

class TildaFormService {
  processFormData(formData, tildaData = {}) {
    console.log('📝 Processing Tilda form data:', formData);
    
    // Валидация формы
    const validationErrors = this.validateFormData(formData);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(', '));
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
      city: formData.City,
      yeardate: Helpers.parseYeardate(formData.Yeardate),
      conditions: formData.Conditions === 'yes' ? 'accepted' : 'pending',
      checkbox: Helpers.parseCheckbox(formData.Checkbox),
      documents: 'pending',
      payment_status: 'pending', 
      slot_number: null,
      payment_id: null,
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

    // Проверка ФИО
    if (!formData.FullName || formData.FullName.trim().length < 2) {
      errors.push('ФИО обязательно для заполнения (минимум 2 символа)');
    }

    if (formData.FullName && formData.FullName.trim().length > 100) {
      errors.push('ФИО не должно превышать 100 символов');
    }

    // Проверка возраста
    if (formData.Age) {
      const age = parseInt(formData.Age);
      if (isNaN(age) || age < 18 || age > 100) {
        errors.push('Возраст должен быть числом от 18 до 100 лет');
      }
    }

    // Проверка даты рождения
    if (formData.Yeardate) {
      const date = new Date(formData.Yeardate);
      if (isNaN(date.getTime())) {
        errors.push('Некорректный формат даты рождения');
      } else {
        const today = new Date();
        const minDate = new Date();
        minDate.setFullYear(today.getFullYear() - 100);
        const maxDate = new Date();
        maxDate.setFullYear(today.getFullYear() - 18);

        if (date < minDate || date > maxDate) {
          errors.push('Дата рождения должна быть в диапазоне от 18 до 100 лет');
        }
      }
    }

    // Проверка условий соглашения
    if (formData.Conditions !== 'yes') {
      errors.push('Необходимо принять условия соглашения');
    }

    // Проверка чекбокса (если обязателен)
    if (formData.Checkbox !== 'yes') {
      errors.push('Необходимо согласие на обработку персональных данных');
    }

    return errors;
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

  // Альтернативная версия валидации с детализированными сообщениями
  validateFormDataDetailed(formData) {
    const errors = {
      hasErrors: false,
      fields: {}
    };

    // Email validation
    if (!formData.Email && !formData.Phone) {
      errors.fields.general = 'Email или телефон обязателен для заполнения';
      errors.hasErrors = true;
    }

    if (formData.Email && !Helpers.validateEmail(formData.Email)) {
      errors.fields.email = 'Некорректный формат email';
      errors.hasErrors = true;
    }

    // Phone validation
    if (formData.Phone && !Helpers.validatePhone(formData.Phone)) {
      errors.fields.phone = 'Некорректный формат телефона. Используйте формат: +79999999999';
      errors.hasErrors = true;
    }

    // FullName validation
    if (!formData.FullName || formData.FullName.trim().length < 2) {
      errors.fields.fullname = 'ФИО обязательно для заполнения';
      errors.hasErrors = true;
    } else if (formData.FullName.trim().length > 100) {
      errors.fields.fullname = 'ФИО слишком длинное (максимум 100 символов)';
      errors.hasErrors = true;
    }

    // Age validation
    if (formData.Age) {
      const age = parseInt(formData.Age);
      if (isNaN(age)) {
        errors.fields.age = 'Возраст должен быть числом';
        errors.hasErrors = true;
      } else if (age < 18 || age > 100) {
        errors.fields.age = 'Возраст должен быть от 18 до 100 лет';
        errors.hasErrors = true;
      }
    }

    // // Yeardate validation
    // if (formData.Yeardate) {
    //   const date = new Date(formData.Yeardate);
    //   if (isNaN(date.getTime())) {
    //     errors.fields.yeardate = 'Некорректная дата рождения';
    //     errors.hasErrors = true;
    //   }
    // }

    // Conditions validation
    if (formData.Conditions !== 'yes') {
      errors.fields.conditions = 'Необходимо принять условия соглашения';
      errors.hasErrors = true;
    }

    // Checkbox validation
    if (formData.Checkbox !== 'yes') {
      errors.fields.checkbox = 'Необходимо согласие на обработку персональных данных';
      errors.hasErrors = true;
    }

    return errors;
  }

  // Быстрая валидация для проверки только обязательных полей
  validateRequiredFields(formData) {
    const requiredFields = ['FullName'];
    
    // Email или телефон обязателен
    if (!formData.Email && !formData.Phone) {
      return false;
    }

    // Проверяем обязательные поля
    for (const field of requiredFields) {
      if (!formData[field] || formData[field].trim().length === 0) {
        return false;
      }
    }

    // Проверяем условия
    if (formData.Conditions !== 'yes') {
      return false;
    }

    return true;
  }

  // Валидация для конкретного поля
  validateField(fieldName, value) {
    const validators = {
      Email: (val) => Helpers.validateEmail(val),
      Phone: (val) => Helpers.validatePhone(val),
      FullName: (val) => val && val.trim().length >= 2 && val.trim().length <= 100,
      City: (val) => val && val.trim().length >= 2 && val.trim().length <= 100,
      Yeardate: (val) => !val || !isNaN(new Date(val).getTime()),
      Conditions: (val) => val === 'yes',
      Checkbox: (val) => val === 'yes'
    };

    const validator = validators[fieldName];
    return validator ? validator(value) : true;
  }

  // Получить сообщение об ошибке для поля
  getFieldErrorMessage(fieldName, value) {
    const errorMessages = {
      Email: 'Некорректный формат email',
      Phone: 'Некорректный формат телефона. Используйте формат: +79999999999',
      FullName: 'ФИО обязательно для заполнения (2-100 символов)',
      Yeardate: 'Некорректная дата рождения',
      Conditions: 'Необходимо принять условия соглашения',
      Checkbox: 'Необходимо согласие на обработку персональных данных'
    };

    if (!this.validateField(fieldName, value)) {
      return errorMessages[fieldName] || 'Некорректное значение';
    }

    return null;
  }
}

export default new TildaFormService();