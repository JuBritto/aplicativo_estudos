/**
 * Foco & Tarefas - Pomodoro & To-Do List
 * Aplicação local com persistência em LocalStorage e Web Audio API.
 */

// --- ESTADO INICIAL ---
const STORAGE_KEY = 'foco_tarefas_app_data_v1';

// Perfis sugeridos de Pomodoro
const TIMER_PROFILES = {
  quick: {
    id: 'quick',
    name: 'Rápido',
    icon: '⚡',
    description: 'Sessões rápidas',
    focusTime: 15,
    shortBreak: 3,
    longBreak: 10
  },
  traditional: {
    id: 'traditional',
    name: 'Tradicional',
    icon: '🍅',
    description: 'Padrão clássico',
    focusTime: 25,
    shortBreak: 5,
    longBreak: 15
  },
  long: {
    id: 'long',
    name: 'Longo',
    icon: '🚀',
    description: 'Sessões longas',
    focusTime: 50,
    shortBreak: 10,
    longBreak: 30
  }
};

const DEFAULT_STATE = {
  theme: 'dark',
  soundEnabled: true,
  widgetMode: false,
  activeListId: 'default-1',
  lists: [
    {
      id: 'default-1',
      name: 'Minhas Tarefas',
      icon: '📋',
      tasks: [
        { id: 't-1', text: 'Experimentar o timer Pomodoro de 25 minutos 🍅', completed: false, createdAt: Date.now() },
        { id: 't-2', text: 'Criar uma nova lista personalizada no menu lateral ➕', completed: false, createdAt: Date.now() },
        { id: 't-3', text: 'Marcar esta tarefa como concluída ✅', completed: true, createdAt: Date.now() }
      ]
    },
    {
      id: 'default-2',
      name: 'Trabalho / Estudos',
      icon: '💼',
      tasks: [
        { id: 't-4', text: 'Revisar anotações e planejamento semanal', completed: false, createdAt: Date.now() }
      ]
    }
  ],
  pomodoro: {
    mode: 'focus', // 'focus' | 'shortBreak' | 'longBreak'
    cycles: 0,
    focusedTaskId: null,
    settings: {
      profile: 'traditional', // 'quick' | 'traditional' | 'long' | 'custom'
      focusTime: 25,
      shortBreak: 5,
      longBreak: 15
    }
  }
};

