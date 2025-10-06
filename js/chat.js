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
    messageDiv.className = `message ${isCurrentUser ? 'user-message' : 'listener-message'}`;
    
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
    messageDiv.className = `message ${isCurrentUser ? 'listener-message' : 'user-message'}`;
    
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

function loadAdminChatMessages(chat) {
    const container = document.getElementById('adminMessagesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!chat || !chat.messages || chat.messages.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div>💬 Нет сообщений</div>
                <div class="empty-state-subtitle">В этом чате пока нет сообщений</div>
            </div>
        `;
        return;
    }
    
    chat.messages.forEach(message => {
        const messageDiv = document.createElement('div');
        const user = users.find(u => u.id === message.senderId);
        const isUser = user && user.role === 'user';
        
        messageDiv.className = `message ${isUser ? 'user-message' : 'listener-message'}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-sender">${user ? (user.displayName || user.username) : 'Неизвестный'}</div>
                <div class="message-text">${message.text}</div>
                <div class="message-time">${new Date(message.timestamp).toLocaleString('ru-RU')}</div>
            </div>
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

    // Скрываем чат и показываем список слушателей
    if (currentUser.role === 'user') {
        document.getElementById('userChatSection').classList.add('hidden');
        document.getElementById('listenersTab').classList.remove('hidden');
    }
    
    // Останавливаем таймер
    clearInterval(chatTimer);
    
    // Сбрасываем переменные
    activeChat = null;
    currentListener = null;
    chatStartTime = null;
    
    showNotification('🔚 Чат завершен', 'info');
}

function submitRating() {
    if (!activeChat || !currentListener) {
        showNotification('❌ Нет активного чата для оценки!', 'error');
        return;
    }
    
    const rating = parseInt(document.querySelector('input[name="rating"]:checked')?.value);
    const comment = document.getElementById('ratingComment').value.trim();
    
    if (!rating) {
        showNotification('❌ Выберите оценку!', 'error');
        return;
    }

    socket.emit('submit_rating', {
        listenerId: currentListener.id,
        userId: currentUser.id,
        rating: rating,
        comment: comment
    });
    
    // Закрываем модальное окно оценки
    closeRatingModal();
    endChat();
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

function updateChatsUI() {
    if (!currentUser) return;

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
    }
}

// Обработчики клавиш
function initChatInputHandlers() {
    // Enter для отправки сообщения
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.id === 'userMessageInput' || activeElement.id === 'listenerMessageInput')) {
                if (currentUser.role === 'user') {
                    sendUserMessage();
                } else if (currentUser.role === 'listener') {
                    sendListenerMessage();
                }
            }
        }
    });
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    initChatInputHandlers();
});
