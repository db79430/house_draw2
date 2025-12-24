import crypto from 'crypto';

class Helpers {
  static generateOrderId() {
    return Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  }

  static generatePassword(length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  static normalizePhone(phone) {
    if (!phone) return null;
        
        // Получаем только цифры
        const digits = phone.replace(/\D/g, '');
        
        // Если пусто
        if (!digits) return null;
        
        // Если 11 цифр и начинается с 7 или 8
        if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
            // Возвращаем в формате +7XXXXXXXXXX
            return '+7' + digits.slice(1);
        }
        // Если 10 цифр
        else if (digits.length === 10) {
            return '+7' + digits;
        }
        // Если меньше 10 цифр
        else if (digits.length < 10) {
            // Возможно, это без кода города
            return digits;
        }
        
        // Для других форматов возвращаем оригинал
        return phone;
    }

  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePhone(phone) {
    const normalized = this.normalizePhone(phone);
    const phoneRegex = /^\+7\d{10}$/;
    return phoneRegex.test(normalized);
  }

  static sanitizeString(str) {
    if (!str) return '';
    return str.toString().replace(/[<>]/g, '').substring(0, 250);
  }

  static parseAge(ageStr) {
    if (!ageStr) return null;
    const age = parseInt(ageStr);
    return isNaN(age) ? null : age;
  }

  static parseYeardate(yeardateStr) {
    if (!yeardateStr) return null;

    // Пробуем разные форматы дат
    const date = new Date(yeardateStr);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  }

  static parseCheckbox(value) {
    return value === 'yes' || value === 'on' || value === 'true' || value === '1';
  }

  static formatResponse(success, data = null, error = null) {
    return {
      success,
      data,
      error,
      timestamp: new Date().toISOString()
    };
  }

  static parseConditions(value) {
    if (!value) return 'pending';

    const val = String(value).toLowerCase().trim();

    if (val === 'on' || val === 'yes' || val === 'true' || val === '1' || val === 'accepted') {
      return 'accepted'; // Это VARCHAR поле
    }

    return 'pending';
  }
}
export default Helpers;