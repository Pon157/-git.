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

// Хранилище данных
let messages = [];
let users = [
  {
    id: 1,
    username: 'owner',
    password: 'owner123',
    role: 'Владелец',
    isOnline: false,
    registeredAt: new Date().toISOString(),
    rating: 5.0,
    ratingCount: 1,
    email: 'owner@system.com',
    displayName: 'Владелец Системы',
    avatar: '',
    permissions: ['all']
  },
  {
    id: 2,
    username: 'coowner',
    password: 'coowner123',
    role: 'Совладелец',
    isOnline: false,
    registeredAt: new Date().toISOString(),
    rating: 4.8,
    ratingCount: 1,
    email: 'coowner@system.com',
    displayName: 'Совладелец',
    avatar: '',
    permissions: ['all']
  },
  {
    id: 3,
    username: 'deputy',
    password: 'deputy123',
    role: 'Заместитель',
    isOnline: false,
    registeredAt: new Date().toISOString(),
    rating: 4.5,
    ratingCount: 1,
    email: 'deputy@system.com',
    displayName: 'Заместитель',
    avatar: '',
    permissions: ['manage_users', 'view_stats'] // УБРАЛИ send_broadcast
  },
  {
    id: 4,
    username: 'admin',
    password: 'admin123',
    role: 'Администратор',
    isOnline: false,
    registeredAt: new Date().toISOString(),
    rating: 4.2,
    ratingCount: 1,
    email: 'admin@system.com',
    displayName: 'Администратор',
    avatar: '',
    permissions: ['view_stats', 'manage_chats']
  },
  {
    id: 5,
    username: 'listener',
    password: 'listener123',
    role: 'Слушатель',
    isOnline: false,
    registeredAt: new Date().toISOString(),
    rating: 4.7,
    ratingCount: 3,
    email: 'listener@system.com',
    displayName: 'Слушатель',
    avatar: '',
    permissions: ['view_chats', 'view_own_rating'] // ДОБАВИЛИ просмотр рейтинга
  }
];

let chats = [];
let ratings = [];

// Система прав доступа
const rolePermissions = {
  'Владелец': ['all'],
  'Совладелец': ['all'],
  'Заместитель': ['manage_users', 'view_stats', 'manage_chats'], // УБРАЛИ send_broadcast
  'Администратор': ['view_stats', 'manage_chats', 'view_users'],
  'Слушатель': ['view_chats', 'send_messages', 'view_own_rating'], // ДОБАВИЛИ просмотр рейтинга
  'user': ['send_messages', 'view_profile']
};

// Маршруты
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/users', (req, res) => {
  res.json(users);
});

app.get('/api/messages', (req, res) => {
  res.json(messages);
});

app.get('/api/chats', (req, res) => {
  res.json(chats);
});

// Новый маршрут для получения рейтинга пользователя
app.get('/api/rating/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  
  const userRatings = ratings.filter(r => r.targetId === userId);
  const ratingDetails = userRatings.map(r => ({
    rating: r.rating,
    comment: r.comment,
    timestamp: r.timestamp,
    rater: users.find(u => u.id === r.raterId)?.displayName || 'Аноним'
  }));
  
  res.json({
    averageRating: user.rating,
    ratingCount: user.ratingCount,
    ratings: ratingDetails
  });
});

