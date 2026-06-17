'use strict';

/* ── iOS keyboard fix: push input bar up when keyboard opens ── */
if (window.visualViewport) {
  const inputBar = document.getElementById('input-bar');
  function onViewportChange() {
    const keyboardHeight = window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop;
    if (inputBar) {
      inputBar.style.paddingBottom = keyboardHeight > 0 ? keyboardHeight + 8 + 'px' : '';
    }
  }
  window.visualViewport.addEventListener('resize', onViewportChange);
  window.visualViewport.addEventListener('scroll', onViewportChange);
}

/* ── Lock screen ── */
const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function updateLockClock() {
  const d = new Date();
  const lsDate = document.getElementById('ls-date');
  if (!lsDate) return;
  lsDate.innerHTML = `${DAYS[d.getDay()]}<br><br>${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

updateLockClock();
setInterval(updateLockClock, 10000);

let notifShown = false;

function showNotification() {
  if (notifShown) {
    unlockToWhatsApp();
    return;
  }
  notifShown = true;
  const notif = document.getElementById('ls-notification');
  const notifTime = document.getElementById('ls-notif-time');
  const d = new Date();
  notifTime.textContent = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  notif.classList.add('visible');
}

function unlockToWhatsApp() {
  const lock = document.getElementById('screen-lock');
  lock.style.transition = 'opacity 0.4s ease';
  lock.style.opacity = '0';
  setTimeout(() => {
    lock.classList.remove('active');
    lock.style.opacity = '';
    lock.style.transition = '';
    openChat(true);
  }, 400);
}


const DAY_NAMES   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SLOT_NUMS   = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣'];
const SLOT_TIMES  = ['09:00 – 12:00','13:00 – 17:00'];

/* Gaussian Easter algorithm */
function easterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function belgianHolidays(year) {
  const easter = easterDate(year);
  const add = (base, days) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  const fixed = (m, d) => new Date(year, m - 1, d);
  return [
    fixed(1, 1),
    add(easter, 1),
    fixed(5, 1),
    add(easter, 39),
    add(easter, 50),
    fixed(7, 21),
    fixed(8, 15),
    fixed(11, 1),
    fixed(11, 11),
    fixed(12, 25),
  ].map(d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
}

function isHoliday(d) {
  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  return belgianHolidays(d.getFullYear()).includes(key);
}

function isWorkday(d) {
  return d.getDay() > 0 && d.getDay() < 6 && !isHoliday(d);
}

const allSlots = [];

function buildSlotMessage(skipWorkdays, count) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  let skipped = 0;
  while (skipped < skipWorkdays) {
    d.setDate(d.getDate() + 1);
    if (isWorkday(d)) skipped++;
  }
  const lines = [];
  let collected = 0;
  while (collected < count) {
    d.setDate(d.getDate() + 1);
    if (isWorkday(d)) {
      const label = `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
      const time = SLOT_TIMES[collected % 2];
      allSlots.push({ label, time });
      lines.push(`${SLOT_NUMS[collected]} *${label}*\n    🕐 ${time}`);
      collected++;
    }
  }
  return lines.join('\n');
}

function getChosenSlot(userText, offset = 0) {
  const n = parseInt(userText.trim(), 10);
  const idx = offset + n - 1;
  if (n >= 1 && idx < allSlots.length) return allSlots[idx];
  return null;
}

const SCRIPT = [
  { agent: "Hi Marie! Our technician is scheduled to install your home charging station tomorrow at 10:00. If that time no longer works for you, you can easily reschedule right here in this conversation."},
  { agent: "No worries at all, Marie! 😊 Let me check when our technician is available next week…", autoNext: true },
  { agent: `Great news — I found a few openings! Just reply with the number of your preferred slot:\n\n${buildSlotMessage(0, 5)}` },
  { agent: "Let me look for next week availability.", autoNext: true },
  { agent: `I found some new openings for the following week! Just reply with the number of your preferred slot:\n\n${buildSlotMessage(5, 5)}` },
  { agent: "You're all set! 🎉 Our technician will come to install your home charging station on *{slot}*. You'll receive a confirmation by email shortly.\n\nIs there anything else I can help you with?" },
  { agent: "Thank you for choosing Sibelga — see you soon! ⚡" },
];

let scriptIndex = 0;
let capturedFirstName = '';
let capturedLastName  = '';
let capturedEmail     = '';
let capturedSlot      = null;
let conversationDone  = false;
let agentTurn = false;

const messagesEl  = document.getElementById('messages');
const inputEl     = document.getElementById('chat-input');
const sendBtn     = document.getElementById('send-btn');
const sendIcon    = document.getElementById('send-icon');
const agentStatus = document.getElementById('agent-status');
const listTime    = document.getElementById('list-time');

const MIC_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="white">
  <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
  <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
  <line x1="12" y1="19" x2="12" y2="23" stroke="white" stroke-width="2" stroke-linecap="round"/>
  <line x1="8" y1="23" x2="16" y2="23" stroke="white" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const SEND_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="white">
  <path d="M22 2L11 13" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M22 2L15 22L11 13L2 9L22 2Z" fill="white"/>
