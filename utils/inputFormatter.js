// inputFormatter.js

/**
 * Модуль для форматирования полей ввода
 */
class InputFormatter {
    /**
     * Инициализация всех полей форматирования на странице
     */
    static initAll() {
        // Автоматическая инициализация полей с data-атрибутами
        document.querySelectorAll('[data-format]').forEach(input => {
            const formatType = input.getAttribute('data-format');
            
            switch(formatType) {
                case 'phone':
                    this.initPhoneInput(input);
                    break;
                case 'email':
                    this.initEmailInput(input);
                    break;
                case 'number':
                    this.initNumberInput(input);
                    break;
            }
        });
    }

    /**
     * Инициализация поля телефона
     * @param {HTMLInputElement} input - Элемент input
     * @param {Object} options - Опции форматирования
     */
    static initPhoneInput(input, options = {}) {
        // Добавляем CSS классы если их нет
        if (!input.classList.contains('formatted-input')) {
            input.classList.add('formatted-input', 'formatted-phone');
        }

        // Инициализируем форматирование телефона
        const phoneFormatter = PhoneFormatter.init(input, {
            format: options.format || '+7 (###) ###-##-##',
            showHint: options.showHint !== false,
            ...options
        });

        // Сохраняем ссылку на форматтер в элементе
        input._phoneFormatter = phoneFormatter;

        return phoneFormatter;
    }

    /**
     * Инициализация поля email
     * @param {HTMLInputElement} input - Элемент input
     */
    static initEmailInput(input) {
        input.classList.add('formatted-input', 'formatted-email');
        
        input.addEventListener('input', function(e) {
            const value = e.target.value.trim();
            if (value.includes('@')) {
                e.target.classList.add('email-active');
            } else {
                e.target.classList.remove('email-active');
            }
        });

        input.addEventListener('blur', function(e) {
            const value = e.target.value.trim();
            if (value && !value.includes('@')) {
                e.target.classList.add('email-error');
            } else {
                e.target.classList.remove('email-error');
            }
        });
    }

    /**
     * Инициализация поля для чисел (с разделителями тысяч)
     * @param {HTMLInputElement} input - Элемент input
     */
    static initNumberInput(input) {
        input.classList.add('formatted-input', 'formatted-number');
        
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value) {
                // Форматируем с разделителями тысяч
                value = parseInt(value, 10).toLocaleString('ru-RU');
                e.target.value = value;
            }
        });

        input.addEventListener('blur', function(e) {
            const value = e.target.value.replace(/\D/g, '');
            if (value) {
                e.target.value = parseInt(value, 10).toLocaleString('ru-RU');
            }
        });
    }

    /**
     * Получить нормализованное значение поля
     * @param {HTMLInputElement} input - Элемент input
     * @returns {string} Нормализованное значение
     */
    static getNormalizedValue(input) {
        if (input._phoneFormatter) {
            return input._phoneFormatter.getNormalizedPhone();
        }
        
        if (input.classList.contains('formatted-number')) {
            return input.value.replace(/\D/g, '');
        }
        
        return input.value.trim();
    }

    /**
     * Проверить валидность значения поля
     * @param {HTMLInputElement} input - Элемент input
     * @returns {boolean} Валидно ли значение
     */
    static isValid(input) {
        if (input._phoneFormatter) {
            return input._phoneFormatter.isValidPhone();
        }
        
        if (input.classList.contains('formatted-email')) {
            const value = input.value.trim();
            return value.includes('@') && value.includes('.');
        }
        
        return input.value.trim().length > 0;
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputFormatter;
} else {
    window.InputFormatter = InputFormatter;
}