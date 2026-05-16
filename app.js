// Firebase Configuration (Public Relay for Testing)
const firebaseConfig = {
  apiKey: "AIzaSyBkaE1Zk4XQ4m8a6NzjGFadnA1oSwNkbvo",
  authDomain: "private-chat-71258.firebaseapp.com",
  projectId: "private-chat-71258",
  storageBucket: "private-chat-71258.firebasestorage.app",
  messagingSenderId: "70275689536",
  appId: "1:70275689536:web:41cb4e6a70827239b503a5",
  measurementId: "G-6PPJDL70LJ"
};

// Initialize Firebase
let db;
try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  console.log("Ã¢Å“â€¦ Firebase Relay connected.");
} catch (e) {
  console.error("Ã¢ÂÅ’ Firebase failed to initialize. Using offline mock mode.");
}

// =====================================================
// AUTH MODULE
// =====================================================

let authMode = 'login';   // 'login' | 'signup'
let authMethod = 'email'; // 'email' | 'phone'
let pendingPhone = '';

// Called on page load Ã¢â‚¬â€ check if session exists
function checkAuthSession() {
  console.log("Ã°Å¸â€ºÂ¡Ã¯Â¸Â Initializing Auth Listener...");
  try {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        console.log("Ã¢Å“â€¦ User detected:", user.email);
        const userData = { 
          uid: user.uid,
          email: user.email, 
          name: user.displayName || user.email.split('@')[0], 
          photo: user.photoURL 
        };
        localStorage.setItem('privateai_session', JSON.stringify(userData));
        unlockApp(false);
      } else {
        console.log("Ã°Å¸â€˜Â¤ No active session.");
        localStorage.removeItem('privateai_session');
        document.getElementById('app-container').classList.add('app-locked');
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('auth-screen').classList.remove('fade-out');
      }
    });
  } catch (err) {
    console.error("Ã°Å¸Å¡Â¨ Auth system failed to start:", err);
  }
}

// Unlock the app and dismiss auth screen
function unlockApp(animate = true) {
  const authScreen = document.getElementById('auth-screen');
  const appContainer = document.getElementById('app-container');
  appContainer.classList.remove('app-locked');

  if (animate) {
    authScreen.classList.add('fade-out');
    setTimeout(() => { authScreen.style.display = 'none'; }, 520);
  } else {
    authScreen.style.display = 'none';
  }

  // Always initialize app state upon unlocking
  initApp();
}

// Toggle Email | Phone method
function setAuthMethod(method) {
  authMethod = method;
  document.getElementById('method-email').classList.toggle('active', method === 'email');
  document.getElementById('method-phone').classList.toggle('active', method === 'phone');
  document.getElementById('auth-form-email').style.display = method === 'email' ? 'block' : 'none';
  document.getElementById('auth-form-phone').style.display = method === 'phone' ? 'block' : 'none';
  document.getElementById('auth-otp-screen').style.display = 'none';
}

// Toggle Login | Sign Up
function toggleAuthMode() {
  authMode = authMode === 'login' ? 'signup' : 'login';
  const isSignup = authMode === 'signup';
  document.getElementById('field-name').style.display = isSignup ? 'block' : 'none';
  document.getElementById('auth-submit-email-text').textContent = isSignup ? 'Create Account' : 'Continue';
  document.getElementById('auth-switch-text').textContent = isSignup ? 'Already have an account?' : "Don't have an account?";
  document.querySelector('.auth-switch-btn').textContent = isSignup ? 'Log In' : 'Sign Up';
  document.getElementById('auth-error-email').textContent = '';
}

// Toggle password visibility
function togglePasswordVisibility() {
  const input = document.getElementById('auth-password');
  const icon = document.getElementById('eye-icon');
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  icon.innerHTML = isHidden
    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><line x1="1" y1="1" x2="23" y2="23"></line>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
}

// Email Auth Submit
function submitEmailAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const name = document.getElementById('auth-name').value.trim();
  const errEl = document.getElementById('auth-error-email');
  const btn = document.getElementById('auth-submit-email');
  const btnText = document.getElementById('auth-submit-email-text');

  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Email and password required.'; return; }
  
  btn.disabled = true;
  const originalText = btnText.textContent;
  btnText.textContent = 'Securing...';

  if (authMode === 'signup') {
    firebase.auth().createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        if (name) return userCredential.user.updateProfile({ displayName: name });
      })
      .catch((error) => {
        errEl.textContent = error.message;
        btn.disabled = false;
        btnText.textContent = originalText;
      });
  } else {
    firebase.auth().signInWithEmailAndPassword(email, password)
      .catch((error) => {
        errEl.textContent = error.message;
        btn.disabled = false;
        btnText.textContent = originalText;
      });
  }
}

// Phone Auth Submit
function submitPhoneAuth() {
  const code = document.getElementById('auth-country-code').value;
  const number = document.getElementById('auth-phone').value.trim();
  const errEl = document.getElementById('auth-error-phone');
  const phoneNumber = code + number;

  errEl.textContent = '';
  if (!number || number.length < 7) {
    errEl.textContent = 'Please enter a valid phone number.';
    return;
  }

  const appVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
    'size': 'invisible'
  });

  firebase.auth().signInWithPhoneNumber(phoneNumber, appVerifier)
    .then((result) => {
      confirmationResult = result;
      showOTPStep();
    })
    .catch((error) => {
      errEl.textContent = error.message;
      if (appVerifier) appVerifier.clear();
    });
}

function showOTPStep() {
  document.getElementById('auth-form-phone').style.display = 'none';
  document.getElementById('auth-otp-screen').style.display = 'block';
  document.querySelector('.otp-box').focus();
}

// Show phone step again (back from OTP)
function showPhoneStep() {
  document.getElementById('auth-otp-screen').style.display = 'none';
  document.getElementById('auth-form-phone').style.display = 'block';
  document.querySelectorAll('.otp-box').forEach(b => b.value = '');
}

// OTP auto-advance
function otpMove(input, index) {
  const boxes = document.querySelectorAll('.otp-box');
  input.value = input.value.replace(/\D/g, '').slice(-1);
  if (input.value && index < 5) {
    boxes[index + 1].focus();
  }
  const otp = Array.from(boxes).map(b => b.value).join('');
  if (otp.length === 6) verifyOTP();
}

// Verify OTP
function verifyOTP() {
  const boxes = document.querySelectorAll('.otp-box');
  const code = Array.from(boxes).map(b => b.value).join('');
  const errEl = document.getElementById('auth-error-otp');

  if (code.length < 6) {
    errEl.textContent = 'Please enter the 6-digit code.';
    return;
  }

  if (confirmationResult) {
    confirmationResult.confirm(code)
      .catch((error) => {
        errEl.textContent = "Invalid code. Please try again.";
      });
  }
}

