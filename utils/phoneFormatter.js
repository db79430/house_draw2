// phoneFormatter.js

/**
 * Модуль для форматирования и валидации телефонных номеров
 */
class PhoneFormatter {
    /**
     * Инициализирует форматирование для указанного input элемента
     * @param {HTMLInputElement} inputElement - Элемент input
     * @param {Object} options - Опции форматирования
     */
    static init(inputElement, options = {}) {
        return new PhoneFormatter(inputElement, options);
    }

    /**
     * Конструктор
     * @param {HTMLInputElement} inputElement - Элемент input
     * @param {Object} options - Опции форматирования
     */
    constructor(inputElement, options = {}) {
        this.input = inputElement;
        this.options = {
            countryCode: '7',
            format: '+# (###) ###-##-##',
            placeholder: '+7 (___) ___-__-__',
            showHint: true,
            hintPosition: 'afterend',
            ...options
        };

        this.isPhoneInput = false;
        this.cleanValue = '';

        this.init();
    }

    /**
     * Инициализация события
     */
    init() {
        this.bindEvents();
        this.setupPlaceholder();
        this.createHintElement();
    }

    /**
     * Привязка событий к input
     */
    bindEvents() {
        this.input.addEventListener('input', (e) => this.onInput(e));
        this.input.addEventListener('focus', (e) => this.onFocus(e));
        this.input.addEventListener('blur', (e) => this.onBlur(e));
        this.input.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    /**
     * Установка placeholder
     */
    setupPlaceholder() {
        if (this.options.placeholder && !this.input.placeholder) {
            this.input.placeholder = this.options.placeholder;
        }
    }

    /**
     * Создание элемента подсказки
     */
    createHintElement() {
        if (!this.options.showHint) return;

        this.hintElement = document.createElement('div');
        this.hintElement.className = 'phone-hint';
        this.hintElement.style.cssText = `
            font-size: 12px;
            color: #4a7c2a;
            margin-top: 5px;
            text-align: center;
            opacity: 0;
            transition: opacity 0.3s ease;
            position: absolute;
            left: 0;
            right: 0;
        `;

        this.input.parentNode.style.position = 'relative';
        this.input.parentNode.appendChild(this.hintElement);
    }

    /**
     * Обработчик ввода
     */
    onInput(event) {
        const value = event.target.value;
        this.detectInputType(value);
        
        if (this.isPhoneInput) {
            this.formatPhone(value);
            this.showHint();
        } else {
            this.clearPhoneFormatting();
            this.hideHint();
        }
    }

    /**
     * Обработчик фокуса
     */
    onFocus(event) {
        if (this.isPhoneInput) {
            this.input.classList.add('phone-active');
            this.showHint();
        }
    }

    /**
     * Обработчик потери фокуса
     */
    onBlur(event) {
        if (this.isPhoneInput) {
            this.finalizeFormatting();
        }
        this.hideHint();
    }

    /**
     * Обработчик нажатия клавиш (для Backspace и Delete)
     */
    onKeyDown(event) {
        if (!this.isPhoneInput) return;

        const cursorPosition = this.input.selectionStart;
        const value = this.input.value;

        // Если нажали Backspace и курсор стоит после разделителя
        if (event.key === 'Backspace' && cursorPosition > 0) {
            const charBeforeCursor = value[cursorPosition - 1];
            if (this.isSeparator(charBeforeCursor)) {
                event.preventDefault();
                this.input.setSelectionRange(cursorPosition - 1, cursorPosition - 1);
            }
        }

        // Если нажали Delete и курсор стоит перед разделителем
        if (event.key === 'Delete' && cursorPosition < value.length) {
            const charAtCursor = value[cursorPosition];
            if (this.isSeparator(charAtCursor)) {
                event.preventDefault();
                this.input.setSelectionRange(cursorPosition + 1, cursorPosition + 1);
            }
        }
    }

    /**
     * Определение типа ввода (телефон или email)
     */
    detectInputType(value) {
        const trimmedValue = value.trim();
        
        if (trimmedValue.includes('@')) {
            this.isPhoneInput = false;
        } else if (this.isLikelyPhone(trimmedValue)) {
            this.isPhoneInput = true;
        }
    }

    /**
     * Проверка, похоже ли значение на телефон
     */
    isLikelyPhone(value) {
        // Пустая строка или только разделители
        if (!value || /^[+\s()-]+$/.test(value)) return false;
        
        // Содержит @ - это email
        if (value.includes('@')) return false;
        
        // Начинается с +7, 7, 8 или содержит только цифры и разделители
        const clean = value.replace(/\D/g, '');
        return (
            value.startsWith('+7') ||
            value.startsWith('7') ||
            value.startsWith('8') ||
            (clean.length > 5 && /^[\d+\s()-]+$/.test(value))
        );
    }

    /**
     * Форматирование телефонного номера
     */
    formatPhone(value) {
        // Удаляем все нецифры, но сохраняем начальный плюс
        let clean = value.replace(/\D/g, '');
        
        // Сохраняем оригинал для отслеживания изменений
        if (clean === this.cleanValue) return;
        this.cleanValue = clean;

        // Если номер начинается с 8, меняем на 7
        if (clean.startsWith('8') && clean.length >= 11) {
            clean = '7' + clean.substring(1);
        }

        // Убираем дублирование кода страны
        if (clean.startsWith('77') && clean.length > 11) {
            clean = '7' + clean.substring(2);
        }

        // Форматируем согласно шаблону
        let formatted = this.options.format;
        let digitIndex = 0;

        formatted = formatted.replace(/#/g, () => {
            if (digitIndex < clean.length) {
                return clean[digitIndex++];
            }
            return '_';
        });

        // Заменяем оставшиееся символы # на подчеркивания
        formatted = formatted.replace(/#/g, '_');

        // Устанавливаем отформатированное значение
        if (this.input.value !== formatted) {
            this.input.value = formatted;
            
            // Восстанавливаем позицию курсора
            setTimeout(() => {
                const cursorPos = this.getCursorPosition(formatted, clean.length);
                this.input.setSelectionRange(cursorPos, cursorPos);
            }, 0);
        }
    }

    /**
     * Получение позиции курсора в отформатированной строке
     */
    getCursorPosition(formatted, digitsEntered) {
        let digitCount = 0;
        
        for (let i = 0; i < formatted.length; i++) {
            if (formatted[i] === '_' || /\d/.test(formatted[i])) {
                digitCount++;
                if (digitCount === digitsEntered) {
                    return i + 1;
                }
            }
        }
        
        return formatted.length;
    }

    /**
     * Финальное форматирование при потере фокуса
     */
    finalizeFormatting() {
        const clean = this.input.value.replace(/\D/g, '');
        
        // Если номер слишком короткий, очищаем
        if (clean.length < 11) {
            this.input.value = '';
            this.clearPhoneFormatting();
            return;
        }

        // Форматируем полный номер
        this.formatPhone(this.input.value);
    }

    /**
     * Очистка телефонного форматирования
     */
    clearPhoneFormatting() {
        this.input.classList.remove('phone-active');
        this.input.classList.remove('phone-formatted');
        this.isPhoneInput = false;
        this.cleanValue = '';
    }

    /**
     * Проверка, является ли символ разделителем
     */
    isSeparator(char) {
        return [' ', '(', ')', '-', '+'].includes(char);
    }

    /**
     * Показать подсказку
     */
    showHint() {
        if (this.hintElement) {
            this.hintElement.textContent = `Формат: ${this.options.format.replace(/#/g, 'X')}`;
            this.hintElement.style.opacity = '1';
        }
    }

    /**
     * Скрыть подсказку
     */
    hideHint() {
        if (this.hintElement) {
            this.hintElement.style.opacity = '0';
        }
    }

    /**
     * Получить нормализованный номер телефона
     * @returns {string} Номер в формате 7XXXXXXXXXX
     */
    getNormalizedPhone() {
        if (!this.isPhoneInput) return '';
        
        const clean = this.input.value.replace(/\D/g, '');
        
        // Если номер начинается с 8, меняем на 7
        if (clean.startsWith('8') && clean.length === 11) {
            return '7' + clean.substring(1);
        }
        
        // Если номер начинается с 7 и длиной 11 цифр
        if (clean.startsWith('7') && clean.length === 11) {
            return clean;
        }
        
        // Если номер длиной 10 цифр (без кода страны)
        if (clean.length === 10 && !clean.startsWith('7')) {
            return '7' + clean;
        }
        
        return clean;
    }

    /**
     * Проверка валидности телефона
     * @returns {boolean} Валиден ли номер
     */
    isValidPhone() {
        const normalized = this.getNormalizedPhone();
        return normalized.length === 11 && normalized.startsWith('7');
    }

    /**
     * Установить значение телефона
     * @param {string} phone - Номер телефона
     */
    setPhone(phone) {
        const clean = phone.replace(/\D/g, '');
        
        if (clean.length >= 10) {
            this.isPhoneInput = true;
            this.input.value = phone;
            this.formatPhone(phone);
            this.input.classList.add('phone-active');
        }
    }

    /**
     * Сброс форматирования
     */
    destroy() {
        this.input.removeEventListener('input', this.onInput);
        this.input.removeEventListener('focus', this.onFocus);
        this.input.removeEventListener('blur', this.onBlur);
        this.input.removeEventListener('keydown', this.onKeyDown);
        
        if (this.hintElement && this.hintElement.parentNode) {
            this.hintElement.parentNode.removeChild(this.hintElement);
        }
    }
}

/**
 * Вспомогательные функции для работы с телефонами
 */
class PhoneUtils {
    /**
     * Нормализация телефонного номера
     * @param {string} phone - Исходный номер
     * @returns {string} Нормализованный номер
     */
    static normalize(phone) {
        if (!phone) return '';
        
        let clean = phone.replace(/\D/g, '');
        
        // Убираем лишние символы
        if (clean.startsWith('8') && clean.length === 11) {
            clean = '7' + clean.substring(1);
        }
        
        if (clean.startsWith('7') && clean.length === 11) {
            return clean;
        }
        
        if (clean.length === 10) {
            return '7' + clean;
        }
        
        return clean;
    }

