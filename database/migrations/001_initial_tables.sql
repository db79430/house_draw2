-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
DROP TRIGGER IF EXISTS update_slots_updated_at ON slots;
DROP TRIGGER IF EXISTS update_webhook_logs_updated_at ON webhook_logs;
DROP FUNCTION IF EXISTS update_updated_at_column;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    fullname VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100) NOT NULL,
    login VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    yeardate DATE,
    city VARCHAR(100) NOT NULL,
    conditions VARCHAR(20) DEFAULT 'pending',
    checkbox BOOLEAN DEFAULT FALSE,
    documents VARCHAR(20) DEFAULT 'pending',
    payment_status VARCHAR(20) DEFAULT 'pending',
    slot_number INTEGER,
    payment_id VARCHAR(50),
    purchased_numbers JSONB,
    membership_status VARCHAR(20) DEFAULT 'pending_payment',
    tilda_transaction_id VARCHAR(100),
    tilda_form_id VARCHAR(50),
    tilda_project_id VARCHAR(50),
    tilda_page_id VARCHAR(50),
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    membership_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🔥 ИСПРАВЛЕНИЕ: Убедимся что поле правильного типа
DO $$ 
BEGIN
    -- Если поле существует но неправильного типа - исправим
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'membership_number') THEN
        -- Изменяем тип если он не VARCHAR(50)
        IF (SELECT character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'membership_number') != 50 THEN
            
            ALTER TABLE users ALTER COLUMN membership_number TYPE VARCHAR(50);
            RAISE NOTICE '✅ Исправлен тип membership_number на VARCHAR(50)';
        END IF;
    ELSE
        -- Создаем поле если его нет
        ALTER TABLE users ADD COLUMN membership_number VARCHAR(50);
        RAISE NOTICE '✅ Создано поле membership_number';
    END IF;
END $$;

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'RUB',
    tinkoff_payment_id VARCHAR(50),
    order_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    description TEXT,
    tinkoff_response JSONB,
    notification_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create slots table
CREATE TABLE IF NOT EXISTS slots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    slot_number VARCHAR(50) NOT NULL,
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🔥 ДОБАВЛЯЕМ ТАБЛИЦУ webhook_logs
CREATE TABLE IF NOT EXISTS webhook_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    member_number VARCHAR(100),
    action_type VARCHAR(50),
    form_data JSONB,
    tilda_data JSONB,
    processed_at TIMESTAMP,
    error_message TEXT,
    http_status INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE webhook_logs IS 'Логи обработки вебхуков от Tilda';
COMMENT ON COLUMN webhook_logs.action_type IS 'Тип действия: user_created, user_updated, error';
COMMENT ON COLUMN webhook_logs.form_data IS 'Данные формы в JSON формате';
COMMENT ON COLUMN webhook_logs.tilda_data IS 'Технические данные от Tilda';

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_payment_status ON users(payment_status);
CREATE INDEX IF NOT EXISTS idx_users_membership_status ON users(membership_status);
CREATE INDEX IF NOT EXISTS idx_users_payment_id ON users(payment_id);
CREATE INDEX IF NOT EXISTS idx_users_tilda_transaction_id ON users(tilda_transaction_id);

-- 🔥 Убедимся что индекс для membership_number создан правильно
DROP INDEX IF EXISTS idx_users_membership_number;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_membership_number ON users(membership_number);

