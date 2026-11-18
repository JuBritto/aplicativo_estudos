/**
 * Foco & Tarefas - Pomodoro & To-Do List
 * Aplicação local com persistência em LocalStorage e Web Audio API.
 */

// --- ESTADO INICIAL ---
const STORAGE_KEY = 'foco_tarefas_app_data_v1';

const DEFAULT_STATE = {
  theme: 'dark',
  soundEnabled: true,
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

// Atualiza o tema da interface
function applyTheme() {
  if (appState.theme === 'dark') {
    bodyEl.classList.remove('light-theme');
    bodyEl.classList.add('dark-theme');
    themeText.textContent = 'Modo Claro';
  } else {
    bodyEl.classList.remove('dark-theme');
    bodyEl.classList.add('light-theme');
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

// Renderiza tudo da aplicação
function renderAll() {
  applyTheme();
  applySoundState();
  renderSidebarLists();
  renderTasksArea();
  renderFocusedTaskBanner();
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

// Alternar Tema
btnThemeToggle.addEventListener('click', () => {
  appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  saveState();
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

// MODAL: Ajustes de Tempo
btnOpenSettings.addEventListener('click', () => {
  setFocusTime.value = appState.pomodoro.settings.focusTime;
  setShortBreak.value = appState.pomodoro.settings.shortBreak;
  setLongBreak.value = appState.pomodoro.settings.longBreak;
  modalSettings.classList.remove('hidden');
});

btnCloseSettingsModal.addEventListener('click', () => modalSettings.classList.add('hidden'));
btnCancelSettings.addEventListener('click', () => modalSettings.classList.add('hidden'));

formSettings.addEventListener('submit', (e) => {
  e.preventDefault();
  const focusVal = parseInt(setFocusTime.value, 10);
  const shortVal = parseInt(setShortBreak.value, 10);
  const longVal = parseInt(setLongBreak.value, 10);

  if (focusVal > 0 && shortVal > 0 && longVal > 0) {
    appState.pomodoro.settings.focusTime = focusVal;
    appState.pomodoro.settings.shortBreak = shortVal;
    appState.pomodoro.settings.longBreak = longVal;
    saveState();
    modalSettings.classList.add('hidden');
    // Reinicia o timer atual com o novo tempo
    resetTimer();
    showToast('Ajustes salvos!');
  }
});

// Fechar modais ao clicar no fundo escuro
window.addEventListener('click', (e) => {
  if (e.target === modalNewList) modalNewList.classList.add('hidden');
  if (e.target === modalSettings) modalSettings.classList.add('hidden');
});

// Esc para fechar modais
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    modalNewList.classList.add('hidden');
    modalSettings.classList.add('hidden');
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
  setTimerMode(appState.pomodoro.mode);
  renderAll();
});