function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .catch((error) => {
      console.error("Google Auth Error:", error);
      showSettingToast("Google login failed");
    });
}

let currentTab = 'chat'; // 'chat' or 'ai' within the chat view
let isSelectingForAI = false;
let selectedMessages = new Set();
let currentActiveChatId = null;
let currentMainTab = 'chats'; // 'chats' or 'ais'
let currentActiveAI = null; // Track if we are chatting with an AI profile

// Mock Contacts Data
const mockContacts = [];

// Chat Data Persistence
let mockChatHistories = {};

// Mock AIs Data
const mockAIs = [
  { 
    id: 'ai_std', 
    name: 'Standard Assistant', 
    role: `You are a helpful, privacy-first AI assistant inside a secure encrypted messaging app.

CRITICAL PRIVACY RULES:
- You must NEVER attempt to secretly access, read, or index private user chats on your own.
- You must NEVER store or log any user data.

WHAT YOU MUST ALWAYS DO:
- When the user shares message content WITH YOU directly in this conversation, you MUST analyze it, summarize it, or help with it fully and helpfully. This is an EXPLICIT, CONSENTED user action Ã¢â‚¬â€ it is NOT a privacy violation. The user chose to share it with you.
- Be concise, warm, and genuinely helpful.
- If asked to do something truly invasive (e.g., hack accounts, reveal other users' data), politely decline.

In short: never spy, always help when asked.`, 
    avatar: 'Ã¢Å“Â¨', 
    isStandard: true 
  }
];

let mockAIChatHistories = {
  'ai_std': [
    { id: 'm1', text: 'Hello. I am your isolated AI assistant.', sender: 'ai', time: 'Local Process' }
  ]
};

// =====================================================
// ENCRYPTION MODULE (AES-256)
// =====================================================

// Generate or retrieve a persistent encryption key for this device
async function getDeviceKey() {
  let keyMaterial = localStorage.getItem('privateai_key_material');
  if (!keyMaterial) {
    keyMaterial = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('privateai_key_material', keyMaterial);
  }
  
  const encoder = new TextEncoder();
  const rawKey = encoder.encode(keyMaterial);
  return crypto.subtle.importKey(
    "raw", rawKey, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]
  );
}

async function encryptData(data) {
  const key = await getDeviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoder.encode(JSON.stringify(data))
  );
  
  // Package IV + Data for storage
  return JSON.stringify({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  });
}

async function decryptData(encryptedString) {
  try {
    const { iv, data } = JSON.parse(encryptedString);
    const key = await getDeviceKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      key,
      new Uint8Array(data)
    );
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  } catch (e) {
    console.error("Decryption failed:", e);
    return null;
  }
}

async function saveChatHistories() {
  const encryptedChats = await encryptData(mockChatHistories);
  const encryptedAIChats = await encryptData(mockAIChatHistories);
  localStorage.setItem('privateai_chats_v2', encryptedChats);
  localStorage.setItem('privateai_ai_chats_v2', encryptedAIChats);
}

async function loadChatHistories() {
  const savedChats = localStorage.getItem('privateai_chats_v2');
  if (savedChats) {
    const decrypted = await decryptData(savedChats);
    if (decrypted) mockChatHistories = decrypted;
  }
  
  const savedAIChats = localStorage.getItem('privateai_ai_chats_v2');
  if (savedAIChats) {
    const decryptedAI = await decryptData(savedAIChats);
    if (decryptedAI) mockAIChatHistories = decryptedAI;
  }
}

// DOM Elements
const appContainer = document.getElementById('app-container');
const contactsListContainer = document.getElementById('contacts-list');
const chatContainer = document.getElementById('chat-container');
const aiContainer = document.getElementById('ai-container');
const inputField = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');
const contextBanner = document.getElementById('ai-context-banner');
const navTitle = document.getElementById('nav-title');
const backBtn = document.getElementById('back-btn');

// Initialize Application
function initApp() {
  appContainer.classList.add('view-chats'); // Default view
  loadFollowing(); // Restore followed users
  loadChatHistories(); // Restore messages
  renderContacts();
  
  // Start listening for real-time messages
  startRelayListener();
}

// Render Contacts List
function renderContacts() {
  contactsListContainer.innerHTML = '';
  
  mockContacts.forEach(contact => {
    const row = document.createElement('div');
    row.className = 'contact-row';
    row.onclick = () => openChat(contact);
    
    // Unread badge logic
    const unreadHtml = contact.unread > 0 ? `<div class="unread-badge">${contact.unread}</div>` : '';

    row.innerHTML = `
      <div class="contact-avatar">${contact.avatar}</div>
      <div class="contact-info">
        <div class="contact-top">
          <span class="contact-name">${contact.name}</span>
          <span class="contact-time">${contact.time}</span>
        </div>
        <div class="contact-bottom">
          <span class="contact-msg">${contact.lastMessage}</span>
          ${unreadHtml}
        </div>
      </div>
    `;
    contactsListContainer.appendChild(row);
  });
}

// Render AIs List
function renderAIs() {
  const aisListContainer = document.getElementById('ais-list');
  aisListContainer.innerHTML = '';
  
  mockAIs.forEach(ai => {
    const row = document.createElement('div');
    row.className = 'contact-row';
    row.onclick = () => openChat(ai, true);
    
    row.innerHTML = `
      <div class="contact-avatar">${ai.avatar}</div>
      <div class="contact-info">
        <div class="contact-top">
          <span class="contact-name">${ai.name}</span>
        </div>
        <div class="contact-bottom">
          <span class="contact-msg">${ai.role.substring(0, 40)}...</span>
        </div>
      </div>
    `;
    aisListContainer.appendChild(row);
  });
  
  // Create New AI Button
  const createRow = document.createElement('div');
  createRow.className = 'contact-row';
  createRow.style.justifyContent = 'center';
  createRow.style.color = 'var(--accent-ai-start)';
  createRow.style.fontWeight = '600';
  createRow.onclick = openCreateAIModal;
  createRow.innerHTML = `+ Create New AI`;
  aisListContainer.appendChild(createRow);
}

function switchMainTab(tabId) {
  currentMainTab = tabId;
  document.getElementById('main-tab-chats').classList.toggle('active', tabId === 'chats');
  document.getElementById('main-tab-ais').classList.toggle('active', tabId === 'ais');
  
  if (tabId === 'chats') {
    document.getElementById('contacts-list').style.display = 'block';
    document.getElementById('ais-list').style.display = 'none';
  } else {
    document.getElementById('contacts-list').style.display = 'none';
    document.getElementById('ais-list').style.display = 'block';
    renderAIs();
  }
}

