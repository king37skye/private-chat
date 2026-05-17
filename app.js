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
  console.log("✅ Firebase Relay connected.");
} catch (e) {
  console.error("❌ Firebase failed to initialize. Using offline mock mode.");
}

// =====================================================
// AUTH MODULE
// =====================================================

let authMode = 'login';   // 'login' | 'signup'
let authMethod = 'email'; // 'email' | 'phone'
let pendingPhone = '';

// Called on page load — check if session exists
function checkAuthSession() {
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // User is signed in
      const userData = {
        uid: user.uid,
        email: user.email,
        name: user.displayName || 'User',
        photo: user.photoURL
      };
      localStorage.setItem('privateai_session', JSON.stringify(userData));
      syncUserProfileToCloud(userData);
      startNotificationListener(userData.uid);
      unlockApp(false);
    } else {
      // User is signed out
      localStorage.removeItem('privateai_session');
      document.getElementById('app-container').classList.add('app-locked');
      document.getElementById('auth-screen').style.display = 'flex';
      document.getElementById('auth-screen').classList.remove('fade-out');
    }
  });
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

  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Email and password required.'; return; }

  btn.disabled = true;
  const originalText = document.getElementById('auth-submit-email-text').textContent;
  document.getElementById('auth-submit-email-text').textContent = 'Securing...';

  if (authMode === 'signup') {
    firebase.auth().createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        if (name) userCredential.user.updateProfile({ displayName: name });
      })
      .catch((error) => {
        errEl.textContent = error.message;
        btn.disabled = false;
        document.getElementById('auth-submit-email-text').textContent = originalText;
      });
  } else {
    firebase.auth().signInWithEmailAndPassword(email, password)
      .catch((error) => {
        errEl.textContent = error.message;
        btn.disabled = false;
        document.getElementById('auth-submit-email-text').textContent = originalText;
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
- When the user shares message content WITH YOU directly in this conversation, you MUST analyze it, summarize it, or help with it fully and helpfully. This is an EXPLICIT, CONSENTED user action — it is NOT a privacy violation. The user chose to share it with you.
- Be concise, warm, and genuinely helpful.
- If asked to do something truly invasive (e.g., hack accounts, reveal other users' data), politely decline.

In short: never spy, always help when asked.`,
    avatar: '✨',
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
async function getDeviceKey(customKeyMaterial) {
  let keyMaterial = customKeyMaterial;
  if (!keyMaterial) {
    keyMaterial = localStorage.getItem('privateai_key_material');
    if (!keyMaterial) {
      keyMaterial = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('privateai_key_material', keyMaterial);
    }
  }

  const encoder = new TextEncoder();
  // Hash the key material using SHA-256 to produce an exact 32-byte (256-bit) raw key for AES-GCM
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(keyMaterial));
  
  return crypto.subtle.importKey(
    "raw", hashBuffer, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]
  );
}

async function encryptData(data, customKeyMaterial) {
  const key = await getDeviceKey(customKeyMaterial);
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

async function decryptData(encryptedString, customKeyMaterial) {
  try {
    const { iv, data } = JSON.parse(encryptedString);
    const key = await getDeviceKey(customKeyMaterial);
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

async function encryptFile(arrayBuffer, customKeyMaterial) {
  const key = await getDeviceKey(customKeyMaterial);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    arrayBuffer
  );

  // Return a package with IV prepended so it can be uploaded as a single binary stream!
  // Prepended layout: [12 bytes IV] + [encrypted data]
  const packageBuffer = new Uint8Array(12 + encrypted.byteLength);
  packageBuffer.set(iv, 0);
  packageBuffer.set(new Uint8Array(encrypted), 12);
  return packageBuffer.buffer;
}

async function decryptFile(arrayBuffer, customKeyMaterial) {
  try {
    const key = await getDeviceKey(customKeyMaterial);
    const fullView = new Uint8Array(arrayBuffer);
    const iv = fullView.slice(0, 12);
    const data = fullView.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data
    );
    return decrypted;
  } catch (e) {
    console.error("File decryption failed:", e);
    return null;
  }
}

async function downloadAndDecryptFile(msgId, url, name, type, partnerId, isAutoMedia = false) {
  const container = document.getElementById(`decrypt_${msgId}`);
  if (!isAutoMedia && container) {
    container.innerHTML = `
      <div class="spinner" style="margin-right:8px;"></div>
      <span style="font-size:0.75rem;">Decrypting locally...</span>
    `;
  }

  try {
    const mySession = JSON.parse(localStorage.getItem('privateai_session') || '{}');
    const myUid = mySession.uid;
    const sharedSecret = [myUid, partnerId].sort().join('_');

    // 1. Download encrypted array buffer
    const response = await fetch(url);
    const encryptedBuffer = await response.arrayBuffer();

    // 2. Decrypt locally using E2EE shared secret
    const decryptedBuffer = await decryptFile(encryptedBuffer, sharedSecret);
    if (!decryptedBuffer) throw new Error("Decryption failed");

    // 3. Create object URL for local blob
    const decryptedBlob = new Blob([decryptedBuffer], { type: type });
    const objectUrl = URL.createObjectURL(decryptedBlob);

    // Save to local cache in history so it doesn't need to be decrypted again!
    const history = mockChatHistories[partnerId];
    if (history) {
      const msg = history.find(m => m.id === msgId);
      if (msg && msg.file) {
        msg.file.localUrl = objectUrl;
        saveChatHistories();
      }
    }

    // 4. Update the DOM
    const bubble = document.getElementById(msgId);
    if (bubble) {
      const contentDiv = bubble.querySelector('.message-content');
      const isImg = type.startsWith('image/');
      const isVid = type.startsWith('video/');
      const ext = name.split('.').pop().toUpperCase();

      if (isImg) {
        contentDiv.innerHTML = `<img src="${objectUrl}" class="attachment-image" onclick="openImagePreview('${objectUrl}')">`;
      } else if (isVid) {
        contentDiv.innerHTML = `<video src="${objectUrl}" class="attachment-image" controls></video>`;
      } else {
        contentDiv.innerHTML = `
          <div class="file-card-inner">
            <div class="file-icon" style="background:#30D158; padding:6px 10px; border-radius:6px; color:#fff; font-weight:bold; font-size:0.75rem; margin-right:10px;">${ext}</div>
            <div class="file-info" style="display:flex; flex-direction:column; flex:1; text-align:left;">
              <div class="file-name" style="font-size:0.8rem; font-weight:500; word-break:break-all;">${name}</div>
              <div class="file-size" style="font-size:0.65rem; color:var(--text-tertiary); margin-top:2px;">${(decryptedBlob.size / (1024 * 1024)).toFixed(1)} MB · Decrypted</div>
            </div>
            <a href="${objectUrl}" download="${name}" class="file-download-btn" style="color:#30D158; font-size:1.2rem; text-decoration:none; margin-left:10px;">⬇️</a>
          </div>
        `;
      }
      scrollToBottom(bubble.parentElement);
    }
  } catch (err) {
    console.error("Download/decryption failed:", err);
    if (container) {
      container.innerHTML = `<span style="font-size:0.75rem; color:#FF3B30;">❌ Decryption Failed</span>`;
    }
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
    if (decrypted) {
      mockChatHistories = decrypted;

      // Reconstruct contacts from chat histories so they stay in the chat tab on refresh
      for (const partnerId of Object.keys(mockChatHistories)) {
        if (partnerId && partnerId !== 'null' && partnerId !== 'undefined') {
          const history = mockChatHistories[partnerId];
          const lastMsg = history[history.length - 1];

          if (!mockContacts.find(c => c.id === partnerId)) {
            const newContact = {
              id: partnerId,
              name: 'Secure Chat',
              avatar: '👤',
              lastMessage: lastMsg ? lastMsg.text : 'Tap to start a secure chat',
              time: lastMsg ? lastMsg.time : 'Now',
              unread: 0
            };
            mockContacts.push(newContact);

            if (db) {
              db.collection('users').doc(partnerId).get().then(userDoc => {
                if (userDoc.exists) {
                  const data = userDoc.data();
                  newContact.name = data.name || newContact.name;
                  newContact.avatar = data.photo || '👤';
                  renderContacts();
                }
              });
            }
          }
        }
      }
      renderContacts();
    }
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
    avatar: name.substring(0, 2).toUpperCase(),
    isStandard: false
  };

  mockAIs.push(newAI);
  mockAIChatHistories[newAI.id] = [{ id: 'm1', text: `Hello, I am ${name}. ${role.substring(0, 30)}...`, sender: 'ai', time: 'Just now' }];

  closeCreateAIModal();
  renderAIs();
}

// Navigation Routing: Open Chat
function openChat(profile, isAIProfile = false) {
  // Ensure we are in the 'chats' view mode so the chat panel isn't hidden by desktop CSS rules
  if (currentMainView !== 'chats') {
    showTab('chats');
  }

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

  // Initialize chat history and contact if it doesn't exist
  if (!isAIProfile && !mockChatHistories[profile.id]) {
    mockChatHistories[profile.id] = [];
  }
  if (!isAIProfile && !mockContacts.find(c => c.id === profile.id)) {
    mockContacts.unshift({ id: profile.id, name: profile.name, avatar: profile.avatar, lastMessage: 'Tap to start a secure chat', time: 'Now', unread: 0 });
    renderContacts();
  }

  // Send read receipts back to the partner for all unread messages
  if (db && !isAIProfile) {
    const mySession = JSON.parse(localStorage.getItem('privateai_session') || '{}');
    const myUid = mySession.uid;
    const historyList = mockChatHistories[profile.id] || [];

    let hasUnread = false;
    historyList.forEach(msg => {
      if (msg.sender === 'them' && msg.originalId && !msg.isReadByMe) {
        msg.isReadByMe = true;
        hasUnread = true;

        db.collection('relay').add({
          to: profile.id, // Recipient's UID
          from: myUid,    // My UID
          type: 'receipt',
          msgId: msg.originalId,
          status: 'read',
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    if (hasUnread) {
      saveChatHistories();
    }

    // Reset unread count for this contact
    const contact = mockContacts.find(c => c.id === profile.id);
    if (contact && contact.unread > 0) {
      contact.unread = 0;
      renderContacts();
    }
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

// File Attachment Handler — processes bulk files, encrypts locally (E2EE), and uploads to secure storage
async function handleFileAttachment(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  const mySession = JSON.parse(localStorage.getItem('privateai_session') || '{}');
  const myUid = mySession.uid;
  const savedProfile = JSON.parse(localStorage.getItem('privateai_profile') || '{}');
  const senderName = savedProfile.name || (mySession ? mySession.name : 'User');

  const targetChatId = currentActiveChatId;
  const targetAI = currentActiveAI;
  if (!targetChatId && !targetAI) return;

  const container = targetAI ? aiContainer : chatContainer;
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  for (const file of files) {
    const msgId = 'm_file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const ext = file.name.split('.').pop().toUpperCase();
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    // Create the message card immediately in the DOM (with progress bar!)
    const cardEl = document.createElement('div');
    cardEl.className = 'message-bubble message-sent attachment-bubble';
    cardEl.id = msgId;

    let mediaHTML = '';
    if (isImage) {
      mediaHTML = `<div class="attachment-blur-placeholder media-placeholder" id="decrypt_${msgId}">📷 ${file.name}</div>`;
    } else if (isVideo) {
      mediaHTML = `<div class="attachment-blur-placeholder media-placeholder" id="decrypt_${msgId}">🎥 ${file.name}</div>`;
    } else {
      mediaHTML = `
        <div class="file-card-inner" id="decrypt_${msgId}">
          <div class="file-icon" style="background:#5E5CE6; padding:6px 10px; border-radius:6px; color:#fff; font-weight:bold; font-size:0.75rem; margin-right:10px;">${ext}</div>
          <div class="file-info" style="display:flex; flex-direction:column; flex:1; text-align:left;">
            <div class="file-name" style="font-size:0.8rem; font-weight:500; word-break:break-all;">${file.name}</div>
            <div class="file-size" style="font-size:0.65rem; color:var(--text-tertiary); margin-top:2px;">${(file.size / (1024 * 1024)).toFixed(1)} MB · Zero-Knowledge E2EE</div>
          </div>
        </div>
      `;
    }

    cardEl.innerHTML = `
      ${mediaHTML}
      <div class="upload-progress-container" style="width:100%; margin-top:8px;">
        <div class="upload-progress-bar" style="width:0%; height:4px; background:#5E5CE6; border-radius:2px; transition:width 0.1s ease;"></div>
        <div class="upload-progress-text" style="font-size:0.65rem; color:var(--text-tertiary); margin-top:4px; text-align:right;">Encrypting locally...</div>
      </div>
      <span class="timestamp" style="display:flex;justify-content:flex-end;gap:4px;margin-top:6px;">
        ${now}
        <span class="read-receipt sent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>
        </span>
      </span>
    `;

    container.appendChild(cardEl);
    scrollToBottom(container);

    try {
      if (targetAI) {
        // AI assistant receives the local file directly as data url for offline execution
        const reader = new FileReader();
        reader.onload = async (e) => {
          // Put standard content
          if (isImage) {
            cardEl.querySelector('.media-placeholder').replaceWith(Object.assign(document.createElement('img'), {
              src: e.target.result,
              className: 'attachment-image',
              onclick: () => openImagePreview(e.target.result)
            }));
          } else if (isVideo) {
            cardEl.querySelector('.media-placeholder').replaceWith(Object.assign(document.createElement('video'), {
              src: e.target.result,
              className: 'attachment-image',
              controls: true
            }));
          }
          cardEl.querySelector('.upload-progress-container').remove();
          
          // Save to AI chat history
          const newMsg = {
            id: msgId,
            text: `[File Attachment: ${file.name}]`,
            sender: 'me',
            time: now,
            file: { name: file.name, type: file.type, data: e.target.result }
          };
          if (!mockAIChatHistories[targetAI.id]) mockAIChatHistories[targetAI.id] = [];
          mockAIChatHistories[targetAI.id].push(newMsg);
          saveChatHistories();

          // Trigger AI response (mock AI)
          mockE2EEResponse(msgId);
        };
        reader.readAsDataURL(file);
        continue;
      }

      // E2EE User Chat Flow
      const sharedSecret = [myUid, targetChatId].sort().join('_');
      
      // 1. Read file as ArrayBuffer
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });

      // 2. Encrypt locally (E2EE)
      const encryptedBuffer = await encryptFile(arrayBuffer, sharedSecret);
      const encryptedBlob = new Blob([encryptedBuffer], { type: 'application/octet-stream' });

      // 3. Upload encrypted Blob to Firebase Storage
      if (db) {
        const storageRef = firebase.storage().ref().child('chats/' + msgId + '_' + file.name);
        const uploadTask = storageRef.put(encryptedBlob);

        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            const bar = cardEl.querySelector('.upload-progress-bar');
            const txt = cardEl.querySelector('.upload-progress-text');
            if (bar) bar.style.width = progress + '%';
            if (txt) txt.textContent = `Uploading E2EE payload... ${Math.round(progress)}%`;
          }, 
          (error) => {
            console.error("Upload failed:", error);
            const txt = cardEl.querySelector('.upload-progress-text');
            if (txt) txt.textContent = "Upload failed.";
          }, 
          async () => {
            const downloadUrl = await storageRef.getDownloadURL();

            // Remove progress container
            cardEl.querySelector('.upload-progress-container').remove();

            // Replace placeholder with decrypted media preview locally for instant display!
            const objectUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: file.type }));
            if (isImage) {
              const img = document.createElement('img');
              img.src = objectUrl;
              img.className = 'attachment-image';
              img.onclick = () => openImagePreview(objectUrl);
              cardEl.querySelector('.media-placeholder').replaceWith(img);
            } else if (isVideo) {
              const video = document.createElement('video');
              video.src = objectUrl;
              video.className = 'attachment-image';
              video.controls = true;
              cardEl.querySelector('.media-placeholder').replaceWith(video);
            }

            // Create E2EE local history packet
            const fileMsg = {
              id: msgId,
              text: `📂 ${file.name}`,
              sender: 'me',
              time: now,
              status: 'sent',
              file: {
                name: file.name,
                size: file.size,
                type: file.type,
                url: downloadUrl,
                localUrl: objectUrl // Local reference for caching
              }
            };

            if (!mockChatHistories[targetChatId]) mockChatHistories[targetChatId] = [];
            mockChatHistories[targetChatId].push(fileMsg);
            saveChatHistories();

            // Send E2EE meta packet through the database relay
            const encryptedPacket = await encryptData({
              type: 'file',
              name: file.name,
              size: file.size,
              mimeType: file.type,
              url: downloadUrl,
              senderHandle: senderName,
              time: now
            }, sharedSecret);

            await db.collection('relay').add({
              to: targetChatId,
              from: myUid,
              packet: encryptedPacket,
              msgId: msgId,
              timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
          }
        );
      }
    } catch (err) {
      console.error("Encryption/Upload failed:", err);
      const txt = cardEl.querySelector('.upload-progress-text');
      if (txt) txt.textContent = "Error processing file.";
    }
  }

  // Clear file input
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

  if (msg.file) {
    const isImg = msg.file.type.startsWith('image/');
    const isVid = msg.file.type.startsWith('video/');
    const ext = msg.file.name.split('.').pop().toUpperCase();
    const partnerId = currentActiveChatId;

    if (isImg || isVid) {
      contentDiv.innerHTML = `
        <div class="media-placeholder media-decrypting" id="decrypt_${msg.id}">
          <div class="spinner" style="margin-bottom:8px;"></div>
          <span>Decrypting media...</span>
        </div>
      `;
      // Trigger background decryption
      setTimeout(() => {
        downloadAndDecryptFile(msg.id, msg.file.url, msg.file.name, msg.file.type, partnerId, true);
      }, 100);
    } else {
      contentDiv.innerHTML = `
        <div class="file-card-inner recipient-decrypt-card" id="decrypt_${msg.id}">
          <div class="file-icon" style="background:#5E5CE6; padding:6px 10px; border-radius:6px; color:#fff; font-weight:bold; font-size:0.75rem; margin-right:10px;">${ext}</div>
          <div class="file-info" style="display:flex; flex-direction:column; flex:1; text-align:left;">
            <div class="file-name" style="font-size:0.8rem; font-weight:500; word-break:break-all;">${msg.file.name}</div>
            <div class="file-size" style="font-size:0.65rem; color:var(--text-tertiary); margin-top:2px;">${(msg.file.size / (1024 * 1024)).toFixed(1)} MB · E2EE Encrypted</div>
          </div>
          <button class="file-decrypt-btn" onclick="downloadAndDecryptFile('${msg.id}', '${msg.file.url}', '${msg.file.name}', '${msg.file.type}', '${partnerId}')">🔓 Decrypt</button>
        </div>
      `;
    }
  } else if (msg.sender === 'ai' && typeof marked !== 'undefined') {
    contentDiv.innerHTML = marked.parse(msg.text);
  } else {
    contentDiv.textContent = msg.text;
  }

  bubble.appendChild(contentDiv);

  const timeSpan = document.createElement('span');
  timeSpan.className = 'timestamp';

  if (msg.sender === 'me' && container === chatContainer) {
    let statusIcon = '';
    let receiptClass = msg.status || 'sent';

    if (msg.status === 'read') {
      statusIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L7 17l-5-5"></path><path d="M22 10l-6.5 6.5"></path></svg>`;
      receiptClass = 'read';
    } else if (msg.status === 'delivered') {
      statusIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L7 17l-5-5"></path><path d="M22 10l-6.5 6.5"></path></svg>`;
      receiptClass = 'delivered';
    } else {
      statusIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>`;
      receiptClass = 'sent';
    }

    timeSpan.innerHTML = `${msg.time} <span class="read-receipt ${receiptClass}">${statusIcon}</span>`;
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
      const mySession = JSON.parse(localStorage.getItem('privateai_session'));
      const myUid = mySession ? mySession.uid : null;
      const savedProfile = JSON.parse(localStorage.getItem('privateai_profile') || '{}');
      const senderName = savedProfile.name || (mySession ? mySession.name : 'User');

      if (db && myUid) {
        // Encrypt the message for the relay using shared E2EE chat key
        const sharedSecret = [myUid, targetChatId].sort().join('_');
        const encryptedPacket = await encryptData({
          text: text,
          senderHandle: senderName,
          time: now
        }, sharedSecret);

        // Send to the recipient's inbox (using their Firebase UID as ID)
        await db.collection('relay').add({
          to: targetChatId, // Recipient's UID
          from: myUid,      // Sender's UID
          packet: encryptedPacket,
          msgId: newMsg.id, // Include the message ID!
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (e) {
      console.error("Relay failed:", e);
    }
    // --- REAL-TIME RELAY END ---

    if (!db) {
      mockE2EEResponse(newMsg.id);
    }
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

    processAIQuery(text, targetAI.id);
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

  // Special handling for YouTube — no API needed
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
    // If API fails silently, just remove skeleton — message stands on its own
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


// Simulate local receipt transitions for real chats to maintain premium feel
function simulateReceiptTransitions(sentMsgId) {
  const targetId = currentActiveChatId;
  // Transition to Delivered after 500ms
  setTimeout(() => {
    if (!mockChatHistories[targetId]) return;
    const sentMsg = mockChatHistories[targetId].find(m => m.id === sentMsgId);
    if (sentMsg) sentMsg.status = 'delivered';
    const msgEl = document.getElementById(sentMsgId);
    if (msgEl) {
      const icon = msgEl.querySelector('.read-receipt svg');
      if (icon) icon.innerHTML = '<path d="M18 6L7 17l-5-5"></path><path d="M22 10l-6.5 6.5"></path>';
    }
  }, 500);

  // Transition to Read after 1500ms
  setTimeout(() => {
    if (!mockChatHistories[targetId]) return;
    const sentMsg = mockChatHistories[targetId].find(m => m.id === sentMsgId);
    if (sentMsg) sentMsg.status = 'read';
    const msgEl = document.getElementById(sentMsgId);
    if (msgEl) {
      const receipt = msgEl.querySelector('.read-receipt');
      if (receipt) receipt.classList.add('read');
    }
    saveChatHistories();
  }, 1500);
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

    if (currentActiveChatId) {
      mockChatHistories[currentActiveChatId].push(responseMsg);
      saveChatHistories();
      // Also update the contacts list last message preview
      const contact = mockContacts.find(c => c.id === currentActiveChatId);
      if (contact) {
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
      openContextMenu({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, preventDefault: () => { } }, msgId);
    }, 500);
    e.target.addEventListener('touchend', () => clearTimeout(longPressTimer), { once: true });
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
async function processAIQuery(prompt, aiId) {
  // Keeping the UI alive with a mock response for now
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("The AI Assistant is currently in 'Offline Mode' while we finalize the cloud secure-bridge. I'll be fully active soon! How else can I help you visually test the space?");
    }, 1500);
  }).then(text => deliverAIResponse(text, "Secure Backend"));
}

function deliverAIResponse(text, badge) {
  typingIndicator.classList.remove('active');
  aiContainer.removeChild(typingIndicator);

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const newMsg = { id: 'm_' + Date.now(), text, sender: 'ai', time: `${badge} • ${now}` };
  appendMessageToDOM(newMsg, aiContainer);
  if (currentActiveAI) {
    mockAIChatHistories[currentActiveAI.id].push(newMsg);
    saveChatHistories();
  }
}

// =====================================================
// BOTTOM NAV — Main View Switching
// =====================================================

let currentMainView = 'chats';

function showTab(view) {
  // Map 'chat' from HTML to 'chats' in JS
  const internalView = view === 'chat' ? 'chats' : view;
  
  // If we are in a chat, close it when switching to Discover or Profile
  if (internalView !== 'chats' && currentActiveChatId) {
    closeChat();
  }

  currentMainView = internalView;

  // Update classes on appContainer for CSS targeting
  ['view-chats', 'view-discover', 'view-profile'].forEach(c => appContainer.classList.remove(c));
  appContainer.classList.add(`view-${internalView}`);

  // Update all main panels visibility
  const panels = { chats: 'contacts-view', discover: 'discover-view', profile: 'profile-view' };
  Object.entries(panels).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = key === internalView ? 'flex' : 'none';
  });

  // Update nav title
  const titles = { chats: 'Chats', discover: 'Discover', profile: 'Profile' };
  const titleEl = document.getElementById('nav-title');
  if (titleEl) titleEl.textContent = titles[internalView];

  // Update bottom nav active state
  ['chats', 'discover', 'profile'].forEach(v => {
    const navId = v === 'chats' ? 'bnav-chats' : `bnav-${v}`;
    const el = document.getElementById(navId);
    if (el) el.classList.toggle('active', v === internalView);
  });

  // Load the appropriate view content
  if (internalView === 'discover') fetchRealDiscoverUsers();
  if (internalView === 'profile') loadProfilePage();
}

// --- REAL-TIME DISCOVERY ENGINE ---
async function syncUserProfileToCloud(user) {
  if (!db || !user) return;
  try {
    const userRef = db.collection('users').doc(user.uid);
    await userRef.set({
      uid: user.uid,
      name: user.name || 'User',
      email: user.email || '',
      photo: user.photo || '',
      handle: '@' + (user.email ? user.email.split('@')[0] : user.uid.slice(0, 5)),
      lastActive: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // SEED: If this is the first user, add a "Guide" user so Discover isn't empty
    const guideRef = db.collection('users').doc('u_guide_1');
    await guideRef.set({
      uid: 'u_guide_1',
      name: 'Private AI Guide',
      handle: '@guide',
      bio: 'Official guide for testing your secure space. Follow me!',
      avatar: '🛡️',
      color: '#34C759',
      lastActive: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log("👤 Profile synced and Guide seeded.");
  } catch (e) {
    console.error("Profile sync failed:", e);
  }
}

async function fetchRealDiscoverUsers() {
  if (!db) return;
  const listEl = document.getElementById('discover-list');
  listEl.innerHTML = '<div class="loading-spinner" style="margin:20px auto;"></div>';

  try {
    const snapshot = await db.collection('users').limit(20).get();
    const users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.uid !== (JSON.parse(localStorage.getItem('privateai_session')) || {}).uid) {
        users.push({
          id: data.uid,
          name: data.name,
          handle: data.handle,
          bio: 'Real User on Private AI',
          avatar: data.photo || '👤',
          color: '#5E5CE6',
          followers: 0,
          following: followingSet.has(data.uid)
        });
      }
    });
    
    // Update the UI
    realDiscoverSource = users; // Update our search source
    discoverFilteredUsers = users;
    renderDiscover();
  } catch (e) {
    console.error("Discovery failed:", e);
    listEl.innerHTML = '<p style="text-align:center; opacity:0.6;">Unable to find users right now.</p>';
  }
}
// --- END DISCOVERY ENGINE ---

function renderDiscover() {
  const listEl = document.getElementById('discover-list');
  if (discoverFilteredUsers.length === 0) {
    listEl.innerHTML = '<p style="text-align:center; padding:40px; opacity:0.5;">No users found yet. Invite friends to join!</p>';
    return;
  }
  listEl.innerHTML = '';

  discoverFilteredUsers.forEach(user => {
    const isFollowing = followingSet.has(user.id);
    const card = document.createElement('div');
    card.className = 'discover-card';
    card.innerHTML = `
      <div class="discover-avatar" style="background: linear-gradient(135deg, ${user.color}88, ${user.color}44); cursor:pointer;" onclick="openOtherProfile('${user.id}')">
        ${user.avatar}
      </div>
      <div class="discover-info" onclick="openOtherProfile('${user.id}')" style="cursor:pointer;">
        <div class="discover-name">${user.name}</div>
        <div class="discover-handle">${user.handle} · ${formatFollowers(user.followers)} followers</div>
        <div class="discover-bio">${user.bio}</div>
      </div>
      <button class="follow-btn ${isFollowing ? 'following' : ''}" onclick="toggleFollow('${user.id}', this)">
        ${isFollowing ? 'Following' : 'Follow'}
      </button>
    `;
    listEl.appendChild(card);
  });
}

function saveFollowing() {
  localStorage.setItem('privateai_following', JSON.stringify(Array.from(followingSet)));
}

function loadFollowing() {
  const saved = JSON.parse(localStorage.getItem('privateai_following') || '[]');
  followingSet = new Set(saved);

  // Reconstruct followed contacts so they stay in the chat tab on refresh
  followingSet.forEach(partnerId => {
    if (!mockContacts.find(c => c.id === partnerId)) {
      const newContact = {
        id: partnerId,
        name: 'Secure Contact',
        avatar: '👤',
        lastMessage: 'Tap to start a secure chat',
        time: 'Now',
        unread: 0
      };
      mockContacts.push(newContact);

      if (db) {
        db.collection('users').doc(partnerId).get().then(userDoc => {
          if (userDoc.exists) {
            const data = userDoc.data();
            newContact.name = data.name || newContact.name;
            newContact.avatar = data.photo || '👤';
            renderContacts();
          }
        });
      }
    }
  });
  renderContacts();
}

function renderDiscoverPage() {
  const list = document.getElementById('discover-list');
  list.innerHTML = '';

  discoverFilteredUsers.forEach(user => {
    const isFollowing = followingSet.has(user.id);
    const card = document.createElement('div');
    card.className = 'discover-card';
    card.innerHTML = `
      <div class="discover-avatar" style="background: linear-gradient(135deg, ${user.color}88, ${user.color}44); cursor:pointer;" onclick="openOtherProfile('${user.id}')">
        ${user.avatar}
      </div>
      <div class="discover-info" onclick="openOtherProfile('${user.id}')" style="cursor:pointer;">
        <div class="discover-name">${user.name}</div>
        <div class="discover-handle">${user.handle} · ${formatFollowers(user.followers)} followers</div>
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

async function toggleFollow(userId, btn) {
  const user = discoverFilteredUsers.find(u => u.id === userId);
  if (!user) return;
  const mySession = JSON.parse(localStorage.getItem('privateai_session'));
  
  if (followingSet.has(userId)) {
    followingSet.delete(userId);
    btn.textContent = 'Follow';
    btn.classList.remove('following');
    saveFollowing();
  } else {
    followingSet.add(userId);
    btn.textContent = 'Following';
    btn.classList.add('following');
    saveFollowing();

    if (db && mySession) {
      db.collection('notifications').add({
        to: userId,
        from: mySession.uid,
        fromName: mySession.name,
        type: 'follow',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        read: false
      });
    }

    if (!mockContacts.find(c => c.id === userId)) {
      mockContacts.unshift({ id: userId, name: user.name, avatar: user.avatar, lastMessage: 'Tap to start a secure chat', time: 'Now', unread: 0 });
      renderContacts();
    }
  }
}

function openOtherProfile(userId) {
  const user = discoverFilteredUsers.find(u => u.id === userId);
  if (!user) return;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.innerHTML = `
    <div class="modal-content" style="text-align:center; padding: 40px 20px;">
      <div class="profile-avatar-large" style="width:100px; height:100px; margin:0 auto 20px; font-size:40px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.05); border-radius:50%;">
        ${user.avatar}
      </div>
      <h2 style="margin-bottom:4px;">${user.name}</h2>
      <p style="color:var(--text-secondary); margin-bottom:20px;">${user.handle}</p>
      <p style="margin-bottom:30px; line-height:1.5;">${user.bio}</p>
      <div style="display:flex; gap:12px; justify-content:center;">
        <button class="tab-btn active" style="flex:1;" onclick="startChatFromProfile('${user.id}')">Message</button>
        <button class="tab-btn" style="flex:1;" onclick="document.body.removeChild(this.closest('.modal-overlay'))">Close</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function startChatFromProfile(userId) {
  const user = discoverFilteredUsers.find(u => u.id === userId);
  if (!user) return;
  const modal = document.querySelector('.modal-overlay.active');
  if (modal) document.body.removeChild(modal);
  openChat(user);
}

function startNotificationListener(uid) {
  if (!db) return;
  db.collection('notifications')
    .where('to', '==', uid)
    .where('read', '==', false)
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const notif = change.doc.data();
          if (notif.type === 'follow') {
            showSettingToast(`${notif.fromName} followed you!`);
          }
          change.doc.ref.update({ read: true });
        }
      });
    });
}

// Filter Discover Users (Real-Time Search)
let realDiscoverSource = []; // Store the full list from cloud

async function filterDiscover(query) {
  const q = query.toLowerCase().trim();
  console.log("🔍 Searching for:", q, "in", realDiscoverSource.length, "users");

  if (!q) {
    discoverFilteredUsers = [...realDiscoverSource];
  } else {
    discoverFilteredUsers = realDiscoverSource.filter(user => 
      (user.name && user.name.toLowerCase().includes(q)) || 
      (user.handle && user.handle.toLowerCase().includes(q))
    );
  }
  
  renderDiscover();
}

// =====================================================
// USER LISTS & MODALS
// =====================================================

async function openUserListModal(type) {
  const modal = document.getElementById('user-list-modal');
  const title = document.getElementById('user-list-title');
  const content = document.getElementById('user-list-content');
  const mySession = JSON.parse(localStorage.getItem('privateai_session'));

  modal.style.display = 'flex';
  content.innerHTML = '<div class="loading-spinner" style="margin:40px auto;"></div>';

  try {
    let usersToShow = [];
    if (type === 'following') {
      title.textContent = 'Following';
      // Find people I follow in the discover source
      usersToShow = realDiscoverSource.filter(u => followingSet.has(u.id));
    } else {
      title.textContent = 'Followers';
      // Search cloud for people who follow ME
      if (db && mySession) {
        const snapshot = await db.collection('notifications').where('to', '==', mySession.uid).where('type', '==', 'follow').get();
        const followerIds = new Set();
        snapshot.forEach(doc => followerIds.add(doc.data().from));
        usersToShow = realDiscoverSource.filter(u => followerIds.has(u.id));
      }
    }

    content.innerHTML = '';
    if (usersToShow.length === 0) {
      content.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-secondary);">No ${type} yet.</div>`;
    } else {
      usersToShow.forEach(user => appendUserToModalList(user, content));
    }
  } catch (e) {
    console.error("Failed to load list:", e);
    content.innerHTML = '<div style="padding:40px; text-align:center;">Error loading list.</div>';
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
  const session = JSON.parse(localStorage.getItem('privateai_session') || '{}');
  const myUid = session.uid;
  if (!db || !myUid) return;

  // Listen for packets sent TO this user (using UID)
  db.collection('relay')
    .where('to', '==', myUid)
    .onSnapshot(async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === 'added') {
          const doc = change.doc;
          const { from, packet, msgId, type, status } = doc.data();

          if (type === 'receipt') {
            // Update E2EE ticks in local history and DOM!
            const history = mockChatHistories[from];
            if (history) {
              const msg = history.find(m => m.id === msgId);
              if (msg) {
                if (msg.status !== 'read') {
                  msg.status = status;
                }
                saveChatHistories();

                if (currentActiveChatId === from) {
                  const msgEl = document.getElementById(msgId);
                  if (msgEl) {
                    const icon = msgEl.querySelector('.read-receipt svg');
                    const receipt = msgEl.querySelector('.read-receipt');

                    if (status === 'delivered') {
                      if (icon) icon.innerHTML = '<path d="M18 6L7 17l-5-5"></path><path d="M22 10l-6.5 6.5"></path>';
                      if (receipt) {
                        receipt.classList.remove('sent', 'read');
                        receipt.classList.add('delivered');
                      }
                    } else if (status === 'read') {
                      if (icon) icon.innerHTML = '<path d="M18 6L7 17l-5-5"></path><path d="M22 10l-6.5 6.5"></path>';
                      if (receipt) {
                        receipt.classList.remove('sent', 'delivered');
                        receipt.classList.add('read');
                      }
                    }
                  }
                }
              }
            }
            // Delete receipt from cloud immediately (Privacy-First)
            doc.ref.delete();
            continue;
          }

          // Decrypt the incoming packet using shared E2EE chat key
          const sharedSecret = [myUid, from].sort().join('_');
          const decrypted = await decryptData(packet, sharedSecret);
          if (decrypted) {
            const incomingMsg = {
              id: 'm_relay_' + doc.id,
              originalId: msgId, // Store sender's original message ID
              text: decrypted.type === 'file' ? `📂 ${decrypted.name}` : decrypted.text,
              sender: 'them',
              time: decrypted.time,
              isReadByMe: currentActiveChatId === from
            };

            if (decrypted.type === 'file') {
              incomingMsg.file = {
                name: decrypted.name,
                size: decrypted.size,
                type: decrypted.mimeType,
                url: decrypted.url
              };
            }

            // Save to local history
            if (!mockChatHistories[from]) mockChatHistories[from] = [];
            mockChatHistories[from].push(incomingMsg);

            // If contact is not in mockContacts, add it!
            let contact = mockContacts.find(c => c.id === from);
            if (!contact) {
              contact = {
                id: from,
                name: decrypted.senderHandle || 'New Contact',
                avatar: '👤',
                lastMessage: incomingMsg.text,
                time: incomingMsg.time,
                unread: currentActiveChatId === from ? 0 : 1
              };
              mockContacts.unshift(contact);
              renderContacts();

              // Fetch details from users collection in background to render beautifully
              db.collection('users').doc(from).get().then(userDoc => {
                if (userDoc.exists) {
                  const data = userDoc.data();
                  contact.name = data.name || contact.name;
                  contact.avatar = data.photo || '👤';
                  renderContacts();
                }
              });
            } else {
              contact.lastMessage = incomingMsg.text;
              contact.time = incomingMsg.time;
              if (currentActiveChatId !== from) {
                contact.unread++;
              }
              renderContacts();
            }

            // If chat is open, show it
            if (currentActiveChatId === from) {
              appendMessageToDOM(incomingMsg, chatContainer);
              scrollToBottom(chatContainer);
            }
            saveChatHistories();

            // Send back E2EE delivery/read receipt immediately
            if (db) {
              db.collection('relay').add({
                to: from, // Send back to original sender
                from: myUid,
                type: 'receipt',
                msgId: msgId,
                status: currentActiveChatId === from ? 'read' : 'delivered',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
              });
            }
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
        <button class="request-btn ignore" onclick="ignoreFollowRequest('${req.id}')">×</button>
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
  showSettingToast('✓ Profile saved successfully!');
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
      // Force a clean reload to the login screen
      window.location.href = window.location.origin;
    }).catch(err => {
      console.error("Logout failed:", err);
      // Fallback
      localStorage.removeItem('privateai_session');
      window.location.reload();
    });
  }
}

// Expose functions to global window at the very end to ensure they are defined
window.logOut = logOut;
window.showTab = showTab;
window.switchMainView = showTab; // Bulletproof: Support both names
window.submitEmailAuth = submitEmailAuth;
window.loginWithGoogle = loginWithGoogle;
window.submitPhoneAuth = submitPhoneAuth;
window.verifyOTP = verifyOTP;
window.toggleFollow = toggleFollow;
window.filterDiscover = filterDiscover;
window.openOtherProfile = openOtherProfile;
window.startChatFromProfile = startChatFromProfile;
window.openUserListModal = openUserListModal;

// Start App — check auth first
window.onload = () => {
  checkAuthSession();
};
