// Функции для работы с чатом
function startChatWithListener(listenerId) {
    const listener = users.find(u => u.id === listenerId);
    if (!listener) {
        showNotification('❌ Слушатель не найден!', 'error');
        return;
    }

    currentListener = listener;
    
    console.log('💬 Начало чата с:', listener.displayName || listener.username);
    
    // Создаем новый чат через сервер
    socket.emit('create_chat', {
        user1: currentUser.id,
        user2: listenerId
    });

    // Показываем чат
    document.getElementById('listenersTab').classList.add('hidden');
    document.getElementById('userNotificationsTab').classList.add('hidden');
    document.getElementById('userChatSection').classList.remove('hidden');
    
    document.getElementById('currentListenerRating').textContent = (listener.rating || 0).toFixed(1);
    
    // Запускаем таймер
    chatStartTime = new Date();
    startChatTimer();
}

function startChatTimer() {
    clearInterval(chatTimer);
    chatTimer = setInterval(() => {
        if (!chatStartTime) return;
        const now = new Date();
        const diff = Math.floor((now - chatStartTime) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        document.getElementById('chatDuration').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function sendUserMessage() {
    if (!activeChat) {
        showNotification('❌ Сначала выберите слушателя!', 'error');
        return;
    }
    
    const input = document.getElementById('userMessageInput');
    const text = input.value.trim();
    
    if (!text) {
        showNotification('❌ Введите сообщение!', 'error');
        return;
    }

    const message = {
        text: text,
        senderId: currentUser.id,
        timestamp: new Date()
    };

    console.log('📤 Отправка сообщения:', message);
    
    // Добавляем сообщение сразу в интерфейс отправителя
    addMessageToUserChat(message);
    
    socket.emit('send_message', {
        chatId: activeChat.id,
        message: message
    });

    input.value = '';
}

function sendListenerMessage() {
    if (!activeChat) {
        showNotification('❌ Выберите чат для общения!', 'error');
        return;
    }
    
    const input = document.getElementById('listenerMessageInput');
    const text = input.value.trim();
    
    if (!text) {
        showNotification('❌ Введите сообщение!', 'error');
        return;
    }

    const message = {
        text: text,
        senderId: currentUser.id,
        timestamp: new Date()
    };

    console.log('📤 Отправка сообщения от слушателя:', message);
    
    // Добавляем сообщение сразу в интерфейс отправителя
    addMessageToListenerChat(message);
    
    socket.emit('send_message', {
        chatId: activeChat.id,
        message: message
    });

    input.value = '';
}

function handleNewMessage(data) {
    console.log('📨 Обработка нового сообщения:', data);
    
    // Проверяем, не было ли уже обработано это сообщение
    if (messageIds.has(data.message.id)) {
        console.log('⚠️ Сообщение уже обработано, пропускаем:', data.message.id);
        return;
    }
    
    messageIds.add(data.message.id);
    
    if (activeChat && activeChat.id === data.chatId) {
        if (!activeChat.messages) activeChat.messages = [];
        activeChat.messages.push(data.message);
        
        // Обновляем счетчик сообщений
        updateMessageCount();
        
        // Отображаем сообщение у обоих участников чата
        if (currentUser.role === 'user') {
            // Если сообщение не от текущего пользователя, добавляем его
            if (data.message.senderId !== currentUser.id) {
                addMessageToUserChat(data.message);
            }
        } else if (currentUser.role === 'listener') {
            // Если сообщение не от текущего слушателя, добавляем его
            if (data.message.senderId !== currentUser.id) {
                addMessageToListenerChat(data.message);
            }
        }
    }
}

function addMessageToUserChat(message) {
    const container = document.getElementById('userMessagesContainer');
    
    // Очищаем приветственное сообщение
    if (container.children.length === 1 && container.children[0].textContent.includes('Чат начат')) {
        container.innerHTML = '';
    }
    
    const messageDiv = document.createElement('div');
    const isCurrentUser = message.senderId === currentUser.id;
    messageDiv.className = `message ${isCurrentUser ? 'user' : 'other'}`;
    messageDiv.innerHTML = `
        <div>${message.text}</div>
        <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
    `;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    
    // Обновляем счетчик сообщений
    updateMessageCount();
}

function addMessageToListenerChat(message, scroll = true) {
    const container = document.getElementById('listenerMessagesContainer');
    
    // Очищаем приветственное сообщение
    if (container.children.length === 1 && container.children[0].textContent.includes('Выберите чат')) {
        container.innerHTML = '';
    }
    
    const messageDiv = document.createElement('div');
    const isCurrentUser = message.senderId === currentUser.id;
    messageDiv.className = `message ${isCurrentUser ? 'user' : 'other'}`;
    messageDiv.innerHTML = `
        <div>${message.text}</div>
        <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
    `;
    container.appendChild(messageDiv);
    
    if (scroll) {
        container.scrollTop = container.scrollHeight;
    }
}

function updateMessageCount() {
    if (activeChat && activeChat.messages) {
        document.getElementById('messageCount').textContent = activeChat.messages.length;
    }
}

function loadUserChatMessages() {
    const container = document.getElementById('userMessagesContainer');
    container.innerHTML = '';
    
    if (!activeChat || !activeChat.messages || activeChat.messages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #7f8c8d; margin-top: 50px;">
                <div>💬 Нет сообщений</div>
                <div style="font-size: 14px; margin-top: 10px;">Начните общение с вашим слушателем</div>
            </div>
        `;
        return;
    }
    
    activeChat.messages.forEach(message => {
        addMessageToUserChat(message, false);
    });
    container.scrollTop = container.scrollHeight;
    
    updateMessageCount();
}

function loadListenerChatMessages() {
    const container = document.getElementById('listenerMessagesContainer');
    container.innerHTML = '';
    
    if (!activeChat || !activeChat.messages || activeChat.messages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #7f8c8d; margin-top: 50px;">
                <div>💬 Нет сообщений</div>
                <div style="font-size: 14px; margin-top: 10px;">Начните общение с пользователем</div>
            </div>
        `;
        return;
    }
    
    activeChat.messages.forEach(message => {
        addMessageToListenerChat(message, false);
    });
    container.scrollTop = container.scrollHeight;
}

function loadAdminChatMessages(chat) {
    const container = document.getElementById('adminMessagesContainer');
    
    container.innerHTML = '';
    
    if (!chat || !chat.messages || chat.messages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #7f8c8d; margin-top: 50px;">
                <div>💬 Нет сообщений</div>
                <div style="font-size: 14px; margin-top: 10px;">В этом чате пока нет сообщений</div>
            </div>
        `;
        return;
    }
    
    chat.messages.forEach(message => {
        const messageDiv = document.createElement('div');
        const user = users.find(u => u.id === message.senderId);
        const isUser = user && user.role === 'user';
        
        messageDiv.className = `message ${isUser ? 'user' : 'other'}`;
        messageDiv.innerHTML = `
            <div><strong>${user ? (user.displayName || user.username) : 'Неизвестный'}:</strong> ${message.text}</div>
            <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
        `;
        container.appendChild(messageDiv);
    });
    
    container.scrollTop = container.scrollHeight;
}

function endChat() {
    console.log('🚪 Завершение чата');
    if (activeChat) {
        socket.emit('end_chat', { chatId: activeChat.id });
    }

    document.getElementById('userChatSection').classList.add('hidden');
    document.getElementById('listenersTab').classList.remove('hidden');
    clearInterval(chatTimer);
    activeChat = null;
    currentListener = null;
    chatStartTime = null;
}

function updateChatsUI() {
    if (currentUser) {
        if (currentUser.role === 'user' && activeChat) {
            const updatedChat = chats.find(c => c.id === activeChat.id);
            if (updatedChat) {
                activeChat = updatedChat;
                loadUserChatMessages();
            }
        } else if (currentUser.role === 'listener') {
            updateListenerChatsList();
            if (activeChat) {
                const updatedChat = chats.find(c => c.id === activeChat.id);
                if (updatedChat) {
                    activeChat = updatedChat;
                    loadListenerChatMessages();
                }
            }
        } else if (currentUser.role === 'admin') {
            updateAdminChatsList();
        }
    }
}
