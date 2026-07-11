const STORAGE_KEY = 'eisenhower-matrix-state';
const quadrantConfig = {
  do: { label: 'Do First' },
  schedule: { label: 'Schedule' },
  delegate: { label: 'Delegate' },
  eliminate: { label: 'Eliminate' },
};

let tasks = loadTasks();
let previousTasks = null;
let nextTasks = null;
let draggedTaskId = null;
let editingTaskId = null;
let selectedTaskId = null;
let searchQuery = '';

const taskForm = document.getElementById('task-form');
const titleInput = document.getElementById('task-title');
const quadrantSelect = document.getElementById('task-quadrant');
const searchInput = document.getElementById('task-search');
const resetButton = document.getElementById('reset-matrix');
const resetDialog = document.getElementById('reset-dialog');
const cancelResetButton = document.getElementById('cancel-reset');
const confirmResetButton = document.getElementById('confirm-reset');
const contextMenu = document.getElementById('context-menu');
const themeToggle = document.getElementById('theme-toggle');
const exportButton = document.getElementById('export-tasks');
const importButton = document.getElementById('import-tasks');
const importFileInput = document.getElementById('import-file');
const importDialog = document.getElementById('import-dialog');
const importCancelButton = document.getElementById('import-cancel');
const importMergeButton = document.getElementById('import-merge');
const importReplaceButton = document.getElementById('import-replace');
let activeContextTaskId = null;
let pendingImportData = null;

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.warn('Unable to load tasks', error);
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function saveUndo() {
  previousTasks = JSON.parse(JSON.stringify(tasks));
}

function undo() {
  if (!previousTasks) {
    return;
  }
  nextTasks = JSON.parse(JSON.stringify(tasks));
  tasks = previousTasks;
  previousTasks = null;
  saveTasks();
  render();
}

function redo() {
  if (!nextTasks) {
    return;
  }
  previousTasks = JSON.parse(JSON.stringify(tasks));
  tasks = nextTasks;
  nextTasks = null;
  saveTasks();
  render();
}

function deselectTask() {
  selectedTaskId = null;
  render();
}

function loadTheme() {
  const savedTheme = localStorage.getItem('eisenhower-matrix-theme') || 'dark';
  setTheme(savedTheme);
}

function setTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    themeToggle.textContent = '☀';
    localStorage.setItem('eisenhower-matrix-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeToggle.textContent = '☾';
    localStorage.setItem('eisenhower-matrix-theme', 'dark');
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
}

