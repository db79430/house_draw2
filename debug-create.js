import db from './database/index.js';

async function debugCreateUser() {
    console.log('🔍 === DEBUG СОЗДАНИЯ ПОЛЬЗОВАТЕЛЯ ===');
    
    const testData = {
        fullname: 'Тестовый Отладка',
        email: 'debug_' + Date.now() + '@test.com',
        login: 'debug_' + Date.now() + '@test.com',
        password: 'temp123',
        city: 'Москва',
        phone: '+7 (999) 111-22-33',
        conditions: 'accepted',
        checkbox: true,
        yeardate: '2001-01-01'
    };
    
    console.log('📝 Тестовые данные:', testData);
    
    try {
        // 1. Пробуем БЕЗ транзакции
        console.log('🧪 Тест 1: INSERT без транзакции...');
        
        const simpleResult = await db.one(`
            INSERT INTO users (
                fullname, email, login, password, city,
                phone, conditions, checkbox, yeardate,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            RETURNING id, email, phone
        `, [
            testData.fullname,
            testData.email,
            testData.login,
            testData.password,
            testData.city,
            testData.phone,
            testData.conditions,
            testData.checkbox,
            testData.yeardate
        ]);
        
        console.log('✅ УСПЕХ БЕЗ ТРАНЗАКЦИИ! Пользователь создан:', simpleResult);
        
        // 2. Пробуем С транзакцией (как в вашем коде)
        console.log('\n🧪 Тест 2: INSERT с транзакцией (как в TildaController)...');
        
        const transactionResult = await db.task(async t => {
            console.log('📊 Внутри транзакции...');
            
            const result = await t.one(`
                INSERT INTO users (
                    fullname, email, login, password, city,
                    phone, conditions, checkbox, yeardate,
                    created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                RETURNING id, email, phone
            `, [
                'Тест в транзакции',
                'tx_' + Date.now() + '@test.com',
                'tx_' + Date.now() + '@test.com',
                'temp123',
                'Москва',
                '+7 (999) 222-33-44',
                'accepted',
                true,
                '2001-01-01'
            ]);
            
            console.log('📊 Пользователь в транзакции создан:', result.id);
            return result;
        });
        
        console.log('✅ УСПЕХ С ТРАНЗАКЦИЕЙ!:', transactionResult);
        
        // 3. Проверяем что создалось
        const check = await db.one('SELECT COUNT(*) as count FROM users WHERE email LIKE $1', ['%debug%']);
        console.log(`📊 Всего debug пользователей: ${check.count}`);
        
        return { success: true };
        
    } catch (error) {
        console.error('💥 ОШИБКА СОЗДАНИЯ:', error.message);
        console.error('💥 Детали ошибки:', {
            code: error.code,
            detail: error.detail,
            constraint: error.constraint,
            table: error.table,
            column: error.column
        });
        
        // Проверяем конкретную ошибку транзакции
        if (error.message.includes('transaction') || error.code === '25P02') {
            console.error('⚠️ ПРОБЛЕМА С ТРАНЗАКЦИЕЙ!');
        }
        
        return { success: false, error: error.message };
    }
}

debugCreateUser().then(result => {
    console.log(result.success ? '🎉 Все тесты пройдены!' : '💥 Есть ошибки');
    process.exit(result.success ? 0 : 1);
});