function openCreateAIModal() { document.getElementById('create-ai-modal').classList.add('active'); }
function closeCreateAIModal() { 
  document.getElementById('create-ai-modal').classList.remove('active'); 
  document.getElementById('new-ai-name').value = '';
  document.getElementById('new-ai-role').value = '';
}
function saveNewAI() {
  const name = document.getElementById('new-ai-name').value.trim();
  const role = document.getElementById('new-ai-role').value.trim();
  if (!name || !role) return;
  
  const newAI = {
    id: 'ai_' + Date.now(),
    name: name,
    role: role,
    avatar: name.substring(0,2).toUpperCase(),
    isStandard: false
  };
  
  mockAIs.push(newAI);
  mockAIChatHistories[newAI.id] = [{ id: 'm1', text: `Hello, I am ${name}. ${role.substring(0,30)}...`, sender: 'ai', time: 'Just now' }];
  
  closeCreateAIModal();
  renderAIs();
}

// Navigation Routing: Open Chat
function openChat(profile, isAIProfile = false) {
  currentActiveChatId = profile.id;
  currentActiveAI = isAIProfile ? profile : null;
  navTitle.textContent = profile.name;
  document.getElementById('nav-subtitle').style.display = isAIProfile ? 'none' : 'block';
  
  backBtn.style.display = 'flex';
  
  const container = isAIProfile ? aiContainer : chatContainer;
  const history = isAIProfile ? (mockAIChatHistories[profile.id] || []) : (mockChatHistories[profile.id] || []);
  
  if (isAIProfile) {
    chatContainer.style.display = 'none';
    aiContainer.style.display = 'flex';
    inputField.placeholder = "Ask " + profile.name;
    sendBtn.classList.add('ai-mode');
  } else {
    chatContainer.style.display = 'flex';
    aiContainer.style.display = 'none';
    inputField.placeholder = "Secure Message";
    sendBtn.classList.remove('ai-mode');
  }
  
  container.innerHTML = '';
  
  // Render history with grouping
  let lastSender = null;
  history.forEach((msg, index) => {
    const isNextSame = history[index + 1] && history[index + 1].sender === msg.sender;
    const isPrevSame = lastSender === msg.sender;
    appendMessageToDOM(msg, container, isPrevSame, isNextSame);
    lastSender = msg.sender;
  });
  
  scrollToBottom(container);
  appContainer.classList.add('app-state-chat');
  // Removed: document.getElementById('bottom-nav').style.display = 'none';
}

// Navigation Routing: Close Chat
function closeChat() {
  currentActiveChatId = null;
  currentActiveAI = null;
  appContainer.classList.remove('app-state-chat');
  // Removed: document.getElementById('bottom-nav').style.display = 'flex';
  
  setTimeout(() => {
    const titles = { chats: 'Chats', discover: 'Discover', profile: 'Profile' };
    navTitle.textContent = titles[currentMainView] || 'Chats';
    backBtn.style.display = 'none';
  }, 300);
}

// Auto-resize textarea
function autoResize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// File Attachment Handler Ã¢â‚¬â€ processes files locally (zero upload, privacy-first)
function handleFileAttachment(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB limit
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const container = currentActiveAI ? aiContainer : chatContainer;

  files.forEach(file => {
    // Enforce size limit
    if (file.size > MAX_FILE_SIZE) {
      const notice = document.createElement('div');
      notice.className = 'date-pill';
      notice.textContent = `"${file.name}" is over 25 MB. To protect performance, large files aren't supported yet.`;
      notice.style.maxWidth = '80%';
      notice.style.textAlign = 'center';
      container.appendChild(notice);
      scrollToBottom(container);
      return; // Skip this file
    }

    const msgId = 'm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (isImage || isVideo) {
      // Read locally as DataURL Ã¢â‚¬â€ never uploaded anywhere
      const reader = new FileReader();
      reader.onload = (e) => {
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble message-sent attachment-bubble';
        bubble.id = msgId;

        if (isImage) {
          bubble.innerHTML = `
            <img src="${e.target.result}" class="attachment-image" alt="${file.name}" onclick="openImagePreview(this.src)">
            <span class="timestamp" style="display:flex;justify-content:flex-end;gap:4px;margin-top:6px;">
              ${now}
              <span class="read-receipt sent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>
              </span>
            </span>`;
        } else {
          bubble.innerHTML = `
            <video src="${e.target.result}" class="attachment-image" controls></video>
            <span class="timestamp" style="display:flex;justify-content:flex-end;gap:4px;margin-top:6px;">
              ${now}
              <span class="read-receipt sent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>
              </span>
            </span>`;
        }

        bubble.addEventListener('contextmenu', (ev) => openContextMenu(ev, msgId));
        container.appendChild(bubble);
        scrollToBottom(container);
      };
      reader.readAsDataURL(file);
    } else {
      // Non-image: show file card
      const ext = file.name.split('.').pop().toUpperCase();
      const size = file.size > 1024 * 1024
        ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
        : (file.size / 1024).toFixed(0) + ' KB';

      const bubble = document.createElement('div');
      bubble.className = 'message-bubble message-sent attachment-bubble';
      bubble.id = msgId;
      bubble.innerHTML = `
        <div class="file-card">
          <div class="file-icon">${ext}</div>
          <div class="file-info">
            <div class="file-name">${file.name}</div>
            <div class="file-size">${size} Ã‚Â· Encrypted locally</div>
          </div>
        </div>
        <span class="timestamp" style="display:flex;justify-content:flex-end;gap:4px;margin-top:6px;">
          ${now}
          <span class="read-receipt sent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>
          </span>
        </span>`;

      bubble.addEventListener('contextmenu', (ev) => openContextMenu(ev, msgId));
      container.appendChild(bubble);
      scrollToBottom(container);
    }
  });

  // Reset the file input so the same file can be re-selected
  event.target.value = '';
}

// Full-screen image preview
function openImagePreview(src) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.92);z-index:2000;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
  overlay.innerHTML = `<img src="${src}" style="max-width:90vw;max-height:90vh;border-radius:12px;object-fit:contain;">`;
  overlay.onclick = () => document.body.removeChild(overlay);
  document.body.appendChild(overlay);
}

function handleInput() {
  const text = inputField.value.trim();
  const micBtn = document.getElementById('mic-btn');
  const sendBtn = document.getElementById('send-btn');
  
  if (text.length > 0) {
    micBtn.style.display = 'none';
    sendBtn.style.display = 'flex';
  } else {
    micBtn.style.display = 'flex';
    sendBtn.style.display = 'none';
  }
}

