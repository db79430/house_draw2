// public/js/app.js

const API_BASE = window.location.origin; // Используем текущий домен

// Состояние приложения
const AppState = {
    currentUser: null,
    currentMemberNumber: null
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 App инициализирован');
    initializeApp();
});

function initializeApp() {
    const searchInput = document.getElementById('search-input');
    const paymentBtn = document.getElementById('payment-btn');
    const searchBtn = document.getElementById('search-button'); // Добавлено: поиск кнопки по ID
    
    // Проверяем элементы
    console.log('🔍 Elements found:', {
        searchInput: !!searchInput,
        paymentBtn: !!paymentBtn,
        searchBtn: !!searchBtn
    });
    
    if (searchInput) {
        // Простое форматирование телефона
        setupPhoneFormatting(searchInput);
        
        // Привязка события Enter
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                console.log('⌨️ Enter pressed');
                findMemberNumber();
            }
        });
        
        // Фокус на поле поиска
        setTimeout(() => {
            if (searchInput) {
                searchInput.focus();
                console.log('🎯 Фокус на поле ввода');
            }
        }, 500);
    } else {
        console.error('❌ Не найден элемент search-input');
    }
    
    // Обработчик для кнопки поиска
    if (searchBtn) {
        searchBtn.addEventListener('click', function(e) {
            console.log('🔍 Кнопка поиска нажата');
            findMemberNumber();
        });
    } else {
        console.warn('⚠️ Не найден элемент search-button (кнопка поиска)');
    }
    
    if (paymentBtn) {
        paymentBtn.addEventListener('click', function(e) {
            console.log('💳 Кнопка оплаты нажата');
            createPayment();
        });
    } else {
        console.error('❌ Не найден элемент payment-btn');
    }
    
    // Проверяем параметры URL
    checkUrlParameters();
    
    // Показываем секцию поиска
    showSection('search-section');
}

// Простое форматирование телефона
function setupPhoneFormatting(input) {
    input.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.startsWith('7') || value.startsWith('8')) {
            // Форматируем российский номер
            if (value.startsWith('8')) {
                value = '7' + value.substring(1);
            }
            
            if (value.length <= 1) {
                e.target.value = '+7';
            } else if (value.length <= 4) {
                e.target.value = `+7 (${value.substring(1, 4)}`;
            } else if (value.length <= 7) {
                e.target.value = `+7 (${value.substring(1, 4)}) ${value.substring(4, 7)}`;
            } else if (value.length <= 9) {
                e.target.value = `+7 (${value.substring(1, 4)}) ${value.substring(4, 7)}-${value.substring(7, 9)}`;
            } else {
                e.target.value = `+7 (${value.substring(1, 4)}) ${value.substring(4, 7)}-${value.substring(7, 9)}-${value.substring(9, 11)}`;
            }
        }
    });
}

// Проверка параметров URL
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const memberNumber = urlParams.get('memberNumber');
    const email = urlParams.get('email');
    const phone = urlParams.get('phone');
    
    console.log('🔗 URL Parameters:', { memberNumber, email, phone });
    
    const searchInput = document.getElementById('search-input');
    
    if (memberNumber) {
        // Если есть memberNumber в URL, сразу используем его
        console.log('🔍 Автопоиск по memberNumber:', memberNumber);
        if (typeof findMemberNumber === 'function') {
            findMemberNumber(memberNumber);
        } else {
            console.warn('⚠️ findMemberByNumber не определена');
            if (searchInput) searchInput.value = memberNumber;
        }
    } else if (email || phone) {
        // Если есть email или телефон, заполняем поле и ищем
        if (searchInput) {
            searchInput.value = email || phone;
            console.log('🔍 Автопоиск по email/phone:', email || phone);
            setTimeout(() => {
                if (typeof findMemberNumber === 'function') {
                    findMemberNumber();
                }
            }, 500);
        }
    }
}

