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
let touchDragState = null;

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
const addTaskDialog = document.getElementById('add-task-dialog');
const addTaskForm = document.getElementById('add-task-form');
const addTaskTitleInput = document.getElementById('add-task-title');
const addTaskDueInput = document.getElementById('add-task-due');
const cancelAddTaskButton = document.getElementById('cancel-add-task');
const dateDialog = document.getElementById('date-dialog');
const dateDialogInput = document.getElementById('date-dialog-input');
const dateDialogSaveButton = document.getElementById('date-dialog-save');
const dateDialogClearButton = document.getElementById('date-dialog-clear');
const dateDialogCloseButton = document.getElementById('date-dialog-close');
const deleteDialog = document.getElementById('delete-dialog');
const deleteDialogTaskName = document.getElementById('delete-dialog-task-name');
const deleteDialogCancelButton = document.getElementById('delete-dialog-cancel');
const deleteDialogConfirmButton = document.getElementById('delete-dialog-confirm');
let activeContextTaskId = null;
let pendingImportData = null;
let pendingQuadrantForAdd = null;
let dateDialogTaskId = null;
let pendingDeleteTaskId = null;

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
    themeToggle.textContent = '○';
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
              ${task.dueDate ? `<span class="task-card__badge task-card__badge--due" role="button">Due ${formatDate(task.dueDate)}</span>` : `<span class="task-card__badge task-card__badge--add-date" role="button">+ Add date</span>`}
              ${overdue ? '<span class="task-card__badge task-card__badge--overdue">Overdue</span>' : ''}
            </div>
          </div>
          <button class="task-card__delete" type="button" aria-label="Delete task">×</button>
        `;

        const deleteButton = card.querySelector('.task-card__delete');
        deleteButton.addEventListener('click', (event) => {
          event.stopPropagation();
          removeTask(task.id);
        });

        card.addEventListener('click', (event) => {
          if (event.target.closest('.task-card__badge--due, .task-card__badge--add-date')) {
            event.stopPropagation();
            openDateDialog(task.id);
            return;
          }

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

        card.addEventListener('touchstart', handleTouchStart, { passive: false });

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

function handleTouchStart(event) {
  const card = event.currentTarget;
  const touch = event.touches[0];

  // Don't drag if touching a date badge or delete button
  if (event.target.closest('.task-card__badge--due, .task-card__badge--add-date, .task-card__delete')) {
    return;
  }

  const taskId = card.dataset.id;

  touchDragState = {
    taskId: taskId,
    startX: touch.clientX,
    startY: touch.clientY,
    currentX: touch.clientX,
    currentY: touch.clientY,
    ghost: null,
    sourceQuadrant: card.closest('.dropzone').id,
  };

  event.preventDefault();
  card.classList.add('is-dragging');
  createTouchGhost(card);
}

function createTouchGhost(card) {
  if (!touchDragState) return;

  const ghost = document.createElement('div');
  ghost.className = 'touch-drag-ghost';
  ghost.innerHTML = card.querySelector('.task-card__title').innerHTML;
  document.body.appendChild(ghost);
  touchDragState.ghost = ghost;

  updateGhostPosition(touchDragState.currentX, touchDragState.currentY);
}

function updateGhostPosition(x, y) {
  if (!touchDragState || !touchDragState.ghost) return;

  touchDragState.ghost.style.left = `${x - 50}px`;
  touchDragState.ghost.style.top = `${y - 20}px`;
}

function getTouchTargetQuadrant(x, y) {
  const dropzones = document.querySelectorAll('.dropzone');
  for (const zone of dropzones) {
    const rect = zone.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return zone.id;
    }
  }
  return null;
}

function handleTouchMove(event) {
  if (!touchDragState) return;

  event.preventDefault();
  const touch = event.touches[0];
  touchDragState.currentX = touch.clientX;
  touchDragState.currentY = touch.clientY;

  updateGhostPosition(touch.clientX, touch.clientY);

  const targetQuadrant = getTouchTargetQuadrant(touch.clientX, touch.clientY);
  const targetZone = document.getElementById(targetQuadrant);

  document.querySelectorAll('.dropzone.is-target').forEach((zone) => {
    zone.classList.remove('is-target');
  });

  if (targetZone) {
    targetZone.classList.add('is-target');
  }
}

function handleTouchEnd(event) {
  if (!touchDragState) return;

  const card = document.querySelector(`[data-id="${touchDragState.taskId}"]`);
  if (card) {
    card.classList.remove('is-dragging');
  }

  if (touchDragState.ghost) {
    touchDragState.ghost.remove();
  }

  document.querySelectorAll('.dropzone.is-target').forEach((zone) => {
    zone.classList.remove('is-target');
  });

  const targetQuadrant = getTouchTargetQuadrant(touchDragState.currentX, touchDragState.currentY);

  if (targetQuadrant) {
    // Find which task is at the drop location
    const element = document.elementFromPoint(touchDragState.currentX, touchDragState.currentY);
    const targetCard = element?.closest('[data-id]');
    const targetTaskId = targetCard?.dataset.id;

    if (targetQuadrant !== touchDragState.sourceQuadrant) {
      // Moving to different quadrant
      moveTask(touchDragState.taskId, targetQuadrant);
    } else if (targetTaskId && targetTaskId !== touchDragState.taskId) {
      // Reordering within same quadrant
      moveTask(touchDragState.taskId, targetQuadrant, targetTaskId);
    }
  }

  touchDragState = null;
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

function openDeleteDialog(taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  pendingDeleteTaskId = taskId;
  deleteDialogTaskName.textContent = `Remove "${task.title}"?`;
  deleteDialog.hidden = false;
  deleteDialog.style.display = 'grid';
}

function closeDeleteDialog() {
  deleteDialog.hidden = true;
  deleteDialog.style.display = 'none';
  pendingDeleteTaskId = null;
}

function confirmDelete() {
  if (!pendingDeleteTaskId) return;

  saveUndo();
  tasks = tasks.filter((task) => task.id !== pendingDeleteTaskId);
  if (selectedTaskId === pendingDeleteTaskId) {
    selectedTaskId = null;
  }
  saveTasks();
  render();
  closeDeleteDialog();
}

function removeTask(taskId) {
  openDeleteDialog(taskId);
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

function openAddTaskDialog(quadrant) {
  pendingQuadrantForAdd = quadrant;
  addTaskDialog.hidden = false;
  addTaskDialog.style.display = 'grid';
  addTaskTitleInput.focus();
}

function closeAddTaskDialog() {
  addTaskDialog.hidden = true;
  addTaskDialog.style.display = 'none';
  addTaskForm.reset();
  pendingQuadrantForAdd = null;
}

function openDateDialog(taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  dateDialogTaskId = taskId;
  dateDialogInput.value = task.dueDate || '';
  dateDialog.hidden = false;
  dateDialog.style.display = 'grid';
  dateDialogInput.focus();
}

function closeDateDialog() {
  dateDialog.hidden = true;
  dateDialog.style.display = 'none';
  dateDialogTaskId = null;
}

function saveDateDialogChange(newDate) {
  if (!dateDialogTaskId) return;

  const task = tasks.find((t) => t.id === dateDialogTaskId);
  if (!task) return;

  task.dueDate = newDate;
  saveTasks();
  render();
  closeDateDialog();
}

function addTaskFromDialog(event) {
  event.preventDefault();
  const title = addTaskTitleInput.value.trim();
  if (!title || !pendingQuadrantForAdd) {
    addTaskTitleInput.focus();
    return;
  }

  saveUndo();
  tasks.push({
    id: window.crypto?.randomUUID?.() ?? `task-${Date.now()}`,
    title,
    dueDate: addTaskDueInput.value || '',
    quadrant: pendingQuadrantForAdd,
  });

  saveTasks();
  render();
  closeAddTaskDialog();
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
    if (!addTaskDialog.hidden) {
      event.preventDefault();
      closeAddTaskDialog();
      return;
    }

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

document.addEventListener('touchmove', handleTouchMove, { passive: false });
document.addEventListener('touchend', handleTouchEnd, { passive: false });

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

document.querySelectorAll('.quadrant__add').forEach((button) => {
  button.addEventListener('click', () => {
    openAddTaskDialog(button.dataset.quadrant);
  });
});

addTaskForm.addEventListener('submit', addTaskFromDialog);
cancelAddTaskButton.addEventListener('click', closeAddTaskDialog);
addTaskDialog.addEventListener('click', (event) => {
  if (event.target === addTaskDialog) {
    closeAddTaskDialog();
  }
});

dateDialogSaveButton.addEventListener('click', () => {
  saveDateDialogChange(dateDialogInput.value);
});

dateDialogClearButton.addEventListener('click', () => {
  saveDateDialogChange('');
});

dateDialogCloseButton.addEventListener('click', closeDateDialog);

dateDialog.addEventListener('click', (event) => {
  if (event.target === dateDialog) {
    closeDateDialog();
  }
});

deleteDialogConfirmButton.addEventListener('click', confirmDelete);
deleteDialogCancelButton.addEventListener('click', closeDeleteDialog);

deleteDialog.addEventListener('click', (event) => {
  if (event.target === deleteDialog) {
    closeDeleteDialog();
  }
});

const exportTasksMobile = document.getElementById('export-tasks-mobile');
const importTasksMobile = document.getElementById('import-tasks-mobile');
const resetMatrixMobile = document.getElementById('reset-matrix-mobile');

if (exportTasksMobile) exportTasksMobile.addEventListener('click', exportTasks);
if (importTasksMobile) importTasksMobile.addEventListener('click', importTasks);
if (resetMatrixMobile) resetMatrixMobile.addEventListener('click', openResetDialog);

// Ensure dialogs are hidden on load
resetDialog.hidden = true;
importDialog.hidden = true;
addTaskDialog.hidden = true;
dateDialog.hidden = true;
deleteDialog.hidden = true;

loadTheme();
render();