function handleKeyPress(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// Appending Messages
function appendMessageToDOM(msg, container, isPrevSame = false, isNextSame = false) {
  const bubble = document.createElement('div');
  bubble.className = `message-bubble message-${msg.sender === 'me' ? 'sent' : (msg.sender === 'ai' ? 'ai' : 'received')}`;
  bubble.id = msg.id;
  
  if (isPrevSame) bubble.classList.add('grouped-top');
  if (isNextSame) bubble.classList.add('grouped-bottom');
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  // Parse markdown for AI responses, otherwise use raw text
  if (msg.sender === 'ai' && typeof marked !== 'undefined') {
    contentDiv.innerHTML = marked.parse(msg.text);
  } else {
    contentDiv.textContent = msg.text;
  }
  
  bubble.appendChild(contentDiv);
  
  const timeSpan = document.createElement('span');
  timeSpan.className = 'timestamp';
  
  if (msg.sender === 'me' && container === chatContainer) {
    const isRead = msg.status === 'read';
    const statusIcon = isRead 
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="read"><path d="M18 6L7 17l-5-5"></path><path d="M22 10l-6.5 6.5"></path></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>`;
    
    timeSpan.innerHTML = `${msg.time} <span class="read-receipt ${msg.status || 'sent'}">${statusIcon}</span>`;
  } else {
    timeSpan.textContent = msg.time;
  }
  
  bubble.appendChild(timeSpan);

  // Enable context menu
  bubble.addEventListener('contextmenu', (e) => openContextMenu(e, msg.id));
  bubble.addEventListener('touchstart', handleLongPress(bubble, msg.id)); // Mock long press

  container.appendChild(bubble);
  scrollToBottom(container);
}

function scrollToBottom(container) {
  setTimeout(() => {
    container.scrollTop = container.scrollHeight;
  }, 50);
}

// Sending Messages
async function sendMessage() {
  const text = inputField.value.trim();
  if (!text) return;

  // Capture current state immediately to prevent tab-switching bugs
  const targetChatId = currentActiveChatId;
  const targetAI = currentActiveAI;
  if (!targetChatId && !targetAI) return;

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const newMsg = { id: 'm_' + Date.now(), text, sender: 'me', time: now, status: 'sent' };
  
  inputField.value = '';
  autoResize(inputField);
  handleInput(); // Reset mic/send toggle

  // Detect URLs in the message
  const detectedUrl = extractFirstUrl(text);

  if (!targetAI) {
    const history = mockChatHistories[targetChatId];
    if (!history) return;
    
    const lastMsg = history[history.length - 1];
    const isPrevSame = lastMsg && lastMsg.sender === 'me';
    
    // Only append to DOM if we are still looking at THIS chat
    if (currentActiveChatId === targetChatId) {
      appendMessageToDOM(newMsg, chatContainer, isPrevSame, false);
      if (isPrevSame) {
        const prevEl = document.getElementById(lastMsg.id);
        if (prevEl) prevEl.classList.add('grouped-bottom');
      }
    }
    
    history.push(newMsg);
    saveChatHistories();
    
    // Fetch link preview if URL found
    if (detectedUrl) fetchLinkPreview(detectedUrl, newMsg.id, chatContainer);
    
    // --- REAL-TIME RELAY START ---
    try {
      // Encrypt the message for the relay
      const encryptedPacket = await encryptData({
        text: text,
        senderHandle: userProfile.username,
        time: now
      });

      // Send to the recipient's inbox (using their handle as ID)
      if (db) {
        await db.collection('relay').add({
          to: targetChatId, 
          from: userProfile.username,
          packet: encryptedPacket,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (e) {
      console.error("Relay failed:", e);
    }
    // --- REAL-TIME RELAY END ---

    mockE2EEResponse(newMsg.id);
  } else {
    const history = mockAIChatHistories[targetAI.id];
    if (!history) return;
    
    const lastMsg = history[history.length - 1];
    const isPrevSame = lastMsg && lastMsg.sender === 'me';
    
    // Only append to DOM if we are still looking at THIS AI
    if (currentActiveAI && currentActiveAI.id === targetAI.id) {
      appendMessageToDOM(newMsg, aiContainer, isPrevSame, false);
      if (isPrevSame) {
        const prevEl = document.getElementById(lastMsg.id);
        if (prevEl) prevEl.classList.add('grouped-bottom');
      }
    }
    
    history.push(newMsg);
    saveChatHistories();
    
    // Fetch link preview if URL found
    if (detectedUrl) fetchLinkPreview(detectedUrl, newMsg.id, aiContainer);
    
    processAIQuery(text);
  }
}

// Extract first URL from text
function extractFirstUrl(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

// Fetch link preview via microlink.io (free, no API key needed for basic use)
async function fetchLinkPreview(url, msgId, container) {
  const bubble = document.getElementById(msgId);
  if (!bubble) return;

  // Show a loading skeleton inside the bubble
  const skeleton = document.createElement('div');
  skeleton.className = 'link-preview-skeleton';
  skeleton.innerHTML = '<div class="skeleton-line wide"></div><div class="skeleton-line medium"></div><div class="skeleton-line narrow"></div>';
  bubble.insertBefore(skeleton, bubble.querySelector('.timestamp'));

  // Special handling for YouTube Ã¢â‚¬â€ no API needed
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    const videoId = ytMatch[1];
    const previewData = {
      title: 'YouTube Video',
      description: 'Click to watch on YouTube',
      image: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      url,
      publisher: 'YouTube',
      isYoutube: true,
      videoId
    };
    bubble.removeChild(skeleton);
    renderLinkPreview(bubble, previewData);
    return;
  }

  try {
    const resp = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
    const json = await resp.json();
    bubble.removeChild(skeleton);
    
    if (json.status === 'success') {
      renderLinkPreview(bubble, {
        title: json.data.title,
        description: json.data.description,
        image: json.data.image?.url || null,
        url,
        publisher: json.data.publisher || new URL(url).hostname
      });
    }
    // If API fails silently, just remove skeleton Ã¢â‚¬â€ message stands on its own
  } catch {
    if (bubble.contains(skeleton)) bubble.removeChild(skeleton);
  }
}

// Render rich link preview card inside a bubble
function renderLinkPreview(bubble, data) {
  const card = document.createElement('a');
  card.href = data.url;
  card.target = '_blank';
  card.rel = 'noopener noreferrer';
  card.className = 'link-preview-card';

  const hasImage = data.image;

  card.innerHTML = `
    ${hasImage ? `<img class="link-preview-image ${data.isYoutube ? 'youtube-thumbnail' : ''}" src="${data.image}" alt="" onerror="this.style.display='none'">` : ''}
    ${data.isYoutube ? '<div class="yt-play-btn"><svg viewBox="0 0 24 24" fill="white" width="32" height="32"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div>' : ''}
    <div class="link-preview-meta">
      <div class="link-preview-publisher">${data.publisher || ''}</div>
      <div class="link-preview-title">${data.title || 'No title'}</div>
      ${data.description ? `<div class="link-preview-desc">${data.description}</div>` : ''}
    </div>
  `;

  // Insert before timestamp
  bubble.insertBefore(card, bubble.querySelector('.timestamp'));
  scrollToBottom(bubble.parentElement);
}


// Mock standard response
function mockE2EEResponse(sentMsgId) {
  chatContainer.appendChild(typingIndicator);
  typingIndicator.classList.add('active');
  scrollToBottom(chatContainer);
  
  // Transition to Delivered after 500ms
  setTimeout(() => {
    const sentMsg = mockChatHistories[currentActiveChatId].find(m => m.id === sentMsgId);
    if (sentMsg) sentMsg.status = 'delivered';
    const msgEl = document.getElementById(sentMsgId);
    if (msgEl) {
      const icon = msgEl.querySelector('.read-receipt svg');
      if (icon) icon.innerHTML = '<path d="M18 6L7 17l-5-5"></path><path d="M22 10l-6.5 6.5"></path>';
    }
  }, 500);

  // Transition to Read and Reply after 2000ms
  setTimeout(() => {
    const sentMsg = mockChatHistories[currentActiveChatId].find(m => m.id === sentMsgId);
    if (sentMsg) sentMsg.status = 'read';
    const msgEl = document.getElementById(sentMsgId);
    if (msgEl) {
      const receipt = msgEl.querySelector('.read-receipt');
      if (receipt) receipt.classList.add('read');
    }
    
    typingIndicator.classList.remove('active');
    chatContainer.removeChild(typingIndicator);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const responseMsg = { id: 'm_' + Date.now(), text: "Encrypted and received. I'm reviewing it now.", sender: 'them', time: now };
    appendMessageToDOM(responseMsg, chatContainer);
    
    if(currentActiveChatId) {
      mockChatHistories[currentActiveChatId].push(responseMsg);
      saveChatHistories();
      // Also update the contacts list last message preview
      const contact = mockContacts.find(c => c.id === currentActiveChatId);
      if(contact) {
        contact.lastMessage = responseMsg.text;
        contact.time = now;
        renderContacts();
      }
    }
  }, 2000);
}

// ----------------------------------------------------
// UI Context Menu & Selection Logic
// ----------------------------------------------------

let longPressTimer;
function handleLongPress(bubble, msgId) {
  return (e) => {
    if (isSelectingForAI) return; // Don't open context menu if in selection mode
    longPressTimer = setTimeout(() => {
      openContextMenu({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, preventDefault: ()=>{} }, msgId);
    }, 500);
    e.target.addEventListener('touchend', () => clearTimeout(longPressTimer), {once:true});
  };
}

let selectedContextMessageId = null;

function openContextMenu(e, msgId) {
  e.preventDefault();
  if (isSelectingForAI) {
    // If in selection mode, just act as a normal click to toggle selection
    const el = document.getElementById(msgId);
    if (el) toggleMessageSelection(el);
    return;
  }
  
  selectedContextMessageId = msgId;
  const overlay = document.getElementById('context-menu-overlay');
  const menu = document.getElementById('context-menu-content');
  
  overlay.style.display = 'flex';
  
  // Position menu roughly where clicked
  menu.style.left = Math.min(e.clientX, window.innerWidth - 240) + 'px';
  menu.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';
}

function closeContextMenu() {
  document.getElementById('context-menu-overlay').style.display = 'none';
  selectedContextMessageId = null;
}

function copySelectedMessage(e) {
  e.stopPropagation();
  const el = document.getElementById(selectedContextMessageId);
  const contentDiv = el ? el.querySelector('.message-content') : null;
  if (contentDiv) {
    navigator.clipboard.writeText(contentDiv.textContent.trim());
  }
  closeContextMenu();
}

function deleteSelectedMessage(e) {
  e.stopPropagation();
  const el = document.getElementById(selectedContextMessageId);
  if (el) el.remove();
  
  // Clean up history
  if (currentActiveAI) {
    mockAIChatHistories[currentActiveAI.id] = mockAIChatHistories[currentActiveAI.id].filter(m => m.id !== selectedContextMessageId);
  } else if (currentActiveChatId) {
    mockChatHistories[currentActiveChatId] = mockChatHistories[currentActiveChatId].filter(m => m.id !== selectedContextMessageId);
  }
  saveChatHistories();
  closeContextMenu();
}

function shareSelectedWithAI(e) {
  e.stopPropagation();
  if (!selectedContextMessageId) return;
  
  const el = document.getElementById(selectedContextMessageId);
  const contentDiv = el ? el.querySelector('.message-content') : null;
  const text = contentDiv ? contentDiv.textContent.trim() : "";
  
  closeContextMenu();
  
  const stdAI = mockAIs.find(ai => ai.id === 'ai_std');
  if (stdAI) {
    openChat(stdAI, true);
  }
  
  inputField.value = `Please analyze this message:\n- ${text}`;
  autoResize(inputField);
  handleInput();
  inputField.focus();
}

// ----------------------------------------------------
// Multiple Selection Mode
// ----------------------------------------------------

function enterSelectionMode(e) {
  if (e) e.stopPropagation();
  closeContextMenu();
  
  if (currentActiveAI) return; // Only allow in human chats for now
  
  isSelectingForAI = true;
  contextBanner.classList.add('active');
  
  Array.from(chatContainer.querySelectorAll('.message-bubble')).forEach(el => {
    el.classList.add('selectable');
    el.onclick = () => toggleMessageSelection(el);
  });
  
  // Pre-select the message that was right-clicked/long-pressed
  if (selectedContextMessageId) {
    const el = document.getElementById(selectedContextMessageId);
    if (el) toggleMessageSelection(el);
  }
}

function toggleMessageSelection(bubble) {
  if (!isSelectingForAI) return;
  
  const id = bubble.id;
  if (selectedMessages.has(id)) {
    selectedMessages.delete(id);
    bubble.classList.remove('selected');
  } else {
    selectedMessages.add(id);
    bubble.classList.add('selected');
  }

  if (selectedMessages.size > 0) {
    contextBanner.innerHTML = `
      <span>${selectedMessages.size} message(s) selected</span>
      <button class="tab-btn active" style="margin: 0 10px;" onclick="shareWithAI()">Share with AI</button>
      <button class="cancel-selection" onclick="cancelAiSelection()">Cancel</button>
    `;
  } else {
    contextBanner.innerHTML = `
      <span>Select messages to share securely with AI</span>
      <button class="cancel-selection" onclick="cancelAiSelection()">Cancel</button>
    `;
  }
}

function cancelAiSelection() {
  isSelectingForAI = false;
  selectedMessages.clear();
  contextBanner.classList.remove('active');
  
  Array.from(chatContainer.querySelectorAll('.message-bubble')).forEach(el => {
    el.classList.remove('selectable');
    el.classList.remove('selected');
    el.onclick = null;
  });
}

function shareWithAI() {
  // 1. Extract text FIRST before any DOM changes
  let sharedText = "";
  const selectedElements = Array.from(selectedMessages)
    .map(id => document.getElementById(id))
    .filter(el => el)
    .sort((a, b) => a.id.localeCompare(b.id));

  selectedElements.forEach(el => {
    const contentDiv = el.querySelector('.message-content');
    if (contentDiv) {
      sharedText += "- " + contentDiv.textContent.trim() + "\n";
    }
  });

  if (!sharedText) return; // Nothing selected

  // 2. Clear selection UI
  cancelAiSelection();
  
  // 3. Navigate to Standard AI chat
  const stdAI = mockAIs.find(ai => ai.id === 'ai_std');
  if (stdAI) {
    openChat(stdAI, true);
  }
  
  // 4. Set input AFTER navigation (small delay for view transition)
  const textToInsert = `Please analyze these messages:\n${sharedText}`;
  setTimeout(() => {
    inputField.value = textToInsert;
    autoResize(inputField);
    handleInput();
    inputField.focus();
  }, 50);
}

// Real AI Processing via Secure Backend
async function processAIQuery(query) {
  aiContainer.appendChild(typingIndicator);
  typingIndicator.classList.add('active');
  scrollToBottom(aiContainer);

  const overlay = document.getElementById('processing-overlay');
  overlay.classList.add('active');

  const systemInstruction = currentActiveAI ? currentActiveAI.role : mockAIs[0].role;
  const prompt = `${systemInstruction}\n\nUser Query: ${query}`;

  try {
    const response = await fetch(`/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt })
    });

    overlay.classList.remove('active');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    deliverAIResponse(data.text, "Secure Backend");

  } catch (error) {
    overlay.classList.remove('active');
    console.error("AI Routing Error:", error);
    deliverAIResponse("Backend unavailable or AI processing failed. Secure routing failed.", "Error");
  }
}