-- Create indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Create indexes for slots
CREATE INDEX IF NOT EXISTS idx_slots_user_id ON slots(user_id);
CREATE INDEX IF NOT EXISTS idx_slots_slot_number ON slots(slot_number);
CREATE INDEX IF NOT EXISTS idx_slots_status ON slots(status);
CREATE INDEX IF NOT EXISTS idx_slots_purchase_date ON slots(purchase_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_slots_unique_number ON slots(slot_number);

-- 🔥 Создаем индексы для webhook_logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_id ON webhook_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_member_number ON webhook_logs(member_number);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_action_type ON webhook_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON webhook_logs(processed_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slots_updated_at BEFORE UPDATE ON slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_logs_updated_at BEFORE UPDATE ON webhook_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 🔥 Создаем функцию для логирования вебхуков
CREATE OR REPLACE FUNCTION log_webhook_processing(
    p_user_id INTEGER,
    p_member_number VARCHAR,
    p_action_type VARCHAR,
    p_form_data JSONB DEFAULT NULL,
    p_tilda_data JSONB DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_http_status INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    log_id INTEGER;
BEGIN
    INSERT INTO webhook_logs (
        user_id,
        member_number,
        action_type,
        form_data,
        tilda_data,
        processed_at,
        error_message,
        http_status
    ) VALUES (
        p_user_id,
        p_member_number,
        p_action_type,
        p_form_data,
        p_tilda_data,
        CURRENT_TIMESTAMP,
        p_error_message,
        p_http_status
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- 🔥 Проверка что все исправлено
DO $$
DECLARE
    users_count INTEGER;
    payments_count INTEGER;
    slots_count INTEGER;
    webhook_logs_count INTEGER;
BEGIN
    RAISE NOTICE '=== ПРОВЕРКА ТАБЛИЦ И ИНДЕКСОВ ===';
    
    -- Проверим тип membership_number
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'membership_number'
               AND data_type = 'character varying' AND character_maximum_length = 50) THEN
        RAISE NOTICE '✅ users.membership_number: VARCHAR(50) - OK';
    ELSE
        RAISE NOTICE '❌ users.membership_number: НЕПРАВИЛЬНЫЙ ТИП!';
    END IF;

    -- Проверим создание таблицы slots
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'slots') THEN
        RAISE NOTICE '✅ Таблица slots создана успешно';
    ELSE
        RAISE NOTICE '❌ Таблица slots не создана!';
    END IF;

    -- Проверим создание таблицы webhook_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_logs') THEN
        RAISE NOTICE '✅ Таблица webhook_logs создана успешно';
        
        -- Проверим колонки webhook_logs
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'webhook_logs' AND column_name = 'form_data') THEN
            RAISE NOTICE '✅ Поле webhook_logs.form_data существует';
        END IF;
    ELSE
        RAISE NOTICE '❌ Таблица webhook_logs не создана!';
    END IF;

    -- Проверим индексы slots
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'slots' AND indexname = 'idx_slots_user_id') THEN
        RAISE NOTICE '✅ Индексы для slots созданы успешно';
    ELSE
        RAISE NOTICE '❌ Индексы для slots не созданы!';
    END IF;

    -- Проверим индексы webhook_logs
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'webhook_logs' AND indexname = 'idx_webhook_logs_user_id') THEN
        RAISE NOTICE '✅ Индексы для webhook_logs созданы успешно';
    ELSE
        RAISE NOTICE '❌ Индексы для webhook_logs не созданы!';
    END IF;

    -- Проверим функцию логирования
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_webhook_processing') THEN
        RAISE NOTICE '✅ Функция log_webhook_processing создана успешно';
    ELSE
        RAISE NOTICE '❌ Функция log_webhook_processing не создана!';
    END IF;

    -- Проверим триггер для webhook_logs
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_webhook_logs_updated_at') THEN
        RAISE NOTICE '✅ Триггер для webhook_logs создан успешно';
    ELSE
        RAISE NOTICE '❌ Триггер для webhook_logs не создан!';
    END IF;

    -- Подсчитаем записи в таблицах
    SELECT COUNT(*) INTO users_count FROM users;
    SELECT COUNT(*) INTO payments_count FROM payments;
    SELECT COUNT(*) INTO slots_count FROM slots;
    SELECT COUNT(*) INTO webhook_logs_count FROM webhook_logs;
    
    RAISE NOTICE '=== СТАТИСТИКА ===';
    RAISE NOTICE 'users: % записей', users_count;
    RAISE NOTICE 'payments: % записей', payments_count;
    RAISE NOTICE 'slots: % записей', slots_count;
    RAISE NOTICE 'webhook_logs: % записей', webhook_logs_count;
    
END $$;

-- 🔥 Создаем представление для мониторинга вебхуков (опционально)
CREATE OR REPLACE VIEW webhook_stats AS
SELECT 
    DATE(created_at) as date,
    action_type,
    COUNT(*) as total,
    COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as errors,
    COUNT(CASE WHEN http_status >= 400 THEN 1 END) as http_errors
FROM webhook_logs
GROUP BY DATE(created_at), action_type
ORDER BY date DESC, action_type;

-- 🔥 Создаем представление для пользователей с последним вебхуком
CREATE OR REPLACE VIEW users_with_last_webhook AS
SELECT 
    u.id,
    u.fullname,
    u.email,
    u.phone,
    u.membership_number,
    u.payment_status,
    u.membership_status,
    u.created_at as user_created,
    wl.action_type as last_action,
    wl.processed_at as last_webhook,
    wl.error_message as last_error
FROM users u
LEFT JOIN webhook_logs wl ON wl.user_id = u.id AND wl.id = (
    SELECT MAX(id) FROM webhook_logs WHERE user_id = u.id
);

RAISE NOTICE '✅ Миграция завершена успешно!';
RAISE NOTICE 'Созданы таблицы: users, payments, slots, webhook_logs';
RAISE NOTICE 'Созданы представления: webhook_stats, users_with_last_webhook';
RAISE NOTICE 'Создана функция: log_webhook_processing';