// Нормализация телефона
function normalizePhone(phone) {
    if (!phone) return '';
    
    // Удаляем все нецифровые символы
    let clean = phone.replace(/\D/g, '');
    
    // Если номер начинается с 8, меняем на 7
    if (clean.startsWith('8') && clean.length >= 11) {
        clean = '7' + clean.substring(1);
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

// Проверка, является ли строка телефоном
function isPhone(value) {
    if (!value || value.includes('@')) return false;
    
    const clean = value.replace(/\D/g, '');
    return (
        value.includes('+7') ||
        value.includes('(7') ||
        clean.length >= 10
    );
}

// Поиск номера члена клуба - ВЕРНУЛ оригинальный endpoint /get-member-number
async function findMemberNumber() {
    const searchInput = document.getElementById('search-input');
    let searchValue = searchInput.value.trim();
    
    console.log('🔍 Поиск пользователя:', searchValue);
    
    if (!searchValue) {
        alert('Пожалуйста, введите email или телефон');
        if (searchInput) searchInput.focus();
        return;
    }
    
    try {
        showLoading(true);
        
        // Определяем тип ввода
        const isEmail = searchValue.includes('@');
        const paramName = isEmail ? 'email' : 'phone';
        let paramValue = searchValue;
        
        // Для телефона нормализуем
        if (!isEmail) {
            paramValue = normalizePhone(searchValue);
            console.log('📱 Нормализованный телефон:', paramValue);
            
            // Проверяем длину телефона
            if (paramValue.length < 11) {
                throw new Error('Введите полный номер телефона (11 цифр)');
            }
        }
        
        // ✅ Используем существующий endpoint /get-member-number
        const url = `${API_BASE}/get-member-number?${paramName}=${encodeURIComponent(paramValue)}`;
        console.log('🌐 Запрос к API:', url);
        
        const response = await fetch(url);
        console.log('📥 Статус ответа:', response.status);
        
        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 Данные ответа:', data);
        
        if (data.success) {
            AppState.currentUser = data.userData || {};
            AppState.currentMemberNumber = data.memberNumber;
            
            displayUserData(data);
            showSection('user-section');
            
            // Добавляем memberNumber в URL
            updateUrlWithMemberNumber(data.memberNumber);
            
        } else {
            throw new Error(data.error || 'Пользователь не найден');
        }
        
    } catch (error) {
        console.error('❌ Ошибка поиска:', error);
        alert('Ошибка: ' + error.message);
        if (searchInput) searchInput.focus();
        
    } finally {
        showLoading(false);
    }
}

// Поиск пользователя по номеру участника
// async function findMemberByNumber(memberNumber) {
//     console.log('🔍 Поиск по номеру участника:', memberNumber);
    
//     if (!memberNumber) return;
    
//     try {
//         showLoading(true);
        
//         // ✅ Используем существующий endpoint /api/paymentfee?memberNumber=
//         const url = `${API_BASE}/api/paymentfee?memberNumber=${encodeURIComponent(memberNumber)}`;
//         console.log('🌐 Запрос к API:', url);
        
//         const response = await fetch(url);
//         console.log('📥 Статус ответа:', response.status);
        
//         if (!response.ok) {
//             throw new Error(`Ошибка сервера: ${response.status}`);
//         }
        
//         const data = await response.json();
//         console.log('📦 Данные ответа:', data);
        
//         if (data.success) {
//             AppState.currentUser = data.user || {};
//             AppState.currentMemberNumber = memberNumber;
            
//             // Отображаем данные
//             document.getElementById('member-number').textContent = memberNumber;
//             document.getElementById('user-fullname').textContent = data.user?.fullname || data.user?.name || 'Не указано';
//             document.getElementById('user-email').textContent = data.user?.email || 'Не указано';
//             document.getElementById('user-phone').textContent = data.user?.phone || 'Не указано';
//             document.getElementById('user-city').textContent = data.user?.city || 'Не указано';
            
//             showSection('user-section');
            
//             // Добавляем memberNumber в URL
//             updateUrlWithMemberNumber(memberNumber);
            
//         } else {
//             throw new Error(data.error || 'Пользователь не найден');
//         }
        
//     } catch (error) {
//         console.error('❌ Ошибка:', error);
//         alert('Ошибка: ' + error.message);
        
//     } finally {
//         showLoading(false);
//     }
// }

// Отображение данных пользователя
function displayUserData(data) {
    const userData = data.userData || data.user || {};
    
    document.getElementById('member-number').textContent = data.memberNumber || 'Не указан';
    document.getElementById('user-fullname').textContent = userData.fullname || userData.name || 'Не указано';
    document.getElementById('user-email').textContent = userData.email || 'Не указано';
    document.getElementById('user-phone').textContent = userData.phone || 'Не указано';
    document.getElementById('user-city').textContent = userData.city || 'Не указано';
    
    // Обновляем состояние
    AppState.currentUser = userData;
    AppState.currentMemberNumber = data.memberNumber;
    
    console.log('✅ Данные пользователя отображены:', {
        memberNumber: data.memberNumber,
        name: userData.fullname || userData.name
    });
}

// Обновление URL с memberNumber
function updateUrlWithMemberNumber(memberNumber) {
    if (!memberNumber) return;
    
    // Обновляем URL без перезагрузки страницы
    const url = new URL(window.location);
    url.searchParams.set('memberNumber', memberNumber);
    window.history.pushState({}, '', url.toString());
    console.log('🔗 URL обновлен:', url.toString());
}

// Создание платежа
async function createPayment() {
    if (!AppState.currentMemberNumber) {
        alert('Сначала найдите пользователя');
        return;
    }
    
    const paymentBtn = document.getElementById('payment-btn');
    if (!paymentBtn) {
        console.error('❌ Кнопка оплаты не найдена');
        return;
    }
    
    const originalText = paymentBtn.textContent;
    
    try {
        paymentBtn.disabled = true;
        paymentBtn.textContent = 'Создание платежа...';
        showLoading(true);
        
        console.log('💳 Создание платежа для:', AppState.currentMemberNumber);
        
        // ✅ Используем существующий endpoint /create-payment
        const response = await fetch(`${API_BASE}/create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                memberNumber: AppState.currentMemberNumber,
                userData: AppState.currentUser
            })
        });
        
        console.log('📥 Статус ответа:', response.status);
        
        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📦 Данные ответа:', result);
        
        if (result.success && result.paymentUrl) {
            // alert('Платеж создан успешно! Перенаправление...');
            
            // Задержка перед редиректом
            setTimeout(() => {
                window.location.href = result.paymentUrl;
            }, 1000);
            
        } else {
            throw new Error(result.error || 'Неизвестная ошибка при создании платежа');
        }
        
    } catch (error) {
        console.error('❌ Ошибка создания платежа:', error);
        alert('Ошибка создания платежа: ' + error.message);
        
        // Восстанавливаем кнопку
        paymentBtn.disabled = false;
        paymentBtn.textContent = originalText;
        
    } finally {
        showLoading(false);
    }
}

// Управление отображением секций
function showSection(sectionId) {
    console.log('🔄 Переключение на секцию:', sectionId);
    
    // Скрываем все секции
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
        console.log('   Скрыта:', section.id);
    });
    
    // Показываем нужную секцию
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
        console.log('   Показана:', sectionId);
    } else {
        console.error('❌ Секция не найдена:', sectionId);
    }
}

// Показать/скрыть загрузку
function showLoading(show) {
    const loadingSection = document.getElementById('loading-section');
    if (loadingSection) {
        if (show) {
            loadingSection.classList.add('active');
            console.log('⏳ Показана загрузка');
        } else {
            loadingSection.classList.remove('active');
            console.log('✅ Скрыта загрузка');
        }
    } else {
        console.warn('⚠️  Не найден элемент loading-section');
        // Создаем временный индикатор загрузки
        if (show) {
            const tempLoader = document.createElement('div');
            tempLoader.id = 'temp-loader';
            tempLoader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255,255,255,0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            `;
            tempLoader.innerHTML = `
                <div class="loading-spinner"></div>
                <p style="margin-top: 20px; color: #2d5016;">Загрузка...</p>
            `;
            document.body.appendChild(tempLoader);
        } else {
            const tempLoader = document.getElementById('temp-loader');
            if (tempLoader) {
                tempLoader.remove();
            }
        }
    }
}

// Делаем функции глобальными для onclick
window.findMemberNumber = findMemberNumber;
// window.findMemberByNumber = findMemberByNumber; // ✅ Добавлено для глобального доступа
window.createPayment = createPayment;

// Добавляем базовые стили
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        .section {
            display: none;
        }
        .section.active {
            display: block;
            animation: fadeIn 0.5s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .loading-spinner {
            width: 60px;
            height: 60px;
            border: 4px solid #e8f5e8;
            border-top: 4px solid #4CAF50;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    console.log('🎨 Стили добавлены');
});

// Создаем событие о загрузке приложения
setTimeout(() => {
    const event = new Event('appLoaded');
    document.dispatchEvent(event);
    console.log('⚡ Событие appLoaded отправлено');
}, 1000);