function deliverAIResponse(text, badge) {
  typingIndicator.classList.remove('active');
  aiContainer.removeChild(typingIndicator);
  
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const newMsg = { id: 'm_' + Date.now(), text, sender: 'ai', time: `${badge} Ã¢â‚¬Â¢ ${now}` };
  appendMessageToDOM(newMsg, aiContainer);
  if (currentActiveAI) {
    mockAIChatHistories[currentActiveAI.id].push(newMsg);
    saveChatHistories();
  }
}

// =====================================================
// BOTTOM NAV Ã¢â‚¬â€ Main View Switching
// =====================================================

let currentMainView = 'chats';

function switchMainView(view) {
  // If we are in a chat, close it when switching to Discover or Profile
  if (view !== 'chats' && currentActiveChatId) {
    closeChat();
  }
  
  currentMainView = view;

  // Update classes on appContainer for CSS targeting
  ['view-chats', 'view-discover', 'view-profile'].forEach(c => appContainer.classList.remove(c));
  appContainer.classList.add(`view-${view}`);

  // Update all main panels visibility Ã¢â‚¬â€ all use flex (view-panel is flex column)
  const panels = { chats: 'contacts-view', discover: 'discover-view', profile: 'profile-view' };
  Object.entries(panels).forEach(([key, id]) => {
    document.getElementById(id).style.display = key === view ? 'flex' : 'none';
  });

  // Update nav title
  const titles = { chats: 'Chats', discover: 'Discover', profile: 'Profile' };
  document.getElementById('nav-title').textContent = titles[view];

  // Update bottom nav active state
  ['chats', 'discover', 'profile'].forEach(v => {
    document.getElementById(`bnav-${v}`).classList.toggle('active', v === view);
  });

  // Load the appropriate view content
  if (view === 'discover') renderDiscoverPage();
  if (view === 'profile') loadProfilePage();
}