// --- CARREGAR / SALVAR ESTADO ---
let appState = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge com defaults para caso falte alguma chave
      return {
        ...DEFAULT_STATE,
        ...parsed,
        pomodoro: {
          ...DEFAULT_STATE.pomodoro,
          ...(parsed.pomodoro || {}),
          settings: {
            ...DEFAULT_STATE.pomodoro.settings,
            ...((parsed.pomodoro && parsed.pomodoro.settings) || {})
          }
        }
      };
    }
  } catch (e) {
    console.error('Erro ao ler dados salvos:', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (e) {
    console.error('Erro ao salvar dados:', e);
  }
}

// --- VARIÁVEIS DE EXECUÇÃO DO TIMER ---
let timerInterval = null;
let timerRunning = false;
let timerTimeLeft = appState.pomodoro.settings.focusTime * 60;
let timerTotalDuration = timerTimeLeft;
let timerTargetEndTimestamp = null;
let currentFilter = 'all'; // 'all' | 'active' | 'completed'

// Configurações do anel de progresso (raio = 105)
const RING_RADIUS = 105;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// --- ELEMENTOS DO DOM ---
const bodyEl = document.body;
const sidebarListsNav = document.getElementById('lists-nav');
const btnNewList = document.getElementById('btn-new-list');
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const themeText = document.getElementById('theme-text');
const btnOpenSettings = document.getElementById('btn-open-settings');
const btnSidebarWidget = document.getElementById('btn-sidebar-widget');

// Widget Elements
const btnToggleWidget = document.getElementById('btn-toggle-widget');
const btnExitWidget = document.getElementById('btn-exit-widget');
const widgetListSelect = document.getElementById('widget-list-select');

// Pomodoro Elements
const modeTabs = document.querySelectorAll('.mode-tab');
const timerTimeEl = document.getElementById('timer-time');
const timerStatusLabel = document.getElementById('timer-status-label');
const progressIndicator = document.getElementById('progress-indicator');
const btnTimerToggle = document.getElementById('btn-timer-toggle');
const timerToggleText = document.getElementById('timer-toggle-text');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const btnTimerSkip = document.getElementById('btn-timer-skip');
const btnTimerReset = document.getElementById('btn-timer-reset');
const btnSoundToggle = document.getElementById('btn-sound-toggle');
const soundIconOn = document.getElementById('sound-icon-on');
const soundIconOff = document.getElementById('sound-icon-off');
const cyclesCountEl = document.getElementById('cycles-count');
const focusedTaskBanner = document.getElementById('focused-task-banner');
const focusedTaskNameEl = document.getElementById('focused-task-name');
const btnClearFocusTask = document.getElementById('btn-clear-focus-task');

// Tasks Elements
const currentListIcon = document.getElementById('current-list-icon');
const currentListTitle = document.getElementById('current-list-title');
const tasksSummary = document.getElementById('tasks-summary');
const btnRenameList = document.getElementById('btn-rename-list');
const btnDeleteList = document.getElementById('btn-delete-list');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const tasksListEl = document.getElementById('tasks-list');
const tasksEmptyState = document.getElementById('tasks-empty-state');
const filterPills = document.querySelectorAll('.filter-pill');
const countAllEl = document.getElementById('count-all');
const countActiveEl = document.getElementById('count-active');
const countCompletedEl = document.getElementById('count-completed');
const btnClearCompleted = document.getElementById('btn-clear-completed');

// Modals
const modalNewList = document.getElementById('modal-new-list');
const btnCloseNewListModal = document.getElementById('btn-close-new-list-modal');
const btnCancelNewList = document.getElementById('btn-cancel-new-list');
const formCreateList = document.getElementById('form-create-list');
const newListInput = document.getElementById('new-list-name');
const emojiOptions = document.querySelectorAll('.emoji-option');
let selectedEmoji = '📋';

const modalSettings = document.getElementById('modal-settings');
const btnCloseSettingsModal = document.getElementById('btn-close-settings-modal');
const btnCancelSettings = document.getElementById('btn-cancel-settings');
const formSettings = document.getElementById('form-settings');
const setFocusTime = document.getElementById('set-focus-time');
const setShortBreak = document.getElementById('set-short-break');
const setLongBreak = document.getElementById('set-long-break');
const profileCards = document.querySelectorAll('.profile-card');

// Pomodoro Profile Pill
const btnQuickSettings = document.getElementById('btn-quick-settings');
const profilePillIcon = document.getElementById('profile-pill-icon');
const profilePillText = document.getElementById('profile-pill-text');

const toastEl = document.getElementById('toast');
let toastTimeout = null;

// --- INICIALIZAÇÃO DO ANEL SVG ---
progressIndicator.style.strokeDasharray = `${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`;
progressIndicator.style.strokeDashoffset = '0';

// --- SISTEMA DE ÁUDIO VIA WEB AUDIO API ---
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq, type = 'sine', duration = 0.15, startTime = 0, gainVal = 0.2) {
  if (!appState.soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

    gain.gain.setValueAtTime(gainVal, ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
  } catch (e) {
    console.warn('Áudio não pôde ser reproduzido:', e);
  }
}

function playAlarmSound() {
  if (!appState.soundEnabled) return;
  // Arpejo harmonioso alegre indicando conclusão de ciclo
  playTone(523.25, 'triangle', 0.25, 0.00, 0.3); // C5
  playTone(659.25, 'triangle', 0.25, 0.18, 0.3); // E5
  playTone(783.99, 'triangle', 0.25, 0.36, 0.3); // G5
  playTone(1046.50, 'triangle', 0.45, 0.54, 0.35); // C6
}

function playCheckSound() {
  if (!appState.soundEnabled) return;
  playTone(880, 'sine', 0.08, 0.0, 0.15);
  playTone(1320, 'sine', 0.12, 0.06, 0.15);
}

function playClickSound() {
  if (!appState.soundEnabled) return;
  playTone(440, 'triangle', 0.04, 0.0, 0.08);
}

// --- NOTIFICAÇÕES DESKTOP ---
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotification(title, message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: message,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🍅</text></svg>'
      });
    } catch (e) {
      console.warn('Erro ao disparar notificação desktop:', e);
    }
  }
}

// --- TOAST FEEDBACK ---
function showToast(message) {
  if (toastTimeout) clearTimeout(toastTimeout);
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  toastTimeout = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 2600);
}

// --- RENDERIZADORES ---

// Atualiza o tema da interface (Dark, Vampire, Light)
function applyTheme() {
  bodyEl.classList.remove('dark-theme', 'light-theme', 'vampire-theme');

  if (appState.theme === 'vampire') {
    bodyEl.classList.add('vampire-theme');
    themeText.textContent = 'Modo Vampire';
  } else if (appState.theme === 'light') {
    bodyEl.classList.add('light-theme');
    themeText.textContent = 'Modo Claro';
  } else {
    // Padrão: Modo Escuro
    appState.theme = 'dark';
    bodyEl.classList.add('dark-theme');
    themeText.textContent = 'Modo Escuro';
  }
}

