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
app.use(express.static(path.join(__dirname, 'public')));
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

app.get('/api/chats', (req, res) => {
  res.json(chats);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    users: users.length,
    messages: messages.length,
    timestamp: new Date().toISOString()
  });
});

// WebSocket события
io.on('connection', (socket) => {
  console.log('✅ Пользователь подключен:', socket.id);

  // Отправляем текущие данные новому пользователю
  socket.emit('users_list', users);
  socket.emit('message_history', messages);
  socket.emit('chats_list', chats);

  // Регистрация пользователя
  socket.on('register_user', (userData) => {
    try {
      console.log('📝 Попытка регистрации:', userData.username);
      
      // Валидация данных
      if (!userData.username || !userData.password) {
        return socket.emit('registration_error', 'Заполните все поля');
      }
      
      if (userData.username.length < 3) {
        return socket.emit('registration_error', 'Логин должен быть не менее 3 символов');
      }
      
      if (userData.password.length < 6) {
        return socket.emit('registration_error', 'Пароль должен быть не менее 6 символов');
      }

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
        avatar: '',
        socketId: socket.id
      };

      users.push(newUser);
      console.log('✅ Зарегистрирован новый пользователь:', userData.username);
      
      socket.emit('registration_success', newUser);
      io.emit('users_list', users);
      
    } catch (error) {
      console.error('❌ Ошибка регистрации:', error);
      socket.emit('registration_error', 'Ошибка сервера');
    }
  });

  // Вход пользователя
  socket.on('login_user', (userData) => {
    try {
      console.log('🔐 Попытка входа:', userData.username);
      
      if (!userData.username || !userData.password) {
        return socket.emit('login_error', 'Заполните все поля');
      }

      const user = users.find(u => 
        u.username === userData.username && 
        u.password === userData.password
      );

      if (user) {
        user.isOnline = true;
        user.socketId = socket.id;
        socket.userId = user.id;
        
        console.log('✅ Успешный вход:', userData.username);
        socket.emit('login_success', user);
        io.emit('users_list', users);
        io.emit('user_status_change', { 
          userId: user.id, 
          isOnline: true 
        });
        
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
      if (!data.text || !data.username) {
        return socket.emit('message_error', 'Неверные данные сообщения');
      }

      const message = {
        id: Date.now(),
        username: data.username,
        text: data.text.trim(),
        timestamp: new Date().toISOString(),
        chatId: data.chatId || 'general',
        type: data.type || 'user'
      };

      messages.push(message);
      io.emit('new_message', message);
      
      console.log('💬 Новое сообщение:', data.username, data.text);
    } catch (error) {
      console.error('❌ Ошибка отправки сообщения:', error);
      socket.emit('message_error', 'Ошибка отправки сообщения');
    }
  });

  // Системное сообщение
  socket.on('send_system_message', (data) => {
    try {
      const user = users.find(u => u.id === socket.userId);
      if (!user || user.role !== 'Владелец') {
        return socket.emit('message_error', 'Недостаточно прав');
      }

      const message = {
        id: Date.now(),
        username: 'system',
        text: data.text,
        timestamp: new Date().toISOString(),
        chatId: data.chatId || 'general',
        type: 'system'
      };

      messages.push(message);
      io.emit('new_message', message);
      
    } catch (error) {
      socket.emit('message_error', 'Ошибка отправки системного сообщения');
    }
  });

  // Выход пользователя
  socket.on('logout_user', (userId) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      user.isOnline = false;
      user.socketId = null;
      io.emit('users_list', users);
      io.emit('user_status_change', { 
        userId: user.id, 
        isOnline: false 
      });
      console.log('🚪 Пользователь вышел:', user.username);
    }
  });

  // Создание чата
  socket.on('create_chat', (data) => {
    try {
      const chat = {
        id: Date.now(),
        name: data.name,
        participants: data.participants || [],
        createdAt: new Date().toISOString(),
        createdBy: socket.userId
      };
      
      chats.push(chat);
      io.emit('chats_list', chats);
      socket.emit('chat_created', chat);
      
    } catch (error) {
      socket.emit('chat_error', 'Ошибка создания чата');
    }
  });

  // Отключение
  socket.on('disconnect', () => {
    console.log('❌ Пользователь отключен:', socket.id);
    
    // Обновляем статус пользователя
    const user = users.find(u => u.socketId === socket.id);
    if (user) {
      user.isOnline = false;
      user.socketId = null;
      io.emit('users_list', users);
      io.emit('user_status_change', { 
        userId: user.id, 
        isOnline: false 
      });
      console.log('🔴 Пользователь offline:', user.username);
    }
  });
});

// Обработка несуществующих маршрутов
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Обработка ошибок
app.use((error, req, res, next) => {
  console.error('❌ Ошибка сервера:', error);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📧 URL: http://localhost:${PORT}`);
  console.log('👤 Тестовый пользователь: admin / admin123');
  console.log('🔧 Health check: http://localhost:${PORT}/api/health');
});
