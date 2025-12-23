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
    if (!phone) return '';

    console.log(`📱 normalizePhone вход: ${phone}`);

    // Убираем ВСЕ нецифровые символы включая скобки
    const digits = phone.replace(/[^\d]/g, '');
    console.log(`🔢 normalizePhone цифры: ${digits}`);

    // Если номер российский (10 цифр или начинается с 7/8)
    if (digits.length === 10) {
      return '7' + digits; // Добавляем код страны
    }

    if (digits.length === 11) {
      // Если начинается с 8 → меняем на 7
      if (digits.startsWith('8')) {
        return '7' + digits.substring(1);
      }
      // Если начинается с 7 → оставляем как есть
      if (digits.startsWith('7')) {
        return digits;
      }
    }

    // Возвращаем как есть (для международных номеров)
    return digits;
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