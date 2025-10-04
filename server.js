const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Хранилище данных в памяти
let messages = [];
let users = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    role: 'Владелец',
    isOnline: false,
    registeredAt: new Date().toISOString(),
    rating: 5.0,
    ratingCount: 1,
    email: 'admin@system.com',
    displayName: 'Владелец',
    avatar: ''
  }
];
let chats = [];

// Маршруты
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API для получения данных
app.get('/api/users', (req, res) => {
  res.json(users);
});

app.get('/api/messages', (req, res) => {
  res.json(messages);
});

// WebSocket события
io.on('connection', (socket) => {
  console.log('✅ Пользователь подключен:', socket.id);

  // Отправляем текущие данные новому пользователю
  socket.emit('users_list', users);
  socket.emit('message_history', messages);
  socket.emit('chats_list', chats);

  // Регистрация пользователя - ИСПРАВЛЕННЫЙ КОД
  socket.on('register_user', (userData) => {
    try {
      console.log('📝 Попытка регистрации:', userData.username);
      
      if (users.find(u => u.username === userData.username)) {
        console.log('❌ Пользователь уже существует:', userData.username);
        return socket.emit('registration_error', 'Пользователь уже существует');
      }

      const newUser = {
        id: Date.now(),
        username: userData.username,
        password: userData.password,
        role: 'user',
        isOnline: true,
        registeredAt: new Date().toISOString(),
        rating: 0,
        ratingCount: 0,
        email: userData.email || '',
        displayName: userData.username,
        avatar: ''
      };

      users.push(newUser);
      console.log('✅ Зарегистрирован новый пользователь:', userData.username);
      
      socket.emit('registration_success', newUser);
      io.emit('users_list', users); // Обновляем всех
      
    } catch (error) {
      console.error('❌ Ошибка регистрации:', error);
      socket.emit('registration_error', 'Ошибка сервера');
    }
  });

  // Вход пользователя - ИСПРАВЛЕННЫЙ КОД
  socket.on('login_user', (userData) => {
    try {
      console.log('🔐 Попытка входа:', userData.username);
      
      const user = users.find(u => 
        u.username === userData.username && 
        u.password === userData.password
      );

      if (user) {
        user.isOnline = true;
        socket.userId = user.id;
        
        console.log('✅ Успешный вход:', userData.username);
        socket.emit('login_success', user);
        io.emit('users_list', users); // Обновляем статус онлайн
        
      } else {
        console.log('❌ Неверные данные для входа:', userData.username);
        socket.emit('login_error', 'Неверный логин или пароль');
      }
    } catch (error) {
      console.error('❌ Ошибка входа:', error);
      socket.emit('login_error', 'Ошибка сервера');
    }
  });

  // Получение списка пользователей
  socket.on('get_users', () => {
    socket.emit('users_list', users);
  });

  // Отправка сообщения
  socket.on('send_message', (data) => {
    try {
      const message = {
        id: Date.now(),
        username: data.username,
        text: data.text,
        timestamp: new Date().toISOString(),
        chatId: data.chatId || 'general'
      };

      messages.push(message);
      io.emit('new_message', message);
      
      console.log('💬 Новое сообщение:', data.username, data.text);
    } catch (error) {
      socket.emit('message_error', 'Ошибка отправки сообщения');
    }
  });

  // Выход пользователя
  socket.on('logout_user', (userId) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      user.isOnline = false;
      io.emit('users_list', users);
      console.log('🚪 Пользователь вышел:', user.username);
    }
  });

  // Отключение
  socket.on('disconnect', () => {
    console.log('❌ Пользователь отключен:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📧 URL: https://your-app.onrender.com`);
  console.log('👤 Тестовый пользователь: admin / admin123');
});
