# Используем официальный Node.js LTS образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Открываем порт (обычно 3000 для Node.js)
EXPOSE 3000

# Команда для запуска приложения
CMD ["node", "server.js"]