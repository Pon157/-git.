// Функции авторизации
function showAuthTab(tabName) {
    // Переключение табов
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });

    // Показать/скрыть формы
    document.getElementById('loginForm').classList.toggle('hidden', tabName !== 'login');
    document.getElementById('registerForm').classList.toggle('hidden', tabName !== 'register');
}

function login() {
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value.trim();

    console.log('Попытка входа:', username);

    if (!username || !password) {
        showNotification('Заполните все поля', 'error');
        return;
    }

    const btn = document.getElementById('loginBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Вход...';
    btn.disabled = true;

    if (socket && socket.connected) {
        socket.emit('login', { username, password });
        
        // Авто-сброс через 5 секунд
        setTimeout(() => {
            if (btn.disabled) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }, 5000);
    } else {
        showNotification('Нет соединения', 'error');
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function register() {
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const passwordConfirm = document.getElementById('regPasswordConfirm').value.trim();
    const displayName = document.getElementById('regDisplayName').value.trim();
    const email = document.getElementById('regEmail').value.trim();

    console.log('Попытка регистрации:', username);

    if (!username || !password || !passwordConfirm) {
        showNotification('Заполните обязательные поля', 'error');
        return;
    }

    if (password !== passwordConfirm) {
        showNotification('Пароли не совпадают', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Пароль должен быть не менее 6 символов', 'error');
        return;
    }

    const btn = document.getElementById('registerBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Регистрация...';
    btn.disabled = true;

    if (socket && socket.connected) {
        socket.emit('register', { 
            username, 
            password, 
            displayName, 
            email 
        });
        
        setTimeout(() => {
            if (btn.disabled) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }, 5000);
    } else {
        showNotification('Нет соединения', 'error');
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Enter для форм
document.addEventListener('DOMContentLoaded', function() {
    // Enter в форме входа
    document.getElementById('authPassword')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') login();
    });

    // Enter в форме регистрации  
    document.getElementById('regPasswordConfirm')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') register();
    });
});