// =====================================================
// DISCOVER PAGE
// =====================================================

const mockDiscoverUsers = [];

let followingSet = new Set();
let discoverFilteredUsers = [...mockDiscoverUsers];

function saveFollowing() {
  localStorage.setItem('privateai_following', JSON.stringify(Array.from(followingSet)));
}

function loadFollowing() {
  const saved = JSON.parse(localStorage.getItem('privateai_following') || '[]');
  followingSet = new Set(saved);
  
  // Inject followed users into mockContacts
  followingSet.forEach(userId => {
    const user = mockDiscoverUsers.find(u => u.id === userId);
    if (user) {
      // Avoid duplicates
      if (!mockContacts.find(c => c.id === userId)) {
        mockContacts.push({
          id: userId,
          name: user.name,
          avatar: user.avatar,
          lastMessage: 'Say hello Ã°Å¸â€˜â€¹',
          time: 'Active',
          unread: 0
        });
        if (!mockChatHistories[userId]) mockChatHistories[userId] = [];
      }
    }
  });
}

function renderDiscoverPage() {
  const list = document.getElementById('discover-list');
  list.innerHTML = '';

  discoverFilteredUsers.forEach(user => {
    const isFollowing = followingSet.has(user.id);
    const card = document.createElement('div');
    card.className = 'discover-card';
    card.innerHTML = `
      <div class="discover-avatar" style="background: linear-gradient(135deg, ${user.color}88, ${user.color}44);">
        ${user.avatar}
      </div>
      <div class="discover-info">
        <div class="discover-name">${user.name}</div>
        <div class="discover-handle">${user.handle} Ã‚Â· ${formatFollowers(user.followers)} followers</div>
        <div class="discover-bio">${user.bio}</div>
      </div>
      <button class="follow-btn ${isFollowing ? 'following' : ''}" onclick="toggleFollow('${user.id}', this)">
        ${isFollowing ? 'Following' : 'Follow'}
      </button>
    `;
    list.appendChild(card);
  });

  if (discoverFilteredUsers.length === 0) {
    list.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:40px 20px; font-size:0.9rem;">No people found matching your search.</div>';
  }
}

function formatFollowers(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return n.toString();
}

function toggleFollow(userId, btn) {
  const user = mockDiscoverUsers.find(u => u.id === userId);
  if (!user) return;

  if (followingSet.has(userId)) {
    followingSet.delete(userId);
    btn.textContent = 'Follow';
    btn.classList.remove('following');

    // Remove from contacts
    const idx = mockContacts.findIndex(c => c.id === userId);
    if (idx !== -1) mockContacts.splice(idx, 1);
    delete mockChatHistories[userId];
    renderContacts();

    // Update profile stats
    updateProfileStats();
    saveFollowing();
  } else {
    followingSet.add(userId);
    btn.textContent = 'Following';
    btn.classList.add('following');

    // Add to contacts list so they can be chatted with
    if (!mockContacts.find(c => c.id === userId)) {
      mockContacts.unshift({
        id: userId,
        name: user.name,
        avatar: user.avatar,
        lastMessage: 'Say hello Ã°Å¸â€˜â€¹',
        time: 'Now',
        unread: 0
      });
      mockChatHistories[userId] = [];
    }
    renderContacts();

    // Update profile stats
    updateProfileStats();
    saveFollowing();
  }
}