// Atualiza ícone de som
function applySoundState() {
  if (appState.soundEnabled) {
    soundIconOn.classList.remove('hidden');
    soundIconOff.classList.add('hidden');
  } else {
    soundIconOn.classList.add('hidden');
    soundIconOff.classList.remove('hidden');
  }
}

// Retorna a lista ativa
function getActiveList() {
  let list = appState.lists.find(l => l.id === appState.activeListId);
  if (!list && appState.lists.length > 0) {
    appState.activeListId = appState.lists[0].id;
    list = appState.lists[0];
  }
  return list;
}

// Renderiza a barra lateral com as listas
function renderSidebarLists() {
  sidebarListsNav.innerHTML = '';
  
  appState.lists.forEach(list => {
    const li = document.createElement('li');
    li.className = `list-nav-item ${list.id === appState.activeListId ? 'active' : ''}`;
    li.dataset.listId = list.id;

    const uncompletedCount = list.tasks.filter(t => !t.completed).length;

    li.innerHTML = `
      <div class="list-nav-content">
        <span class="list-nav-icon">${list.icon || '📋'}</span>
        <span class="list-nav-title">${escapeHtml(list.name)}</span>
      </div>
      <span class="badge-count">${uncompletedCount}</span>
    `;

    li.addEventListener('click', () => {
      if (appState.activeListId !== list.id) {
        appState.activeListId = list.id;
        saveState();
        renderAll();
      }
    });

    sidebarListsNav.appendChild(li);
  });
}

