/**
 * Noto — Core Application Architecture
 * High-Reliability LocalStorage Engine
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'noto_midnight_tasks';

  // Application State
  let tasks = [];
  let currentFilter = 'all';

  // DOM Handles
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
   * Formats and displays the current date.
   */
  function renderCurrentDate() {
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    currentDateEl.textContent = now.toLocaleDateString('en-US', options);
  }

  /**
   * Safely reads and parses task data from localStorage.
   */
  function loadTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      tasks = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(tasks)) tasks = [];
    } catch (err) {
      console.warn('Noto: Failed to read from localStorage', err);
      tasks = [];
    }
  }

  /**
   * Commits the active state to localStorage.
   */
  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.warn('Noto: Failed to write to localStorage', err);
    }
  }

  /**
   * Attaches event listeners for user inputs and filters.
   */
  function bindEvents() {
    // Add task via form submission (Enter key + Button)
    taskForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const text = taskInput.value.trim();
      if (text.length > 0) {
        addTask(text);
        taskInput.value = '';
        taskInput.focus();
      }
    });

    // Clear completed action
    clearCompletedBtn.addEventListener('click', clearCompletedTasks);

    // Filter switching
    filterLinks.forEach(link => {
      link.addEventListener('click', function () {
        const filter = this.getAttribute('data-filter');
        setFilter(filter);
      });
    });
  }

  /**
   * Adds a new task object to the state ledger.
   * @param {string} text 
   */
  function addTask(text) {
    const newTask = {
      id: 'noto_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      text: text,
      completed: false,
      createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    saveTasks();
    render();
  }

  /**
   * Toggles task completion state.
   * @param {string} id 
   */
  function toggleTask(id) {
    tasks = tasks.map(t => {
      if (t.id === id) {
        return Object.assign({}, t, { completed: !t.completed });
      }
      return t;
    });
    saveTasks();
    render();
  }

  /**
   * Deletes a specific task by ID.
   * @param {string} id 
   */
  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  }

  /**
   * Removes all resolved/completed tasks.
   */
  function clearCompletedTasks() {
    const hasCompleted = tasks.some(t => t.completed);
    if (!hasCompleted) return;

    tasks = tasks.filter(t => !t.completed);
    saveTasks();
    render();
  }

  /**
   * Updates filter state and active button styling.
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
   * Filters the tasks array according to the current selection.
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
   * Updates task statistics and filter badges.
   */
  function updateCounters() {
    const allTotal = tasks.length;
    const activeTotal = tasks.filter(t => !t.completed).length;
    const completedTotal = tasks.filter(t => t.completed).length;

    activeCountEl.textContent = activeTotal;
    completedCountEl.textContent = completedTotal;

    countAllEl.textContent = allTotal;
    countActiveEl.textContent = activeTotal;
    countCompletedEl.textContent = completedTotal;
  }

  /**
   * Creates an individual task list element.
   * @param {Object} task 
   * @param {number} index
   * @returns {HTMLElement}
   */
  function createTaskElement(task, index) {
    const li = document.createElement('li');
    li.className = 'task-row' + (task.completed ? ' is-done' : '');
    li.id = task.id;

    // Numerical index
    const orderSpan = document.createElement('span');
    orderSpan.className = 'task-order';
    orderSpan.textContent = String(index + 1).padStart(2, '0');

    // Custom checkbox wrapper
    const checkShell = document.createElement('label');
    checkShell.className = 'checkbox-shell';

    const checkNative = document.createElement('input');
    checkNative.type = 'checkbox';
    checkNative.className = 'checkbox-native';
    checkNative.checked = task.completed;
    checkNative.setAttribute('aria-label', `Mark "${task.text}" as ${task.completed ? 'active' : 'completed'}`);
    checkNative.addEventListener('change', () => toggleTask(task.id));

    const checkSkin = document.createElement('span');
    checkSkin.className = 'checkbox-skin';

    checkShell.appendChild(checkNative);
    checkShell.appendChild(checkSkin);

    // Text content
    const textSpan = document.createElement('span');
    textSpan.className = 'task-content';
    textSpan.textContent = task.text;

    // Delete action button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'task-delete-btn';
    deleteBtn.textContent = 'Remove';
    deleteBtn.setAttribute('aria-label', `Delete "${task.text}"`);
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

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
    taskList.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.removeAttribute('hidden');
    } else {
      emptyState.setAttribute('hidden', 'true');
      const fragment = document.createDocumentFragment();
      filtered.forEach((task, idx) => {
        fragment.appendChild(createTaskElement(task, idx));
      });
      taskList.appendChild(fragment);
    }
  }

  // Run on DOM ready
  document.addEventListener('DOMContentLoaded', init);
})();