// WebSocket события
io.on('connection', (socket) => {
  console.log('✅ Пользователь подключен:', socket.id);

  socket.emit('users_list', users);
  socket.emit('message_history', messages);
  socket.emit('chats_list', chats);

  // Регистрация пользователя
  socket.on('register_user', (userData) => {
    try {
      console.log('📝 Попытка регистрации:', userData.username);
      
      if (users.find(u => u.username === userData.username)) {
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
        permissions: rolePermissions['user'],
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
      
      const user = users.find(u => 
        u.username === userData.username && 
        u.password === userData.password
      );

      if (user) {
        user.isOnline = true;
        user.socketId = socket.id;
        socket.userId = user.id;
        socket.userRole = user.role;
        
        console.log('✅ Успешный вход:', userData.username, 'Роль:', user.role);
        
        // Отправляем рейтинг пользователю если он слушатель
        if (user.role === 'Слушатель') {
          const userRatings = ratings.filter(r => r.targetId === user.id);
          socket.emit('user_rating_data', {
            averageRating: user.rating,
            ratingCount: user.ratingCount,
            ratings: userRatings
          });
        }
        
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

  // Получение рейтинга пользователя
  socket.on('get_user_rating', (data) => {
    try {
      const requestingUser = users.find(u => u.id === socket.userId);
      const targetUser = users.find(u => u.id === data.userId);
      
      if (!requestingUser || !targetUser) return;
      
      // Проверяем права доступа к рейтингу
      if (requestingUser.id !== targetUser.id && 
          !requestingUser.permissions.includes('manage_users')) {
        return socket.emit('rating_error', 'Недостаточно прав для просмотра рейтинга');
      }
      
      const userRatings = ratings.filter(r => r.targetId === data.userId);
      const ratingDetails = userRatings.map(r => ({
        rating: r.rating,
        comment: r.comment,
        timestamp: r.timestamp,
        rater: users.find(u => u.id === r.raterId)?.displayName || 'Аноним'
      }));
      
      socket.emit('user_rating_data', {
        averageRating: targetUser.rating,
        ratingCount: targetUser.ratingCount,
        ratings: ratingDetails
      });
      
    } catch (error) {
      socket.emit('rating_error', 'Ошибка получения рейтинга');
    }
  });

  // Получение списка пользователей (с проверкой прав)
  socket.on('get_users', () => {
    const user = users.find(u => u.id === socket.userId);
    if (!user) return;
    
    // Фильтруем данные в зависимости от роли
    let usersToSend = [];
    
    if (['Владелец', 'Совладелец', 'Заместитель'].includes(user.role)) {
      usersToSend = users; // Полный доступ
    } else if (user.role === 'Администратор') {
      usersToSend = users.filter(u => 
        ['user', 'Слушатель'].includes(u.role)
      );
    } else {
      usersToSend = users.filter(u => u.id === user.id); // Только себя
    }
    
    socket.emit('users_list', usersToSend);
  });

  // Отправка сообщения
  socket.on('send_message', (data) => {
    try {
      const user = users.find(u => u.id === socket.userId);
      if (!user) return;

      // Проверяем может ли пользователь отправлять сообщения
      if (!user.permissions.includes('send_messages') && user.role !== 'user') {
        return socket.emit('message_error', 'Недостаточно прав для отправки сообщений');
      }

      const message = {
        id: Date.now(),
        username: user.username,
        displayName: user.displayName,
        text: data.text.trim(),
        timestamp: new Date().toISOString(),
        chatId: data.chatId || 'general',
        type: 'user',
        role: user.role
      };

      messages.push(message);
      io.emit('new_message', message);
      
      console.log('💬 Новое сообщение от', user.role, ':', user.username, data.text);
    } catch (error) {
      console.error('❌ Ошибка отправки сообщения:', error);
      socket.emit('message_error', 'Ошибка отправки сообщения');
    }
  });

  // Оценка пользователя
  socket.on('rate_user', (data) => {
    try {
      const rater = users.find(u => u.id === socket.userId);
      const targetUser = users.find(u => u.id === data.userId);
      
      if (!rater || !targetUser) return;
      
      // Только пользователи могут оценивать администраторов и слушателей
      if (rater.role !== 'user' || !['Администратор', 'Слушатель'].includes(targetUser.role)) {
        return socket.emit('rating_error', 'Недостаточно прав для оценки');
      }

      const rating = {
        id: Date.now(),
        raterId: rater.id,
        targetId: data.userId,
        rating: data.rating,
        timestamp: new Date().toISOString(),
        comment: data.comment || ''
      };

      ratings.push(rating);
      
      // Обновляем рейтинг пользователя
      const userRatings = ratings.filter(r => r.targetId === data.userId);
      const averageRating = userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length;
      
      targetUser.rating = averageRating;
      targetUser.ratingCount = userRatings.length;

      io.emit('users_list', users);
      
      // Уведомляем пользователя об изменении рейтинга
      if (targetUser.socketId) {
        io.to(targetUser.socketId).emit('user_rating_updated', {
          averageRating: targetUser.rating,
          ratingCount: targetUser.ratingCount
        });
      }
      
      socket.emit('rating_success', 'Оценка сохранена');
      
    } catch (error) {
      socket.emit('rating_error', 'Ошибка оценки');
    }
  });

  // Создание чата
  socket.on('create_chat', (data) => {
    try {
      const user = users.find(u => u.id === socket.userId);
      if (!user || !user.permissions.includes('manage_chats')) {
        return socket.emit('chat_error', 'Недостаточно прав для создания чата');
      }

      const chat = {
        id: Date.now(),
        name: data.name,
        participants: data.participants || [],
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        type: data.type || 'public'
      };
      
      chats.push(chat);
      io.emit('chats_list', chats);
      socket.emit('chat_created', chat);
      
    } catch (error) {
      socket.emit('chat_error', 'Ошибка создания чата');
    }
  });

  // Системное сообщение (только для владельцев)
  socket.on('send_system_message', (data) => {
    try {
      const user = users.find(u => u.id === socket.userId);
      if (!user || !['Владелец', 'Совладелец'].includes(user.role)) {
        return socket.emit('message_error', 'Недостаточно прав');
      }

      const message = {
        id: Date.now(),
        username: 'system',
        displayName: 'Система',
        text: data.text,
        timestamp: new Date().toISOString(),
        type: 'system'
      };

      messages.push(message);
      io.emit('new_message', message);
      
    } catch (error) {
      socket.emit('message_error', 'Ошибка отправки системного сообщения');
    }
  });

  // Рассылка (только для владельцев)
  socket.on('send_broadcast', (data) => {
    try {
      const user = users.find(u => u.id === socket.userId);
      if (!user || !['Владелец', 'Совладелец'].includes(user.role)) {
        return socket.emit('broadcast_error', 'Недостаточно прав для рассылки');
      }

      const broadcast = {
        id: Date.now(),
        text: data.text,
        sentBy: user.id,
        timestamp: new Date().toISOString(),
        target: data.target || 'all'
      };

      io.emit('new_broadcast', broadcast);
      socket.emit('broadcast_success', 'Рассылка отправлена');
      
    } catch (error) {
      socket.emit('broadcast_error', 'Ошибка рассылки');
    }
  });

  // Отключение
  socket.on('disconnect', () => {
    console.log('❌ Пользователь отключен:', socket.id);
    
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log('👥 Тестовые пользователи:');
  console.log('   Владелец: owner / owner123');
  console.log('   Совладелец: coowner / coowner123');
  console.log('   Заместитель: deputy / deputy123');
  console.log('   Администратор: admin / admin123');
  console.log('   Слушатель: listener / listener123');
});