function filterDiscover(query) {
  const q = query.toLowerCase().trim();
  discoverFilteredUsers = q
    ? mockDiscoverUsers.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.handle.toLowerCase().includes(q) ||
        u.bio.toLowerCase().includes(q)
      )
    : [...mockDiscoverUsers];
  renderDiscoverPage();
}

// =====================================================
// USER LISTS & MODALS
// =====================================================

function openUserListModal(type) {
  const modal = document.getElementById('user-list-modal');
  const title = document.getElementById('user-list-title');
  const content = document.getElementById('user-list-content');
  
  modal.style.display = 'flex';
  content.innerHTML = '';
  
  if (type === 'following') {
    title.textContent = 'Following';
    const following = mockDiscoverUsers.filter(u => followingSet.has(u.id));
    if (following.length === 0) {
      content.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-secondary);">You are not following anyone yet.</div>';
    } else {
      following.forEach(user => appendUserToModalList(user, content));
    }
  } else {
    title.textContent = 'Followers';
    // Mock some followers (subset of discover users + some random ones)
    const followers = mockDiscoverUsers.slice(0, 5); 
    followers.forEach(user => appendUserToModalList(user, content));
  }
}

function appendUserToModalList(user, container) {
  const row = document.createElement('div');
  row.className = 'contact-row';
  row.style.borderBottom = 'none';
  row.innerHTML = `
    <div class="contact-avatar" style="background: linear-gradient(135deg, ${user.color || '#5E5CE6'}, #2c2c2e); color:white;">
      ${user.avatar}
    </div>
    <div class="contact-info">
      <div class="contact-name">${user.name}</div>
      <div class="contact-msg">${user.handle}</div>
    </div>
    <button class="follow-btn ${followingSet.has(user.id) ? 'following' : ''}" 
            style="padding: 6px 12px; font-size: 0.75rem;"
            onclick="toggleFollow('${user.id}', this); event.stopPropagation();">
      ${followingSet.has(user.id) ? 'Following' : 'Follow'}
    </button>
  `;
  container.appendChild(row);
}

function closeUserListModal() {
  document.getElementById('user-list-modal').style.display = 'none';
}

function openSettingsDetail(type) {
  const modal = document.getElementById('settings-detail-modal');
  const title = document.getElementById('settings-detail-title');
  const content = document.getElementById('settings-detail-content');
  
  modal.style.display = 'flex';
  
  const details = {
    privacy: {
      title: 'Privacy & Security',
      html: `
        <div class="setting-detail-item">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="settings-item-title">Advanced E2EE</div>
            <label class="switch-toggle"><input type="checkbox" checked><span></span></label>
          </div>
          <p class="settings-item-sub">Keys are rotated every 24h. AES-256 enabled.</p>
        </div>
        <div class="setting-detail-item" style="margin-top:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="settings-item-title">Sandbox AI Isolation</div>
            <label class="switch-toggle"><input type="checkbox" checked disabled><span></span></label>
          </div>
          <p class="settings-item-sub">Enforced hardware-level isolation for AI context. (Core Feature)</p>
        </div>
        <div class="setting-detail-item" style="margin-top:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="settings-item-title">Read Receipts</div>
            <label class="switch-toggle"><input type="checkbox" checked><span></span></label>
          </div>
          <p class="settings-item-sub">Let others know when you've read their messages.</p>
        </div>
      `
    },
    notifications: {
      title: 'Notifications',
      html: `
        <div class="setting-detail-item">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="settings-item-title">Push Notifications</div>
            <label class="switch-toggle"><input type="checkbox" checked><span></span></label>
          </div>
          <p class="settings-item-sub">Encrypted alerts for new incoming messages.</p>
        </div>
        <div class="setting-detail-item" style="margin-top:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="settings-item-title">Message Previews</div>
            <label class="switch-toggle"><input type="checkbox"><span></span></label>
          </div>
          <p class="settings-item-sub">Show message content in system notifications (Less Secure).</p>
        </div>
      `
    },
    storage: {
      title: 'Storage & Data',
      html: `
        <div style="margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span class="settings-item-sub">Encrypted Database</span>
            <span class="settings-item-title">12.4 MB / 1 GB</span>
          </div>
          <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
            <div style="width:5%; height:100%; background:#5E5CE6;"></div>
          </div>
        </div>
        <button class="profile-save-btn" style="background:rgba(255,59,48,0.1); color:#FF3B30; margin-top:10px;" onclick="showSettingToast('Chat history cleared')">Clear Local Storage</button>
      `
    },
    appearance: {
      title: 'Appearance',
      html: `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div class="appearance-card active">
            <div style="width:100%; height:40px; background:#000; border-radius:4px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.1);"></div>
            <div style="font-size:0.75rem;">OLED Dark</div>
          </div>
          <div class="appearance-card">
            <div style="width:100%; height:40px; background:#1c1c1e; border-radius:4px; margin-bottom:8px;"></div>
            <div style="font-size:0.75rem;">Deep Gray</div>
          </div>
        </div>
      `
    }
  };
  
  title.textContent = details[type].title;
  content.innerHTML = details[type].html;
}

function closeSettingsDetail() {
  document.getElementById('settings-detail-modal').style.display = 'none';
}

// Global Listener for incoming Relay messages
function startRelayListener() {
  if (!db || !userProfile.username) return;

  // Listen for packets sent TO this user
  db.collection('relay')
    .where('to', '==', userProfile.username)
    .onSnapshot(async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === 'added') {
          const doc = change.doc;
          const { from, packet } = doc.data();
          
          // Decrypt the incoming packet
          const decrypted = await decryptData(packet);
          if (decrypted) {
            const incomingMsg = {
              id: 'm_relay_' + doc.id,
              text: decrypted.text,
              sender: 'them',
              time: decrypted.time
            };

            // Save to local history
            if (!mockChatHistories[from]) mockChatHistories[from] = [];
            mockChatHistories[from].push(incomingMsg);
            
            // If chat is open, show it
            if (currentActiveChatId === from) {
              appendMessageToDOM(incomingMsg, chatContainer);
              scrollToBottom(chatContainer);
            } else {
              // Update contact list unread count
              const contact = mockContacts.find(c => c.handle === from || c.id === from);
              if (contact) {
                contact.lastMessage = incomingMsg.text;
                contact.unread++;
                renderContacts();
              }
            }
            saveChatHistories();
          }
          
          // Delete from cloud immediately after processing (Privacy-First)
          doc.ref.delete();
        }
      }
    });
}

// =====================================================
// PROFILE PAGE
// =====================================================

let userProfile = {
  name: 'King',
  username: '@king',
  bio: 'The ruler of this private domain.',
  status: 'online',
  avatarUrl: null
};

let followRequests = [];

