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

    // Показываем индикатор загрузки
    showChatLoading(true);
}

function showChatLoading(show) {
    const chatSection = document.getElementById('userChatSection');
    const messagesContainer = document.getElementById('userMessagesContainer');
    
    if (show) {
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="chat-loading">
                    <div class="loading-spinner"></div>
                    <div>Подключение к слушателю...</div>
                </div>
            `;
        }
    }
}

function startChatTimer() {
    clearInterval(chatTimer);
    chatStartTime = new Date();
    
    chatTimer = setInterval(() => {
        if (!chatStartTime) return;
        const now = new Date();
        const diff = Math.floor((now - chatStartTime) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        
        const durationElement = document.getElementById('chatDuration');
        if (durationElement) {
            durationElement.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
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
        timestamp: new Date().toISOString()
    };

    console.log('📤 Отправка сообщения пользователя:', message);
    
    // Добавляем сообщение сразу в интерфейс отправителя
    addMessageToUserChat(message);
    
    socket.emit('send_message', {
        chatId: activeChat.id,
        message: message
    });

    input.value = '';
    input.focus();
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
        timestamp: new Date().toISOString()
    };

    console.log('📤 Отправка сообщения слушателя:', message);
    
    // Добавляем сообщение сразу в интерфейс отправителя
    addMessageToListenerChat(message);
    
    socket.emit('send_message', {
        chatId: activeChat.id,
        message: message
    });

    input.value = '';
    input.focus();
}

function handleNewMessage(data) {
    console.log('📨 Обработка нового сообщения:', data);
    
    // Проверяем, не было ли уже обработано это сообщение
    if (messageIds.has(data.message.id)) {
        console.log('⚠️ Сообщение уже обработано, пропускаем:', data.message.id);
        return;
    }
    
    messageIds.add(data.message.id);
    
    // Обновляем активный чат если нужно
    if (activeChat && activeChat.id === data.chatId) {
        if (!activeChat.messages) activeChat.messages = [];
        activeChat.messages.push(data.message);
        
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
        
        // Обновляем счетчик сообщений
        updateMessageCount();
    }
    
    // Помечаем сообщения как прочитанные
    if (currentUser && data.message.senderId !== currentUser.id) {
        socket.emit('mark_messages_read', {
            chatId: data.chatId,
            userId: currentUser.id
        });
    }
}

function addMessageToUserChat(message, scroll = true) {
    const container = document.getElementById('userMessagesContainer');
    if (!container) return;
    
    // Очищаем приветственное сообщение или индикатор загрузки
    if (container.children.length === 1) {
        const firstChild = container.children[0];
        if (firstChild.className === 'chat-welcome' || firstChild.className === 'chat-loading') {
            container.innerHTML = '';
        }
    }
    
    const messageDiv = document.createElement('div');
    const isCurrentUser = message.senderId === currentUser.id;
    messageDiv.className = `message ${isCurrentUser ? 'own-message' : 'other-message'}`;
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="message-text">${message.text}</div>
            <div class="message-time">${new Date(message.timestamp).toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })}</div>
        </div>
    `;
    
    container.appendChild(messageDiv);
    
    if (scroll) {
        container.scrollTop = container.scrollHeight;
    }
}

function addMessageToListenerChat(message, scroll = true) {
    const container = document.getElementById('listenerMessagesContainer');
    if (!container) return;
    
    // Очищаем приветственное сообщение
    if (container.children.length === 1 && container.children[0].className === 'chat-welcome') {
        container.innerHTML = '';
    }
    
    const messageDiv = document.createElement('div');
    const isCurrentUser = message.senderId === currentUser.id;
    messageDiv.className = `message ${isCurrentUser ? 'own-message' : 'other-message'}`;
    
    const user = users.find(u => u.id === message.senderId);
    const userName = user ? (user.displayName || user.username) : 'Пользователь';
    
    messageDiv.innerHTML = `
        <div class="message-content">
            ${!isCurrentUser ? `<div class="message-sender">${userName}</div>` : ''}
            <div class="message-text">${message.text}</div>
            <div class="message-time">${new Date(message.timestamp).toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })}</div>
        </div>
    `;
    
    container.appendChild(messageDiv);
    
    if (scroll) {
        container.scrollTop = container.scrollHeight;
    }
}

function updateMessageCount() {
    if (activeChat && activeChat.messages) {
        const countElement = document.getElementById('messageCount');
        if (countElement) {
            countElement.textContent = activeChat.messages.length;
        }
    }
}

function loadUserChatMessages() {
    const container = document.getElementById('userMessagesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!activeChat || !activeChat.messages || activeChat.messages.length === 0) {
        container.innerHTML = `
            <div class="chat-welcome">
                <div class="welcome-icon">💬</div>
                <div class="welcome-title">Чат начат</div>
                <div class="welcome-subtitle">Начните общение с вашим слушателем</div>
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
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!activeChat || !activeChat.messages || activeChat.messages.length === 0) {
        container.innerHTML = `
            <div class="chat-welcome">
                <div class="welcome-icon">💬</div>
                <div class="welcome-title">Чат с пользователем</div>
                <div class="welcome-subtitle">Начните общение с пользователем</div>
            </div>
        `;
        return;
    }
    
    activeChat.messages.forEach(message => {
        addMessageToListenerChat(message, false);
    });
    
    container.scrollTop = container.scrollHeight;
}

function showChatInterface() {
    if (currentUser.role === 'user') {
        document.getElementById('listenersTab').style.display = 'none';
        document.getElementById('userChatSection').style.display = 'block';
        
        // Обновляем информацию о слушателе
        if (currentListener) {
            document.getElementById('currentListenerName').textContent = currentListener.displayName || currentListener.username;
            document.getElementById('currentListenerRating').textContent = (currentListener.rating || 0).toFixed(1);
        }
    } else if (currentUser.role === 'listener') {
        document.getElementById('listenerChatsTab').style.display = 'none';
        document.getElementById('listenerChatSection').style.display = 'block';
    }
    
    loadChatMessages();
    startChatTimer();
}

function loadChatMessages() {
    if (currentUser.role === 'user') {
        loadUserChatMessages();
    } else if (currentUser.role === 'listener') {
        loadListenerChatMessages();
    }
}

function endChat() {
    console.log('🚪 Завершение чата');
    
    if (!activeChat) return;

    if (currentUser.role === 'user') {
        // Показать модалку оценки
        showRatingModal();
    } else {
        // Для слушателя просто завершить чат
        socket.emit('end_chat', { chatId: activeChat.id });
        hideChatInterface();
    }
}

function showRatingModal() {
    document.getElementById('ratingModal').classList.add('active');
}

function closeRatingModal() {
    document.getElementById('ratingModal').classList.remove('active');
    // Сбрасываем форму
    document.querySelector('input[name="rating"]:checked')?.checked = false;
    document.getElementById('ratingComment').value = '';
}

function submitRating() {
    const rating = document.querySelector('input[name="rating"]:checked');
    const comment = document.getElementById('ratingComment').value.trim();

    if (!rating) {
        showNotification('❌ Выберите оценку!', 'error');
        return;
    }

    if (!activeChat || !currentUser || !currentListener) return;
    
    console.log('⭐ Отправка оценки:', rating.value);
    socket.emit('submit_rating', {
        listenerId: currentListener.id,
        userId: currentUser.id,
        rating: parseInt(rating.value),
        comment: comment
    });

    // Завершаем чат
    socket.emit('end_chat', { chatId: activeChat.id });
    
    closeRatingModal();
    hideChatInterface();
}

function hideChatInterface() {
    if (currentUser.role === 'user') {
        document.getElementById('userChatSection').style.display = 'none';
        document.getElementById('listenersTab').style.display = 'block';
    } else if (currentUser.role === 'listener') {
        document.getElementById('listenerChatSection').style.display = 'none';
        document.getElementById('listenerChatsTab').style.display = 'block';
    }
    
    // Останавливаем таймер
    clearInterval(chatTimer);
    
    // С