function exportTasks() {
  const dataStr = JSON.stringify(tasks, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  const now = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `eisenhower-matrix-backup-${now}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function importTasks() {
  importFileInput.click();
}

function openImportDialog(importedTasks) {
  pendingImportData = importedTasks;
  importDialog.hidden = false;
  importDialog.style.display = 'grid';
}

function closeImportDialog() {
  importDialog.hidden = true;
  importDialog.style.display = 'none';
  pendingImportData = null;
}

function mergeImportedTasks() {
  if (!pendingImportData) return;

  const merged = [...tasks, ...pendingImportData];
  tasks = merged;
  saveTasks();
  render();
  closeImportDialog();
}

function replaceWithImportedTasks() {
  if (!pendingImportData) return;

  tasks = pendingImportData;
  selectedTaskId = null;
  saveTasks();
  render();
  closeImportDialog();
}

function handleImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result;
      if (typeof content !== 'string') return;

      const importedData = JSON.parse(content);

      if (!Array.isArray(importedData)) {
        alert('Invalid format: expected an array of tasks');
        return;
      }

      if (importedData.length === 0) {
        alert('The file contains no tasks');
        return;
      }

      const validTasks = importedData.every(task =>
        task.id && typeof task.id === 'string' &&
        task.title && typeof task.title === 'string' &&
        task.quadrant && ['do', 'schedule', 'delegate', 'eliminate'].includes(task.quadrant)
      );

      if (!validTasks) {
        alert('Invalid format: tasks must have id, title, and quadrant properties');
        return;
      }

      openImportDialog(importedData);
    } catch (error) {
      alert('Error reading file: ' + error.message);
    }
  };

  reader.readAsText(file);
  importFileInput.value = '';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTaskContent(value) {
  const escaped = escapeHtml(value);
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  return escaped.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>').replace(/\n/g, '<br>');
}

function isTaskOverdue(task) {
  if (!task.dueDate) {
    return false;
  }

  const today = new Date();
  const dueDate = new Date(`${task.dueDate}T00:00:00`);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  return startOfDueDate < startOfToday;
}

function render() {
  hideContextMenu();
  editingTaskId = null;

  Object.keys(quadrantConfig).forEach((quadrant) => {
    const container = document.getElementById(quadrant);
    let cards = tasks.filter((task) => task.quadrant === quadrant && matchesSearch(task));

    cards.sort((a, b) => {
      const aOverdue = isTaskOverdue(a);
      const bOverdue = isTaskOverdue(b);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return 0;
    });

    container.innerHTML = '';

    if (!cards.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No cards yet. Add one or drop a card here.';
      container.appendChild(empty);
    } else {
      const fragment = document.createDocumentFragment();

      cards.forEach((task) => {
        const card = document.createElement('article');
        const overdue = isTaskOverdue(task);
        card.className = 'task-card';
        card.draggable = true;
        card.dataset.id = task.id;
        card.classList.toggle('is-selected', selectedTaskId === task.id);
        card.classList.toggle('is-overdue', overdue);
        card.innerHTML = `
          <div class="task-card__content">
            <p class="task-card__title">${formatTaskContent(task.title)}</p>
            <div class="task-card__meta">
              <span class="task-card__badge task-card__badge--priority">${quadrantConfig[task.quadrant].label}</span>
              ${task.dueDate ? `<span class="task-card__badge task-card__badge--due">Due ${formatDate(task.dueDate)}</span>` : ''}
              ${overdue ? '<span class="task-card__badge task-card__badge--overdue">Overdue</span>' : ''}
            </div>
            <label class="sr-only" for="task-due-${task.id}">Due date</label>
            <input id="task-due-${task.id}" class="task-card__due" type="date" value="${task.dueDate || ''}" />
          </div>
          <button class="task-card__delete" type="button" aria-label="Delete task">×</button>
        `;

        const deleteButton = card.querySelector('.task-card__delete');
        deleteButton.addEventListener('click', (event) => {
          event.stopPropagation();
          removeTask(task.id);
        });

        card.addEventListener('click', (event) => {
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            openContextMenu(event, task.id);
            return;
          }

          if (event.target.closest('.task-card__delete')) {
            return;
          }

          selectTask(task.id, card);
        });

        const titleElement = card.querySelector('.task-card__title');
        if (titleElement) {
          titleElement.addEventListener('click', (event) => {
            if (event.ctrlKey || event.metaKey) {
              event.preventDefault();
              return;
            }

            if (editingTaskId === task.id) {
              event.stopPropagation();
              return;
            }

            beginEdit(task.id, card);
          });
        }

        card.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          selectTask(task.id, card);
          openContextMenu(event, task.id);
        });

        const dueInput = card.querySelector('.task-card__due');
        dueInput.addEventListener('change', (event) => {
          task.dueDate = event.target.value;
          saveTasks();
          render();
        });

        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        card.addEventListener('dragover', (event) => {
          event.preventDefault();
          event.stopPropagation();
          card.classList.add('is-target');
        });
        card.addEventListener('dragleave', () => card.classList.remove('is-target'));
        card.addEventListener('drop', (event) => {
          event.preventDefault();
          event.stopPropagation();
          card.classList.remove('is-target');
          moveTask(draggedTaskId, quadrant, task.id);
        });

        fragment.appendChild(card);
      });

      container.appendChild(fragment);
    }
  });

  Object.entries(quadrantConfig).forEach(([quadrant]) => {
    const count = tasks.filter((task) => task.quadrant === quadrant).length;
    document.getElementById(`count-${quadrant}`).textContent = count;
  });
}

function handleDragStart(event) {
  draggedTaskId = event.currentTarget.dataset.id;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', draggedTaskId);
  event.currentTarget.classList.add('is-dragging');
}

function handleDragEnd(event) {
  event.currentTarget.classList.remove('is-dragging');
  document.querySelectorAll('.is-target').forEach((element) => element.classList.remove('is-target'));
}

function moveTask(taskId, destinationQuadrant, targetTaskId = null) {
  if (!taskId) {
    return;
  }

  const sourceIndex = tasks.findIndex((task) => task.id === taskId);
  if (sourceIndex === -1) {
    return;
  }

  saveUndo();

  const [movedTask] = tasks.splice(sourceIndex, 1);
  movedTask.quadrant = destinationQuadrant;

  if (targetTaskId) {
    const targetIndex = tasks.findIndex((task) => task.id === targetTaskId);
    if (targetIndex >= 0) {
      tasks.splice(targetIndex, 0, movedTask);
    } else {
      tasks.push(movedTask);
    }
  } else {
    tasks.push(movedTask);
  }

  saveTasks();
  render();
}

function removeTask(taskId) {
  saveUndo();
  tasks = tasks.filter((task) => task.id !== taskId);
  if (selectedTaskId === taskId) {
    selectedTaskId = null;
  }
  saveTasks();
  render();
}

function moveSelectedTask(step) {
  if (!selectedTaskId) {
    return;
  }

  const selectedIndex = tasks.findIndex((task) => task.id === selectedTaskId);
  if (selectedIndex === -1) {
    return;
  }

  const selectedTask = tasks[selectedIndex];
  const sameQuadrantTasks = tasks.filter((task) => task.quadrant === selectedTask.quadrant);
  const currentQuadrantIndex = sameQuadrantTasks.findIndex((task) => task.id === selectedTask.id);
  const targetQuadrantIndex = currentQuadrantIndex + step;

  if (targetQuadrantIndex < 0 || targetQuadrantIndex >= sameQuadrantTasks.length) {
    return;
  }

  const targetTask = sameQuadrantTasks[targetQuadrantIndex];
  const targetIndex = tasks.findIndex((task) => task.id === targetTask.id);

  if (targetIndex === -1) {
    return;
  }

  [tasks[selectedIndex], tasks[targetIndex]] = [tasks[targetIndex], tasks[selectedIndex]];
  saveTasks();
  render();
}

function selectTask(taskId, card) {
  selectedTaskId = taskId;
  document.querySelectorAll('.task-card.is-selected').forEach((element) => element.classList.remove('is-selected'));
  if (card) {
    card.classList.add('is-selected');
  }
}

function openContextMenu(event, taskId) {
  activeContextTaskId = taskId;
  contextMenu.hidden = false;
  contextMenu.style.left = `${event.clientX}px`;
  contextMenu.style.top = `${event.clientY}px`;
}

function hideContextMenu() {
  contextMenu.hidden = true;
  activeContextTaskId = null;
}

function handleContextMenuSelection(quadrant) {
  if (!activeContextTaskId) {
    return;
  }

  moveTask(activeContextTaskId, quadrant);
  hideContextMenu();
}

function beginEdit(taskId, card) {
  const task = tasks.find((item) => item.id === taskId);
  selectTask(taskId, card);
  if (!task) {
    return;
  }

  const titleElement = card.querySelector('.task-card__title');
  if (!titleElement) {
    return;
  }

  editingTaskId = taskId;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'task-card__edit-input';
  input.value = task.title;
  input.setAttribute('aria-label', 'Edit task');
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveEdit(taskId, input.value);
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      saveEdit(taskId, task.title);
    }
  });

  input.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  input.addEventListener('mousedown', (event) => {
    event.stopPropagation();
  });

  input.addEventListener('blur', () => {
    saveEdit(taskId, input.value);
  });

  titleElement.replaceWith(input);
  input.focus();
  const end = input.value.length;
  input.setSelectionRange(end, end);
}

function saveEdit(taskId, value) {
  const task = tasks.find((item) => item.id === taskId);
  editingTaskId = null;
  if (!task) {
    return;
  }

  const nextTitle = value.trim() || task.title;
  if (nextTitle !== task.title) {
    saveUndo();
    task.title = nextTitle;
    saveTasks();
    render();
  }
}

function addTaskToQuadrant(quadrant) {
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    return;
  }

  saveUndo();

  tasks.push({
    id: window.crypto?.randomUUID?.() ?? `task-${Date.now()}`,
    title,
    dueDate: '',
    quadrant: quadrant,
  });

  saveTasks();
  render();
  taskForm.reset();
  titleInput.focus();
}

function addTask(event) {
  event.preventDefault();
  addTaskToQuadrant(quadrantSelect.value);
}

function openResetDialog() {
  resetDialog.hidden = false;
  resetDialog.style.display = 'grid';
}

function closeResetDialog() {
  resetDialog.hidden = true;
  resetDialog.style.display = 'none';
}

function resetMatrix() {
  saveUndo();
  tasks = [];
  selectedTaskId = null;
  saveTasks();
  render();
  closeResetDialog();
}

function attachDropzones() {
  document.querySelectorAll('.dropzone').forEach((zone) => {
    zone.addEventListener('dragover', (event) => {
      event.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', (event) => {
      if (event.target === zone) {
        zone.classList.remove('drag-over');
      }
    });

    zone.addEventListener('drop', (event) => {
      event.preventDefault();
      zone.classList.remove('drag-over');
      moveTask(draggedTaskId, zone.id);
    });
  });
}

function matchesSearch(task) {
  if (!searchQuery) {
    return true;
  }

  const query = searchQuery.toLowerCase();
  const haystack = [task.title, task.dueDate].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
}

function formatDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function isTypingTarget() {
  const activeElement = document.activeElement;
  return activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName);
}

function handleKeyboardShortcuts(event) {
  if (event.key === 'Escape') {
    if (!resetDialog.hidden) {
      event.preventDefault();
      closeResetDialog();
      return;
    }

    if (editingTaskId) {
      event.preventDefault();
      const editInput = document.querySelector('.task-card__edit-input');
      if (editInput) {
        saveEdit(editingTaskId, editInput.value);
      }
      return;
    }

    if (selectedTaskId) {
      event.preventDefault();
      deselectTask();
      return;
    }
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    undo();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r') {
    event.preventDefault();
    redo();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    taskForm.requestSubmit();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
    event.preventDefault();
    searchInput.focus();
    searchInput.select();
    return;
  }

  if (event.shiftKey && event.ctrlKey) {
    const quadrantMap = { '1': 'do', '2': 'schedule', '3': 'delegate', '4': 'eliminate' };
    if (quadrantMap[event.key]) {
      event.preventDefault();
      addTaskToQuadrant(quadrantMap[event.key]);
      return;
    }
  }

  // Alternative: Ctrl+Shift+S for Schedule (if Ctrl+Shift+2 is reserved on Mac)
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 's') {
    event.preventDefault();
    addTaskToQuadrant('schedule');
    return;
  }

  if (isTypingTarget()) {
    return;
  }

  if (event.key === 'ArrowUp' && selectedTaskId) {
    event.preventDefault();
    moveSelectedTask(-1);
    return;
  }

  if (event.key === 'ArrowDown' && selectedTaskId) {
    event.preventDefault();
    moveSelectedTask(1);
    return;
  }

  if (event.key.toLowerCase() === 'e' && selectedTaskId) {
    event.preventDefault();
    const card = document.querySelector(`.task-card[data-id="${selectedTaskId}"]`);
    if (card) {
      beginEdit(selectedTaskId, card);
    }
    return;
  }

  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedTaskId) {
    event.preventDefault();
    removeTask(selectedTaskId);
    return;
  }

  const quadrantMap = {
    1: 'do',
    2: 'schedule',
    3: 'delegate',
    4: 'eliminate',
  };

  if (quadrantMap[event.key] && selectedTaskId) {
    event.preventDefault();
    moveTask(selectedTaskId, quadrantMap[event.key]);
  }
}

taskForm.addEventListener('submit', addTask);
searchInput.addEventListener('input', (event) => {
  searchQuery = event.target.value.trim();
  render();
});
attachDropzones();

closeResetDialog();
document.addEventListener('DOMContentLoaded', closeResetDialog);
window.addEventListener('pageshow', closeResetDialog);
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    closeResetDialog();
  }
});
document.addEventListener('keydown', handleKeyboardShortcuts);

resetButton.addEventListener('click', openResetDialog);
cancelResetButton.addEventListener('click', closeResetDialog);
confirmResetButton.addEventListener('click', resetMatrix);
resetDialog.addEventListener('click', (event) => {
  if (event.target === resetDialog) {
    closeResetDialog();
  }
});

contextMenu.querySelectorAll('.context-menu__item').forEach((button) => {
  button.addEventListener('click', () => {
    handleContextMenuSelection(button.dataset.quadrant);
  });
});

document.addEventListener('click', (event) => {
  if (!contextMenu.contains(event.target)) {
    hideContextMenu();
  }
});

themeToggle.addEventListener('click', toggleTheme);
exportButton.addEventListener('click', exportTasks);
importButton.addEventListener('click', importTasks);
importFileInput.addEventListener('change', handleImportFile);
importCancelButton.addEventListener('click', closeImportDialog);
importMergeButton.addEventListener('click', mergeImportedTasks);
importReplaceButton.addEventListener('click', replaceWithImportedTasks);

importDialog.addEventListener('click', (event) => {
  if (event.target === importDialog) {
    closeImportDialog();
  }
});

// Ensure dialogs are hidden on load
resetDialog.hidden = true;
importDialog.hidden = true;

loadTheme();
render();
