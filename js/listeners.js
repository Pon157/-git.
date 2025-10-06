// Функции для слушателей
function showListenerTab(tabName) {
    console.log('Переключение таба слушателя:', tabName);
    
    // Скрыть все табы
    document.querySelectorAll('.listener-tab').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Скрыть чат
    document.getElementById('listenerChatSection').style.display = 'none';
    
    // Показать выбранный таб
    const targetTab = document.getElementById(tabName + 'Tab');
    if (targetTab) {
        targetTab.style.display = 'block';
    }
    
    // Обновить навигацию
    document.querySelectorAll('.listener-nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-tab') === tabName);
    });
    
    // Загрузить данные
    if (tabName === 'chats') {
        updateListenerChatsList();
    }
}

function updateListenerChatsList() {
    const container = document.getElementById('listenerChatsList');
    if (!container) return;

    const listenerChats = chats.filter(chat => 
        chat.user2 === currentUser.id && chat.isActive
    );
    
    console.log('Активные чаты слушателя:', listenerChats.length);

    if (listenerChats.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">😴</div>
                <div class="empty-title">Нет активных чатов</div>
                <div class="empty-subtitle">Ожидайте подключения пользователей</div>
            </div>
        `;
        return;
    }

    container.innerHTML = listenerChats.map(chat => {
        const user = users.find(u => u.id === chat.user1);
        const lastMessage = chat.messages && chat.messages.length > 0 
            ? chat.messages[chat.messages.length - 1] 
            : null;

        return `
            <div class="chat-item ${activeChat && activeChat.id === chat.id ? 'active' : ''}" 
                 onclick="selectListenerChat('${chat.id}')">
                <div class="chat-header">
                    <div class="user-info">
                        <span class="avatar">${user?.avatar || '👤'}</span>
                        <div>
                            <div class="username">${user?.displayName || 'Пользователь'}</div>
                            <div class="status online">● Онлайн</div>
                        </div>
                    </div>
                    <div class="message-count">${chat.messages?.length || 0} сообщ.</div>
                </div>
                ${lastMessage ? `
                    <div class="last-message">
                        ${lastMessage.text.substring(0, 60)}${lastMessage.text.length > 60 ? '...' : ''}
                    </div>
                    <div class="message-time">
                        ${new Date(lastMessage.timestamp).toLocaleTimeString()}
                    </div>
                ` : '<div class="last-message empty">Нет сообщений</div>'}
            </div>
        `;
    }).join('');
}

function selectListenerChat(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) {
        showNotification('Чат не найден', 'error');
        return;
    }

    activeChat = chat;
    
    // Показать интерфейс чата
    document.getElementById('listenerChatsTab').style.display = 'none';
    document.getElementById('listenerChatSection').style.display = 'block';
    
    // Загрузить сообщения
    loadListenerChatMessages();
    
    showNotification('Чат открыт', 'success');
}

function loadListenerChatMessages() {
    const container = document.getElementById('listenerMessagesContainer');
    if (!container || !activeChat) return;

    container.innerHTML = '';

    if (activeChat.messages && activeChat.messages.length > 0) {
        activeChat.messages.forEach(message => {
            displayListenerMessage(message);
        });
    } else {
        container.innerHTML = '<div class="empty-state">Чат начат</div>';
    }
}

function displayListenerMessage(message) {
    const container = document.getElementById('listenerMessagesContainer');
    if (!container) return;

    const isOwn = message.senderId === currentUser.id;
    const user = users.find(u => u.id === message.senderId);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own-message' : 'other-message'}`;
    
    messageDiv.innerHTML = `
        ${!isOwn ? `<div class="message-sender">${user?.displayName || 'Пользователь'}</div>` : ''}
        <div class="message-text">${message.text}</div>
        <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// Инициализация слушателя
document.addEventListener('DOMContentLoaded', function() {
    // Показать чаты по умолчанию
    if (document.getElementById('listenerInterface').style.display === 'block') {
        showListenerTab('chats');
    }
});