    /**
     * Форматирование телефона для отображения
     * @param {string} phone - Номер телефона
     * @param {string} format - Формат (по умолчанию +7 (XXX) XXX-XX-XX)
     * @returns {string} Отформатированный номер
     */
    static formatForDisplay(phone, format = '+7 (XXX) XXX-XX-XX') {
        const clean = PhoneUtils.normalize(phone);
        
        if (clean.length !== 11) return phone;
        
        const rest = clean.substring(1);
        return format
            .replace('XXX', rest.substring(0, 3))
            .replace('XXX', rest.substring(3, 6))
            .replace('XX', rest.substring(6, 8))
            .replace('XX', rest.substring(8, 10));
    }

    /**
     * Проверка, является ли строка телефоном
     * @param {string} value - Проверяемое значение
     * @returns {boolean}
     */
    static isPhone(value) {
        if (!value || value.includes('@')) return false;
        
        const clean = value.replace(/\D/g, '');
        return (
            value.startsWith('+7') ||
            value.startsWith('7') ||
            value.startsWith('8') ||
            clean.length >= 10
        );
    }

    /**
     * Извлечение кода страны из номера
     * @param {string} phone - Номер телефона
     * @returns {string} Код страны
     */
    static getCountryCode(phone) {
        const clean = phone.replace(/\D/g, '');
        if (clean.startsWith('7')) return '7';
        if (clean.startsWith('8')) return '7'; // Россия
        if (clean.startsWith('375')) return '375'; // Беларусь
        if (clean.startsWith('380')) return '380'; // Украина
        return '';
    }

    /**
     * Проверка возможности международного номера
     * @param {string} phone - Номер телефона
     * @returns {boolean}
     */
    static isInternational(phone) {
        const clean = phone.replace(/\D/g, '');
        return clean.length > 11;
    }
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PhoneFormatter, PhoneUtils };
} else {
    window.PhoneFormatter = PhoneFormatter;
    window.PhoneUtils = PhoneUtils;
}