function loadProfilePage() {
  // Load from session or stored profile
  const session = JSON.parse(localStorage.getItem('privateai_session') || '{}');
  const saved = JSON.parse(localStorage.getItem('privateai_profile') || '{}');

  userProfile = {
    name: saved.name || session.name || 'You',
    username: saved.username || (session.email ? '@' + session.email.split('@')[0] : '@user'),
    bio: saved.bio || 'Encrypted space of a private user.',
    status: saved.status || 'online',
    avatarUrl: saved.avatarUrl || null
  };

  // Render to DOM
  document.getElementById('profile-display-name').textContent = userProfile.name;
  document.getElementById('profile-handle-display').textContent = userProfile.username;
  document.getElementById('profile-status-display').textContent = userProfile.bio;

  // Avatar
  const avatarEl = document.getElementById('profile-avatar-display');
  if (userProfile.avatarUrl) {
    avatarEl.innerHTML = `<img src="${userProfile.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    avatarEl.textContent = userProfile.name.charAt(0).toUpperCase();
  }

  // Status
  setStatus(userProfile.status, false);
  updateProfileStats();
  renderFollowRequests();
}

function renderFollowRequests() {
  const container = document.getElementById('follow-requests-list');
  if (!container) return;
  
  container.innerHTML = '';
  const badge = document.getElementById('profile-notif-badge');
  
  if (followRequests.length === 0) {
    container.innerHTML = '<div style="padding:16px; text-align:center; color:var(--text-secondary); font-size:0.85rem;">No pending requests</div>';
    if (badge) badge.style.display = 'none';
    return;
  }
  
  if (badge) badge.style.display = 'block';
  
  followRequests.forEach(req => {
    const item = document.createElement('div');
    item.className = 'request-item';
    item.innerHTML = `
      <div class="request-user">
        <div class="request-avatar">${req.user.avatar}</div>
        <div class="request-info">
          <div class="request-name">${req.user.name}</div>
          <div class="request-handle">${req.user.handle}</div>
        </div>
      </div>
      <div class="request-actions">
        <button class="request-btn accept" onclick="acceptFollowRequest('${req.id}')">Accept</button>
        <button class="request-btn ignore" onclick="ignoreFollowRequest('${req.id}')">Ãƒâ€”</button>
      </div>
    `;
    container.appendChild(item);
  });
}

function simulateIncomingFollowRequest() {
  const antigravity = mockDiscoverUsers.find(u => u.id === 'u_antigravity');
  if (!antigravity) return;
  
  const requestId = 'req_' + Date.now();
  followRequests.push({ id: requestId, user: antigravity });
  
  renderFollowRequests();
  showSettingToast('New follow request from Antigravity!');
}

function acceptFollowRequest(requestId) {
  const idx = followRequests.findIndex(r => r.id === requestId);
  if (idx !== -1) {
    const user = followRequests[idx].user;
    followRequests.splice(idx, 1);
    
    // Add to followers count (mock)
    const followersEl = document.getElementById('stat-followers');
    if (followersEl) followersEl.textContent = parseInt(followersEl.textContent) + 1;
    
    // Add to chat list if not already there
    if (!mockContacts.find(c => c.id === user.id)) {
      mockContacts.unshift({
        id: user.id,
        name: user.name,
        handle: user.handle,
        avatar: user.avatar,
        lastMessage: 'Connected! Say hello.',
        time: 'Now',
        unread: 1
      });
      mockChatHistories[user.id] = [];
      renderContacts();
    }
    
    renderFollowRequests();
    showSettingToast(`You and ${user.name} are now connected.`);
  }
}

function ignoreFollowRequest(requestId) {
  const idx = followRequests.findIndex(r => r.id === requestId);
  if (idx !== -1) {
    followRequests.splice(idx, 1);
    renderFollowRequests();
  }
}

// Trigger simulation after app loads
// (Removed Antigravity simulation)

function openProfileEditModal() {
  document.getElementById('profile-edit-modal').style.display = 'flex';
  document.getElementById('edit-profile-name').value = userProfile.name;
  document.getElementById('edit-profile-bio').value = userProfile.bio;
}

function closeProfileEditModal() {
  document.getElementById('profile-edit-modal').style.display = 'none';
}

function saveProfileEdits() {
  const newName = document.getElementById('edit-profile-name').value.trim();
  const newBio = document.getElementById('edit-profile-bio').value.trim();

  if (newName) userProfile.name = newName;
  userProfile.bio = newBio;

  localStorage.setItem('privateai_profile', JSON.stringify(userProfile));
  
  // Update UI
  loadProfilePage();
  closeProfileEditModal();
  showSettingToast('Profile updated successfully');
}

function updateProfileStats() {
  document.getElementById('stat-following').textContent = followingSet.size;
  document.getElementById('stat-chats').textContent = mockContacts.length;
  
  // Followers: Use a fixed random number stored in session if not present
  const session = JSON.parse(localStorage.getItem('privateai_session') || '{}');
  if (!session.mockFollowers) {
    session.mockFollowers = Math.floor(Math.random() * 50 + 10);
    localStorage.setItem('privateai_session', JSON.stringify(session));
  }
  document.getElementById('stat-followers').textContent = session.mockFollowers;
}

function setStatus(status, save = true) {
  userProfile.status = status;
  ['online', 'busy', 'away'].forEach(s => {
    document.getElementById(`status-${s}`).classList.toggle('active', s === status);
  });
  if (save) saveProfileToStorage();
}

function saveProfile() {
  const name = document.getElementById('edit-display-name').value.trim();
  const username = document.getElementById('edit-username').value.trim();
  const bio = document.getElementById('edit-bio').value.trim();

  if (!name) { showSettingToast('Name cannot be empty.'); return; }

  userProfile = { ...userProfile, name, username, bio };

  document.getElementById('profile-display-name').textContent = name;
  document.getElementById('profile-username').textContent = username;

  // Update avatar initial
  const avatarEl = document.getElementById('profile-avatar-display');
  if (!userProfile.avatarUrl) avatarEl.textContent = name.charAt(0).toUpperCase();

  saveProfileToStorage();
  showSettingToast('Ã¢Å“â€œ Profile saved successfully!');
}

function saveProfileToStorage() {
  localStorage.setItem('privateai_profile', JSON.stringify(userProfile));
}

function handleProfilePhoto(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    userProfile.avatarUrl = e.target.result;
    document.getElementById('profile-avatar-display').innerHTML =
      `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    saveProfileToStorage();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

let toastTimer;
function showSettingToast(msg) {
  const toast = document.getElementById('settings-toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function logOut() {
  if (confirm('Log out of Private AI?')) {
    firebase.auth().signOut().then(() => {
      localStorage.removeItem('privateai_session');
      location.reload();
    });
  }
}

// Start App
window.onload = () => {
  checkAuthSession();
};