// Renderiza o cabeçalho e as tarefas da lista atual
function renderTasksArea() {
  const list = getActiveList();
  if (!list) return;

  currentListIcon.textContent = list.icon || '📋';
  currentListTitle.textContent = list.name;

  const total = list.tasks.length;
  const completed = list.tasks.filter(t => t.completed).length;
  const pending = total - completed;

  tasksSummary.textContent = `${pending} pendente${pending === 1 ? '' : 's'} de ${total} tarefa${total === 1 ? '' : 's'}`;
  countAllEl.textContent = total;
  countActiveEl.textContent = pending;
  countCompletedEl.textContent = completed;

  // Filtragem
  let filteredTasks = list.tasks;
  if (currentFilter === 'active') {
    filteredTasks = list.tasks.filter(t => !t.completed);
  } else if (currentFilter === 'completed') {
    filteredTasks = list.tasks.filter(t => t.completed);
  }

  tasksListEl.innerHTML = '';

  if (filteredTasks.length === 0) {
    tasksEmptyState.classList.remove('hidden');
  } else {
    tasksEmptyState.classList.add('hidden');

    filteredTasks.forEach(task => {
      const isFocused = appState.pomodoro.focusedTaskId === task.id;
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''} ${isFocused ? 'is-focused-task' : ''}`;
      li.dataset.taskId = task.id;

      li.innerHTML = `
        <div class="task-item-left">
          <input type="checkbox" class="custom-checkbox" ${task.completed ? 'checked' : ''} title="Marcar como concluída">
          <span class="task-text">${escapeHtml(task.text)}</span>
        </div>
        <div class="task-actions">
          <button class="btn-focus-task" title="Focar nesta tarefa no Pomodoro">
            ${isFocused ? '🎯 Focada' : '🎯 Focar'}
          </button>
          <button class="btn-delete-task" title="Excluir tarefa">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      `;

      // Checkbox toggle
      const checkbox = li.querySelector('.custom-checkbox');
      checkbox.addEventListener('change', () => {
        task.completed = checkbox.checked;
        if (task.completed) playCheckSound();
        saveState();
        renderSidebarLists();
        renderTasksArea();
      });

      // Focar tarefa
      const btnFocus = li.querySelector('.btn-focus-task');
      btnFocus.addEventListener('click', () => {
        if (appState.pomodoro.focusedTaskId === task.id) {
          appState.pomodoro.focusedTaskId = null;
        } else {
          appState.pomodoro.focusedTaskId = task.id;
          showToast(`🎯 Tarefa em foco: "${task.text}"`);
        }
        saveState();
        renderTasksArea();
        renderFocusedTaskBanner();
      });

      // Excluir tarefa
      const btnDelete = li.querySelector('.btn-delete-task');
      btnDelete.addEventListener('click', () => {
        if (appState.pomodoro.focusedTaskId === task.id) {
          appState.pomodoro.focusedTaskId = null;
        }
        list.tasks = list.tasks.filter(t => t.id !== task.id);
        saveState();
        renderAll();
      });

      tasksListEl.appendChild(li);
    });
  }

  // Ajusta dinamicamente o tamanho da janela conforme itens na lista
  if (appState.widgetMode) {
    adjustWidgetWindowSize();
  }
}

// Banner da tarefa em foco atual
function renderFocusedTaskBanner() {
  const focusedId = appState.pomodoro.focusedTaskId;
  let foundTask = null;

  if (focusedId) {
    for (const list of appState.lists) {
      const t = list.tasks.find(x => x.id === focusedId);
      if (t) {
        foundTask = t;
        break;
      }
    }
  }

  if (foundTask) {
    focusedTaskNameEl.textContent = foundTask.text;
    btnClearFocusTask.style.display = 'inline-block';
  } else {
    appState.pomodoro.focusedTaskId = null;
    focusedTaskNameEl.textContent = 'Nenhuma tarefa vinculada ao timer';
    btnClearFocusTask.style.display = 'none';
  }
}

// Renderiza indicador do perfil de tempo do Pomodoro
function renderProfilePill() {
  if (!btnQuickSettings || !profilePillIcon || !profilePillText) return;
  const { focusTime, shortBreak, longBreak } = appState.pomodoro.settings;

  let matchedProf = null;
  for (const prof of Object.values(TIMER_PROFILES)) {
    if (prof.focusTime === focusTime && prof.shortBreak === shortBreak && prof.longBreak === longBreak) {
      matchedProf = prof;
      break;
    }
  }

  if (matchedProf) {
    profilePillIcon.textContent = matchedProf.icon;
    profilePillText.textContent = `${matchedProf.name} (${matchedProf.focusTime}/${matchedProf.shortBreak}m)`;
  } else {
    profilePillIcon.textContent = '⚙️';
    profilePillText.textContent = `Personalizado (${focusTime}/${shortBreak}m)`;
  }
}

// Dimensões do Modo Widget
const WIDGET_WIDTH = 380;
const MIN_WIDGET_HEIGHT = 440;
const NORMAL_WIDTH = 1200;
const NORMAL_HEIGHT = 800;

let lastNormalWindowSize = {
  width: NORMAL_WIDTH,
  height: NORMAL_HEIGHT,
  x: null,
  y: null
};

let widgetStandaloneWindow = null;

// Calcula a altura ideal da janela do widget baseado no número de tarefas atuais
function getDynamicWidgetHeight() {
  const container = document.querySelector('.app-container');
  const contentHeight = container ? container.getBoundingClientRect().height : 480;

  // Barra de título e bordas nativas da janela do Windows
  const frameDiff = window.outerHeight - window.innerHeight;
  const frameHeight = (frameDiff > 0 && frameDiff < 140) ? frameDiff : 38;
  const paddingOffset = 20;

  const calculatedTotal = Math.ceil(contentHeight + paddingOffset + frameHeight);

  // Limite máximo: até 900px ou 93% da altura útil da tela
  const screenMax = Math.floor(screen.availHeight * 0.93);
  const MAX_WIDGET_HEIGHT = Math.min(900, screenMax);

  return Math.max(MIN_WIDGET_HEIGHT, Math.min(MAX_WIDGET_HEIGHT, calculatedTotal));
}

// Ajusta a altura da janela dinamicamente conforme itens são adicionados/removidos
function adjustWidgetWindowSize() {
  if (!appState.widgetMode) return;

  requestAnimationFrame(() => {
    const targetHeight = getDynamicWidgetHeight();

    try {
      window.resizeTo(WIDGET_WIDTH, targetHeight);
    } catch (e) {
      console.warn('Redimensionamento dinâmico ignorado pelo navegador:', e);
    }

    if (widgetStandaloneWindow && !widgetStandaloneWindow.closed) {
      try {
        widgetStandaloneWindow.resizeTo(WIDGET_WIDTH, targetHeight);
      } catch (e) {}
    }
  });
}

// Renderiza o seletor de listas do Modo Widget
function renderWidgetListSelect() {
  if (!widgetListSelect) return;
  widgetListSelect.innerHTML = appState.lists.map(list => {
    const isSelected = list.id === appState.activeListId ? 'selected' : '';
    return `<option value="${list.id}" ${isSelected}>${list.icon || '📋'} ${escapeHtml(list.name)}</option>`;
  }).join('');
}

// Abre uma janela popup de formato estritamente fixo quando o navegador bloqueia resizeTo na janela principal
function openFixedWidgetWindow() {
  if (widgetStandaloneWindow && !widgetStandaloneWindow.closed) {
    widgetStandaloneWindow.focus();
    return;
  }

  const targetHeight = getDynamicWidgetHeight();
  const targetLeft = Math.max(0, screen.availWidth - WIDGET_WIDTH - 25);
  const targetTop = 30;

  widgetStandaloneWindow = window.open(
    'index.html#widget',
    'PomodoroWidgetFixed',
    `width=${WIDGET_WIDTH},height=${targetHeight},left=${targetLeft},top=${targetTop},menubar=no,toolbar=no,location=no,status=no,resizable=no`
  );

  if (widgetStandaloneWindow) {
    widgetStandaloneWindow.focus();
    // Restaura a janela de fundo para o modo normal para não ficar com layout reduzido
    bodyEl.classList.remove('widget-mode');
    appState.widgetMode = false;
    saveState();
  }
}

// Controle do Modo Widget (Janela Pequena e Formato Fixo que Acompanha Itens)
function setWidgetMode(enabled, showNotification = true) {
  appState.widgetMode = !!enabled;

  if (appState.widgetMode) {
    bodyEl.classList.add('widget-mode');

    // Salva o tamanho atual da janela para poder restaurar depois
    if (window.outerWidth > 500) {
      lastNormalWindowSize.width = window.outerWidth;
      lastNormalWindowSize.height = window.outerHeight;
      lastNormalWindowSize.x = window.screenX !== undefined ? window.screenX : null;
      lastNormalWindowSize.y = window.screenY !== undefined ? window.screenY : null;
    }

    // 1. Tenta posicionar no canto e redimensionar a altura dinamicamente para os itens atuais
    const targetLeft = Math.max(0, screen.availWidth - WIDGET_WIDTH - 25);
    const targetTop = 30;

    try {
      window.moveTo(targetLeft, targetTop);
    } catch (e) {}

    adjustWidgetWindowSize();

    // 2. Se a janela atual for uma aba padrão do navegador e ignorou o resizeTo (largura continua grande)
    setTimeout(() => {
      if (window.outerWidth > 520) {
        // Abre automaticamente uma janela compacta com tamanho e formato fixo garantido
        openFixedWidgetWindow();
      }
    }, 120);

    if (showNotification) {
      showToast('Modo Widget ativo: altura acompanha itens sem barra de rolar! 🍅');
    }
  } else {
    // Se esta janela é um popup que foi aberto a partir de outra janela
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.focus();
      } catch (e) {}
      window.close();
      return;
    }

    bodyEl.classList.remove('widget-mode');

    // Restaura o tamanho e posição normais da janela
    try {
      const restW = lastNormalWindowSize.width || NORMAL_WIDTH;
      const restH = lastNormalWindowSize.height || NORMAL_HEIGHT;
      const restX = lastNormalWindowSize.x !== null ? lastNormalWindowSize.x : Math.max(0, (screen.availWidth - restW) / 2);
      const restY = lastNormalWindowSize.y !== null ? lastNormalWindowSize.y : Math.max(0, (screen.availHeight - restH) / 2);

      window.resizeTo(restW, restH);
      window.moveTo(restX, restY);
    } catch (e) {
      console.warn('Restauração de janela bloqueada pelo navegador:', e);
    }

    if (showNotification) {
      showToast('Janela restaurada ao tamanho normal.');
    }
  }

  saveState();
  renderWidgetListSelect();
}

function toggleWidgetMode() {
  playClickSound();
  setWidgetMode(!appState.widgetMode, true);
}

// Renderiza tudo da aplicação
function renderAll() {
  applyTheme();
  applySoundState();
  renderSidebarLists();
  renderWidgetListSelect();
  renderTasksArea();
  renderFocusedTaskBanner();
  renderProfilePill();
  updateTimerDisplay();
  cyclesCountEl.textContent = appState.pomodoro.cycles;
}

// --- LÓGICA DO POMODORO TIMER ---

function getDurationForMode(mode) {
  const { focusTime, shortBreak, longBreak } = appState.pomodoro.settings;
  switch (mode) {
    case 'shortBreak': return shortBreak * 60;
    case 'longBreak': return longBreak * 60;
    case 'focus':
    default:
      return focusTime * 60;
  }
}

function setTimerMode(mode, autoStart = false) {
  stopTimer();
  appState.pomodoro.mode = mode;

  // Atualizar classes no body para estilização condicional
  bodyEl.classList.remove('mode-focus', 'mode-shortBreak', 'mode-longBreak');
  bodyEl.classList.add(`mode-${mode}`);

  // Atualizar tabs ativas
  modeTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });

  const duration = getDurationForMode(mode);
  timerTimeLeft = duration;
  timerTotalDuration = duration;

  updateTimerDisplay();
  saveState();

  if (autoStart) {
    startTimer();
  }
}

function updateTimerDisplay() {
  const minutes = Math.floor(timerTimeLeft / 60);
  const seconds = timerTimeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  timerTimeEl.textContent = timeFormatted;

  let modeLabel = 'Modo Foco';
  let emoji = '🍅';
  if (appState.pomodoro.mode === 'shortBreak') {
    modeLabel = 'Pausa Curta';
    emoji = '☕';
  } else if (appState.pomodoro.mode === 'longBreak') {
    modeLabel = 'Pausa Longa';
    emoji = '🛋️';
  }
  timerStatusLabel.textContent = modeLabel;

  // Atualiza título da aba do navegador para visibilidade fácil
  document.title = `(${timeFormatted}) ${emoji} ${modeLabel} - Foco & Tarefas`;

  // Atualiza o progresso visual do anel SVG
  const fraction = timerTotalDuration > 0 ? (timerTimeLeft / timerTotalDuration) : 0;
  const offset = RING_CIRCUMFERENCE - (fraction * RING_CIRCUMFERENCE);
  progressIndicator.style.strokeDashoffset = offset;
}

function startTimer() {
  getAudioContext();
  requestNotificationPermission();

  timerRunning = true;
  playIcon.classList.add('hidden');
  pauseIcon.classList.remove('hidden');
  timerToggleText.textContent = 'Pausar';

  timerTargetEndTimestamp = Date.now() + (timerTimeLeft * 1000);

  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const remainingMs = timerTargetEndTimestamp - Date.now();
    const remainingSec = Math.ceil(remainingMs / 1000);

    if (remainingSec <= 0) {
      timerTimeLeft = 0;
      updateTimerDisplay();
      handleTimerComplete();
    } else {
      timerTimeLeft = remainingSec;
      updateTimerDisplay();
    }
  }, 250);
}

function stopTimer() {
  timerRunning = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  playIcon.classList.remove('hidden');
  pauseIcon.classList.add('hidden');
  timerToggleText.textContent = 'Começar';
}

function toggleTimer() {
  playClickSound();
  if (timerRunning) {
    stopTimer();
  } else {
    startTimer();
  }
}

function resetTimer() {
  playClickSound();
  stopTimer();
  const duration = getDurationForMode(appState.pomodoro.mode);
  timerTimeLeft = duration;
  timerTotalDuration = duration;
  updateTimerDisplay();
}

function skipTimer() {
  playClickSound();
  stopTimer();
  handleTimerComplete(false); // Pular sem incrementar ciclos de foco
}

function handleTimerComplete(countCycle = true) {
  stopTimer();
  playAlarmSound();

  const currentMode = appState.pomodoro.mode;

  if (currentMode === 'focus') {
    if (countCycle) {
      appState.pomodoro.cycles += 1;
      cyclesCountEl.textContent = appState.pomodoro.cycles;
      saveState();
    }

    sendNotification('🍅 Pomodoro Concluído!', 'Excelente foco! Hora de descansar a mente.');
    showToast('🎉 Ciclo de foco concluído! Bom descanso.');

    // A cada 4 ciclos de foco, intervalo longo
    if (appState.pomodoro.cycles > 0 && appState.pomodoro.cycles % 4 === 0) {
      setTimerMode('longBreak');
    } else {
      setTimerMode('shortBreak');
    }
  } else {
    sendNotification('⚡ Pausa Encerrada!', 'Descanso finalizado. Pronto para o próximo bloco de foco?');
    showToast('⏰ Pausa encerrada! Vamos voltar ao foco.');
    setTimerMode('focus');
  }
}

// --- EVENT LISTENERS ---

// Modos de Timer
modeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    playClickSound();
    setTimerMode(tab.dataset.mode);
  });
});

btnTimerToggle.addEventListener('click', toggleTimer);
btnTimerReset.addEventListener('click', resetTimer);
btnTimerSkip.addEventListener('click', skipTimer);

// Som On/Off
btnSoundToggle.addEventListener('click', () => {
  appState.soundEnabled = !appState.soundEnabled;
  applySoundState();
  saveState();
  showToast(appState.soundEnabled ? '🔊 Som ativado' : '🔇 Som desativado');
});

// Desvincular tarefa do banner
btnClearFocusTask.addEventListener('click', () => {
  appState.pomodoro.focusedTaskId = null;
  saveState();
  renderFocusedTaskBanner();
  renderTasksArea();
});

// Formulário de adicionar tarefa
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;

  const currentList = getActiveList();
  if (!currentList) return;

  const newTask = {
    id: 't-' + Date.now(),
    text: text,
    completed: false,
    createdAt: Date.now()
  };

  currentList.tasks.unshift(newTask);
  taskInput.value = '';
  saveState();
  renderSidebarLists();
  renderTasksArea();
  playClickSound();
  showToast('✓ Tópico adicionado');
});

// Filtros de Tarefas
filterPills.forEach(pill => {
  pill.addEventListener('click', () => {
    filterPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentFilter = pill.dataset.filter;
    renderTasksArea();
  });
});

// Limpar concluídas
btnClearCompleted.addEventListener('click', () => {
  const currentList = getActiveList();
  if (!currentList) return;
  const initialLength = currentList.tasks.length;
  currentList.tasks = currentList.tasks.filter(t => !t.completed);
  if (currentList.tasks.length < initialLength) {
    saveState();
    renderAll();
    showToast('Tarefas concluídas removidas.');
  }
});

// Alternar Tema (Escuro -> Vampire -> Claro -> Escuro)
btnThemeToggle.addEventListener('click', () => {
  const nextThemeMap = {
    'dark': 'vampire',
    'vampire': 'light',
    'light': 'dark'
  };
  appState.theme = nextThemeMap[appState.theme] || 'dark';
  applyTheme();
  saveState();

  if (appState.theme === 'vampire') {
    showToast('Modo Vampire ativado! 🦇');
  } else if (appState.theme === 'light') {
    showToast('Modo Claro ativado! ☀️');
  } else {
    showToast('Modo Escuro ativado! 🌙');
  }
});

// Renomear Lista Atual
btnRenameList.addEventListener('click', () => {
  const currentList = getActiveList();
  if (!currentList) return;
  const newName = prompt('Novo nome para esta lista:', currentList.name);
  if (newName && newName.trim()) {
    currentList.name = newName.trim();
    saveState();
    renderAll();
    showToast('Lista renomeada.');
  }
});

// Excluir Lista Atual
btnDeleteList.addEventListener('click', () => {
  if (appState.lists.length <= 1) {
    alert('Você não pode excluir sua única lista.');
    return;
  }
  const currentList = getActiveList();
  if (!currentList) return;

  const confirmed = confirm(`Tem certeza que deseja excluir a lista "${currentList.name}" e todas as suas tarefas?`);
  if (confirmed) {
    appState.lists = appState.lists.filter(l => l.id !== currentList.id);
    appState.activeListId = appState.lists[0].id;
    saveState();
    renderAll();
    showToast('Lista excluída.');
  }
});

// MODAL: Criar Nova Lista
btnNewList.addEventListener('click', () => {
  modalNewList.classList.remove('hidden');
  newListInput.value = '';
  newListInput.focus();
});

btnCloseNewListModal.addEventListener('click', () => modalNewList.classList.add('hidden'));
btnCancelNewList.addEventListener('click', () => modalNewList.classList.add('hidden'));

emojiOptions.forEach(opt => {
  opt.addEventListener('click', () => {
    emojiOptions.forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    selectedEmoji = opt.dataset.emoji;
  });
});

formCreateList.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = newListInput.value.trim();
  if (!name) return;

  const newList = {
    id: 'list-' + Date.now(),
    name: name,
    icon: selectedEmoji || '📋',
    tasks: []
  };

  appState.lists.push(newList);
  appState.activeListId = newList.id;
  saveState();
  modalNewList.classList.add('hidden');
  renderAll();
  showToast(`Lista "${name}" criada!`);
});

// Sincroniza a seleção visual do cartão de perfil de acordo com os minutos informados
function syncProfileSelection(focus, shortB, longB) {
  let matchedKey = null;
  for (const [key, prof] of Object.entries(TIMER_PROFILES)) {
    if (prof.focusTime === focus && prof.shortBreak === shortB && prof.longBreak === longB) {
      matchedKey = key;
      break;
    }
  }

  profileCards.forEach(card => {
    card.classList.toggle('selected', card.dataset.profile === matchedKey);
  });
}

function openSettingsModal() {
  const { focusTime, shortBreak, longBreak } = appState.pomodoro.settings;
  setFocusTime.value = focusTime;
  setShortBreak.value = shortBreak;
  setLongBreak.value = longBreak;
  syncProfileSelection(focusTime, shortBreak, longBreak);
  modalSettings.classList.remove('hidden');
}

// MODAL: Ajustes de Tempo
btnOpenSettings.addEventListener('click', openSettingsModal);
if (btnQuickSettings) {
  btnQuickSettings.addEventListener('click', openSettingsModal);
}

btnCloseSettingsModal.addEventListener('click', () => modalSettings.classList.add('hidden'));
btnCancelSettings.addEventListener('click', () => modalSettings.classList.add('hidden'));

// Clique em cartão de perfil sugerido
profileCards.forEach(card => {
  card.addEventListener('click', () => {
    playClickSound();
    const profKey = card.dataset.profile;
    const prof = TIMER_PROFILES[profKey];
    if (prof) {
      setFocusTime.value = prof.focusTime;
      setShortBreak.value = prof.shortBreak;
      setLongBreak.value = prof.longBreak;
      profileCards.forEach(c => c.classList.toggle('selected', c === card));
    }
  });
});

// Ao digitar nos inputs, sincronizar se corresponde a algum perfil
[setFocusTime, setShortBreak, setLongBreak].forEach(input => {
  input.addEventListener('input', () => {
    const f = parseInt(setFocusTime.value, 10);
    const s = parseInt(setShortBreak.value, 10);
    const l = parseInt(setLongBreak.value, 10);
    syncProfileSelection(f, s, l);
  });
});

formSettings.addEventListener('submit', (e) => {
  e.preventDefault();
  const focusVal = parseInt(setFocusTime.value, 10);
  const shortVal = parseInt(setShortBreak.value, 10);
  const longVal = parseInt(setLongBreak.value, 10);

  if (focusVal > 0 && shortVal > 0 && longVal > 0) {
    let matchedProfile = 'custom';
    for (const [key, prof] of Object.entries(TIMER_PROFILES)) {
      if (prof.focusTime === focusVal && prof.shortBreak === shortVal && prof.longBreak === longVal) {
        matchedProfile = key;
        break;
      }
    }

    appState.pomodoro.settings.profile = matchedProfile;
    appState.pomodoro.settings.focusTime = focusVal;
    appState.pomodoro.settings.shortBreak = shortVal;
    appState.pomodoro.settings.longBreak = longVal;
    saveState();
    modalSettings.classList.add('hidden');

    // Reinicia o timer atual com o novo tempo
    resetTimer();
    renderProfilePill();

    const prof = TIMER_PROFILES[matchedProfile];
    if (prof) {
      showToast(`Perfil ${prof.name} ativado (${prof.focusTime}/${prof.shortBreak}m)! ${prof.icon}`);
    } else {
      showToast(`Tempos personalizados salvos (${focusVal}/${shortVal}m)! ⏱️`);
    }
  }
});

// Fechar modais ao clicar no fundo escuro
window.addEventListener('click', (e) => {
  if (e.target === modalNewList) modalNewList.classList.add('hidden');
  if (e.target === modalSettings) modalSettings.classList.add('hidden');
});

// Eventos do Modo Widget
if (btnSidebarWidget) btnSidebarWidget.addEventListener('click', toggleWidgetMode);
if (btnToggleWidget) btnToggleWidget.addEventListener('click', toggleWidgetMode);
if (btnExitWidget) btnExitWidget.addEventListener('click', toggleWidgetMode);

if (widgetListSelect) {
  widgetListSelect.addEventListener('change', (e) => {
    appState.activeListId = e.target.value;
    saveState();
    renderAll();
    playClickSound();
  });
}

// Atalhos de Teclado (W para Modo Widget, Esc para fechar/voltar)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!modalNewList.classList.contains('hidden')) {
      modalNewList.classList.add('hidden');
    } else if (!modalSettings.classList.contains('hidden')) {
      modalSettings.classList.add('hidden');
    } else if (appState.widgetMode) {
      setWidgetMode(false, true);
    }
    return;
  }

  // Tecla 'W' para alternar modo widget (exceto quando digitando em campo de texto)
  const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

  if (e.key === 'w' || e.key === 'W') {
    e.preventDefault();
    toggleWidgetMode();
  }
});

// Função utilitária de escape
function escapeHtml(string) {
  const div = document.createElement('div');
  div.textContent = string;
  return div.innerHTML;
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  // Ativa modo widget se vier pela hashtag #widget na URL ou se já estava salvo
  if (window.location.hash === '#widget') {
    appState.widgetMode = true;
  }
  if (appState.widgetMode) {
    setWidgetMode(true, false);
  }
  setTimerMode(appState.pomodoro.mode);
  renderAll();
});

// Sincronização em tempo real caso múltiplas janelas estejam abertas
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    appState = loadState();
    renderAll();
  }
});