</svg>`;

function now() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fillName(text) {
  const slotLabel = capturedSlot ? `${capturedSlot.label}\n    🕐 ${capturedSlot.time}` : '';
  return text
    .replace(/\{name\}/g, capturedFirstName || '')
    .replace(/\{slot\}/g, slotLabel);
}

/* Only used for hardcoded script messages — not user input */
function formatScriptText(raw) {
  return raw
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

/* Used for user-typed messages — escapes HTML first */
function formatUserText(raw) {
  return escapeHtml(raw).replace(/\n/g, '<br>');
}

function scrollBottom() {
  setTimeout(() => { messagesEl.scrollTop = messagesEl.scrollHeight; }, 40);
}

function setInputEnabled(enabled) {
  inputEl.disabled = !enabled;
  if (enabled) {
    inputEl.focus();
    updateSendBtn();
  } else {
    sendBtn.disabled = true;
    sendBtn.style.background = '#8a8a8e';
    sendIcon.innerHTML = MIC_SVG;
  }
}

function updateSendBtn() {
  const hasText = inputEl.value.trim().length > 0;
  if (hasText) {
    sendBtn.disabled = false;
    sendBtn.style.background = '#25d366';
    sendIcon.innerHTML = SEND_SVG;
  } else {
    sendBtn.disabled = true;
    sendBtn.style.background = '#25d366';
    sendIcon.innerHTML = MIC_SVG;
  }
}

inputEl.addEventListener('input', updateSendBtn);

function addDateChip(label) {
  const el = document.createElement('div');
  el.className = 'wa-date-chip';
  el.textContent = label;
  messagesEl.appendChild(el);
}

function addBubble(text, direction, time, ticks) {
  const row = document.createElement('div');
  row.className = `wa-bubble-row ${direction}`;

  const bubble = document.createElement('div');
  bubble.className = 'wa-bubble';

  const formattedText = direction === 'outgoing' ? formatUserText(text) : formatScriptText(text);
  const ticksHtml = ticks ? `<svg class="wa-ticks read" width="18" height="11" viewBox="0 0 18 11" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 5.5L4.5 9L11 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M5 5.5L8.5 9L15 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>` : '';
  bubble.innerHTML = `
    <span class="wa-bubble-text">${formattedText}</span>
    <div class="wa-bubble-meta">
      <span class="wa-bubble-time">${escapeHtml(time)}</span>
      ${ticksHtml}
    </div>`;

  row.appendChild(bubble);
  messagesEl.appendChild(row);
  scrollBottom();
}

function addTypingIndicator() {
  const row = document.createElement('div');
  row.className = 'wa-bubble-row incoming';
  row.id = 'typing-row';
  const bubble = document.createElement('div');
  bubble.className = 'wa-bubble';
  bubble.innerHTML = `<div class="wa-typing"><span></span><span></span><span></span></div>`;
  row.appendChild(bubble);
  messagesEl.appendChild(row);
  scrollBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById('typing-row');
  if (el) el.remove();
}

function showAgentMessage(index) {
  const step = SCRIPT[index];
  const text = fillName(step.agent);
  addBubble(text, 'incoming', now(), false);

  if (index === SCRIPT.length - 1) {
    conversationDone = true;
    agentStatus.textContent = 'offline';
    setInputEnabled(false);
  } else if (step.autoNext) {
    scriptIndex++;
    agentTurn = true;
    setInputEnabled(false);
    agentStatus.textContent = 'typing...';
    setTimeout(() => {
      addTypingIndicator();
    }, 400);
    setTimeout(() => {
      removeTypingIndicator();
      agentStatus.textContent = 'online';
      showAgentMessage(scriptIndex);
    }, 5000);
  } else {
    agentTurn = false;
    setInputEnabled(true);
  }
}

function agentReply() {
  agentTurn = true;
  setInputEnabled(false);
  agentStatus.textContent = 'typing...';
  addTypingIndicator();

  const delay = 2500 + Math.floor(Math.random() * 1500);
  setTimeout(() => {
    removeTypingIndicator();
    agentStatus.textContent = 'online';
    showAgentMessage(scriptIndex);
  }, delay);
}

function handleSend() {
  if (conversationDone || agentTurn) return;
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = '';
  updateSendBtn();

  const step = SCRIPT[scriptIndex];
  if (step && step.capture === 'firstName') capturedFirstName = text;
  else if (step && step.capture === 'lastName')  capturedLastName  = text;
  else if (step && step.capture === 'email')     capturedEmail     = text;
  if (scriptIndex === 2) {
    const chosen = getChosenSlot(text, 0);
    if (chosen) capturedSlot = chosen;
  } else if (scriptIndex === 4) {
    const chosen = getChosenSlot(text, 5);
    if (chosen) capturedSlot = chosen;
  }

  addBubble(text, 'outgoing', now(), true);
  setInputEnabled(false);

  scriptIndex++;
  if (scriptIndex < SCRIPT.length) {
    agentReply();
  } else {
    conversationDone = true;
    agentStatus.textContent = 'offline';
  }
}

function handleKey(e) {
  if (e.key === 'Enter') handleSend();
}

function openChat(instant) {
  document.getElementById('screen-list').classList.remove('active');
  document.getElementById('screen-chat').classList.add('active');

  if (messagesEl.children.length === 0) {
    addDateChip('Today');
    if (instant) {
      agentStatus.textContent = 'online';
      showAgentMessage(0);
    } else {
      setInputEnabled(false);
      agentStatus.textContent = 'typing...';
      addTypingIndicator();
      setTimeout(() => {
        removeTypingIndicator();
        agentStatus.textContent = 'online';
        showAgentMessage(0);
      }, 1800);
    }
  }
}

function closeChat() {
  document.getElementById('screen-chat').classList.remove('active');
  document.getElementById('screen-list').classList.add('active');
}

(function init() {
  listTime.textContent = now();
  setInterval(() => { listTime.textContent = now(); }, 30000);
  sendIcon.innerHTML = MIC_SVG;
})();
