/**
 * Noto — Core Application Architecture
 * High-Reliability Task Management Engine
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'noto_midnight_tasks';

  // Application State
  let tasks = [];
  let currentFilter = 'all';

  // DOM Elements
  const taskForm = document.getElementById('task-form');
  const taskInput = document.getElementById('task-input');
  const taskList = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');
  const activeCountEl = document.getElementById('active-count');
  const completedCountEl = document.getElementById('completed-count');
  const countAllEl = document.getElementById('count-all');
  const countActiveEl = document.getElementById('count-active');
  const countCompletedEl = document.getElementById('count-completed');
  const clearCompletedBtn = document.getElementById('clear-completed-btn');
  const filterLinks = document.querySelectorAll('.filter-link');
  const currentDateEl = document.getElementById('current-date');

  /**
   * Initializes the application lifecycle.
   */
  function init() {
    renderCurrentDate();
    loadTasks();
    bindEvents();
    render();
  }

  /**
   * Generates a unique task identifier.
   * Uses native crypto.randomUUID() when available.
   * @returns {string}
   */
  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return 'noto_' + crypto.randomUUID();
    }
    return 'noto_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  /**
   * Formats and displays the current date.
   */
  function renderCurrentDate() {
    if (!currentDateEl) return;
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    currentDateEl.textContent = now.toLocaleDateString('en-US', options);
  }

  /**
   * Reads, validates, and parses task data safely from localStorage.
   */
  function loadTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        tasks = [];
        return;
      }

      const parsed = JSON.parse(stored);

      if (Array.isArray(parsed)) {
        // Sanitize and validate record structure
        tasks = parsed.filter(item => {
          return (
            item &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.text === 'string' &&
            typeof item.completed === 'boolean'
          );
        }).map(item => ({
          id: item.id,
          text: item.text.trim(),
          completed: item.completed,
          createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString()
        }));
      } else {
        tasks = [];
      }
    } catch (err) {
      console.warn('Noto: Failed to read from localStorage. Initializing empty state.', err);
      tasks = [];
    }
  }

  /**
   * Commits the current tasks state to localStorage.
   */
  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.error('Noto: Storage write operation failed.', err);
    }
  }

  /**
   * Attaches core event listeners and delegations.
   */
  function bindEvents() {
    // Form submission handler
    if (taskForm && taskInput) {
      taskForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const cleanText = taskInput.value.trim().replace(/\s+/g, ' ');

        if (cleanText.length > 0) {
          addTask(cleanText);
          taskInput.value = '';
          taskInput.focus();
        }
      });
    }

    // Clear completed action
    if (clearCompletedBtn) {
      clearCompletedBtn.addEventListener('click', clearCompletedTasks);
    }

    // Filter switching
    filterLinks.forEach(link => {
      link.addEventListener('click', function () {
        const filter = this.getAttribute('data-filter');
        if (filter) {
          setFilter(filter);
        }
      });
    });

    // Event delegation on task list for toggle and delete actions
    if (taskList) {
      taskList.addEventListener('change', function (e) {
        if (e.target && e.target.classList.contains('checkbox-native')) {
          const row = e.target.closest('.task-row');
          if (row && row.dataset.id) {
            toggleTask(row.dataset.id);
          }
        }
      });

      taskList.addEventListener('click', function (e) {
        const deleteButton = e.target.closest('.task-delete-btn');
        if (deleteButton) {
          const row = deleteButton.closest('.task-row');
          if (row && row.dataset.id) {
            deleteTask(row.dataset.id);
          }
        }
      });
    }
  }

  /**
   * Adds a new task to the collection.
   * @param {string} text 
   */
  function addTask(text) {
    const newTask = {
      id: generateId(),
      text: text,
      completed: false,
      createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    saveTasks();
    render();
  }

  /**
   * Toggles task completion state by ID.
   * @param {string} id 
   */
  function toggleTask(id) {
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
      tasks[taskIndex].completed = !tasks[taskIndex].completed;
      saveTasks();
      render();
    }
  }

  /**
   * Deletes a specific task by ID.
   * @param {string} id 
   */
  function deleteTask(id) {
    const initialLength = tasks.length;
    tasks = tasks.filter(t => t.id !== id);

    if (tasks.length !== initialLength) {
      saveTasks();
      render();
    }
  }

  /**
   * Removes all completed tasks.
   */
  function clearCompletedTasks() {
    const initialLength = tasks.length;
    tasks = tasks.filter(t => !t.completed);

    if (tasks.length !== initialLength) {
      saveTasks();
      render();
    }
  }

  /**
   * Updates current filter and syncs tab UI accessibility attributes.
   * @param {string} filter 
   */
  function setFilter(filter) {
    currentFilter = filter;

    filterLinks.forEach(link => {
      const isActive = link.getAttribute('data-filter') === filter;
      link.classList.toggle('is-active', isActive);
      link.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    render();
  }

  /**
   * Returns tasks matching the active filter.
   * @returns {Array}
   */
  function getFilteredTasks() {
    if (currentFilter === 'active') {
      return tasks.filter(t => !t.completed);
    }
    if (currentFilter === 'completed') {
      return tasks.filter(t => t.completed);
    }
    return tasks;
  }

  /**
   * Updates all metrics and sidebar counter badges in a single pass.
   */
  function updateCounters() {
    let activeTotal = 0;
    let completedTotal = 0;

    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].completed) {
        completedTotal++;
      } else {
        activeTotal++;
      }
    }

    const allTotal = tasks.length;

    if (activeCountEl) activeCountEl.textContent = activeTotal;
    if (completedCountEl) completedCountEl.textContent = completedTotal;
    if (countAllEl) countAllEl.textContent = allTotal;
    if (countActiveEl) countActiveEl.textContent = activeTotal;
    if (countCompletedEl) countCompletedEl.textContent = completedTotal;
  }

  /**
   * Creates a DOM element for a task row without innerHTML interpolation.
   * @param {Object} task 
   * @param {number} index
   * @returns {HTMLElement}
   */
  function createTaskElement(task, index) {
    const li = document.createElement('li');
    li.className = 'task-row' + (task.completed ? ' is-done' : '');
    li.dataset.id = task.id;

    // Numerical index
    const orderSpan = document.createElement('span');
    orderSpan.className = 'task-order';
    orderSpan.textContent = String(index + 1).padStart(2, '0');

    // Custom Checkbox Container
    const checkShell = document.createElement('label');
    checkShell.className = 'checkbox-shell';

    const checkNative = document.createElement('input');
    checkNative.type = 'checkbox';
    checkNative.className = 'checkbox-native';
    checkNative.checked = task.completed;
    checkNative.setAttribute('aria-label', `Mark "${task.text}" as ${task.completed ? 'active' : 'completed'}`);

    const checkSkin = document.createElement('span');
    checkSkin.className = 'checkbox-skin';

    checkShell.appendChild(checkNative);
    checkShell.appendChild(checkSkin);

    // Text Content
    const textSpan = document.createElement('span');
    textSpan.className = 'task-content';
    textSpan.textContent = task.text;

    // Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'task-delete-btn';
    deleteBtn.textContent = 'Remove';
    deleteBtn.setAttribute('aria-label', `Delete task: "${task.text}"`);

    li.appendChild(orderSpan);
    li.appendChild(checkShell);
    li.appendChild(textSpan);
    li.appendChild(deleteBtn);

    return li;
  }

  /**
   * Primary Render Pipeline.
   */
  function render() {
    updateCounters();

    const filtered = getFilteredTasks();

    if (!taskList) return;
    taskList.textContent = ''; // Fast child cleanup

    if (filtered.length === 0) {
      if (emptyState) emptyState.removeAttribute('hidden');
    } else {
      if (emptyState) emptyState.setAttribute('hidden', 'true');
      const fragment = document.createDocumentFragment();

      filtered.forEach((task, idx) => {
        fragment.appendChild(createTaskElement(task, idx));
      });

      taskList.appendChild(fragment);
    }
  }

  // Execute initialization when document structure is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();