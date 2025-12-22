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

    // 1. Убираем ВСЕ нецифровые символы включая +
    let digits = phone.replace(/\D/g, '');

    console.log('normalizePhone вход:', phone, 'цифры:', digits);

    if (!digits) return '';

    // 2. Если начинается с 8 и 11 цифр - меняем 8 на 7
    if (digits.length === 11 && digits.startsWith('8')) {
      const result = '7' + digits.substring(1);
      console.log('8XXXX -> 7XXXX:', result);
      return result;
    }

    // 3. Если 10 цифр - добавляем 7
    if (digits.length === 10) {
      const result = '7' + digits;
      console.log('10 цифр -> 7+10:', result);
      return result;
    }

    // 4. Если 11 цифр и начинается с 7 - оставляем
    if (digits.length === 11 && digits.startsWith('7')) {
      console.log('Уже правильный формат:', digits);
      return digits;
    }

    // 5. Возвращаем цифры как есть
    console.log('Возвращаем как есть:', digits);
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