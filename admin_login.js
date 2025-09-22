// admin_login.js

const passkeyInput = document.getElementById('passkey-input');
const loginBtn = document.getElementById('login-btn');
const loginFeedback = document.getElementById('login-feedback');

// Modal elements
const customModal = document.getElementById('custom-modal');
const modalMessage = document.getElementById('modal-message');
const modalCloseBtn = document.getElementById('modal-close-btn');

/**
 * Displays a custom modal message.
 * @param {string} message The message to display in the modal.
 */
function showModal(message) {
    modalMessage.textContent = message;
    customModal.classList.remove('hidden');
    modalCloseBtn.onclick = () => customModal.classList.add('hidden');
}

// --- Event Listeners ---
loginBtn.addEventListener('click', handleLogin);
passkeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleLogin();
    }
});

// --- Functions ---

/**
 * Handles the login attempt by sending the passkey to the server.
 */
async function handleLogin() {
    const passkey = passkeyInput.value.trim();
    if (!passkey) {
        loginFeedback.textContent = "Please enter the passkey.";
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ passkey: passkey })
        });

        const data = await response.json();

        if (response.ok) {
            loginFeedback.textContent = data.message;
            loginFeedback.style.color = '#16a34a'; // Green for success

            console.log("Login successful. Attempting redirect to /admin using window.location.replace() in 1.5 seconds...");
            setTimeout(() => {
                // Use replace() to prevent going back to login page with back button
                window.location.replace('/admin');
            }, 1500); // 1.5 second delay
        } else {
            loginFeedback.textContent = data.message || "Login failed.";
            loginFeedback.style.color = '#ef4444'; // Red for error
            console.error("Login failed:", data.message);
        }
    } catch (error) {
        console.error("Login request failed:", error);
        loginFeedback.textContent = "An error occurred during login. Please ensure the Flask server is running and accessible.";
        loginFeedback.style.color = '#ef4444';
    }
}

