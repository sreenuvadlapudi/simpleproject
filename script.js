// =========================
// Advanced Todo App JS
// =========================

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

let currentFilter = "all";

// =========================
// DOM Elements
// =========================

const taskInput = document.getElementById("taskInput");
const dueDateInput = document.getElementById("dueDate");
const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");
const emptyMessage = document.getElementById("emptyMessage");
const progressBar = document.getElementById("progressBar");
const themeToggle = document.getElementById("themeToggle");

// =========================
// Add Task
// =========================

function addTask() {

  const text = taskInput.value.trim();
  const dueDate = dueDateInput.value;

  if (text === "") {
    alert("Please enter a task");
    return;
  }

  const task = {
    id: Date.now(),
    text: text,
    completed: false,
    createdAt: new Date().toLocaleString(),
    dueDate: dueDate
  };

  tasks.push(task);

  saveTasks();
  renderTasks();

  taskInput.value = "";
  dueDateInput.value = "";

}

// =========================
// Render Tasks
// =========================

function renderTasks() {

  taskList.innerHTML = "";

  const searchText =
    searchInput.value.toLowerCase();

  let filteredTasks = tasks.filter(task => {

    const matchesSearch =
      task.text
      .toLowerCase()
      .includes(searchText);

    if (currentFilter === "completed") {
      return task.completed && matchesSearch;
    }

    if (currentFilter === "pending") {
      return !task.completed && matchesSearch;
    }

    return matchesSearch;

  });

  // Empty Message

  if (filteredTasks.length === 0) {
    emptyMessage.style.display = "block";
  } else {
    emptyMessage.style.display = "none";
  }

  // Show Tasks

  filteredTasks.forEach(task => {

    const li = document.createElement("li");

    li.setAttribute("draggable", true);

    li.dataset.id = task.id;

    if (task.completed) {
      li.classList.add("completed");
    }

    li.innerHTML = `

      <div class="task-details">

        <span class="task-text">
          ${task.text}
        </span>

        <span class="task-time">
          Created:
          ${task.createdAt}
        </span>

        <span class="task-time">
          Due:
          ${task.dueDate || "No Date"}
        </span>

      </div>

      <div class="actions">

        <button
          class="done-btn"
          onclick="toggleTask(${task.id})"
        >
          ${task.completed ? "Undo" : "Done"}
        </button>

        <button
          class="edit-btn"
          onclick="editTask(${task.id})"
        >
          Edit
        </button>

        <button
          class="delete-btn"
          onclick="deleteTask(${task.id})"
        >
          Delete
        </button>

      </div>

    `;

    taskList.appendChild(li);

  });

  updateStats();

}

// =========================
// Toggle Complete
// =========================

function toggleTask(id) {

  tasks = tasks.map(task => {

    if (task.id === id) {
      task.completed = !task.completed;
    }

    return task;

  });

  saveTasks();
  renderTasks();

}

// =========================
// Delete Task
// =========================

function deleteTask(id) {

  tasks = tasks.filter(task =>
    task.id !== id
  );

  saveTasks();
  renderTasks();

}

// =========================
// Edit Task
// =========================

function editTask(id) {

  const task =
    tasks.find(task => task.id === id);

  const updatedText =
    prompt("Edit Task:", task.text);

  if (
    updatedText !== null &&
    updatedText.trim() !== ""
  ) {

    task.text = updatedText;

    saveTasks();
    renderTasks();

  }

}

// =========================
// Clear All Tasks
// =========================

function clearAll() {

  const confirmDelete =
    confirm("Delete all tasks?");

  if (confirmDelete) {

    tasks = [];

    saveTasks();
    renderTasks();

  }

}

// =========================
// Save to LocalStorage
// =========================

function saveTasks() {

  localStorage.setItem(
    "tasks",
    JSON.stringify(tasks)
  );

}

// =========================
// Update Statistics
// =========================

function updateStats() {

  const total = tasks.length;

  const completed =
    tasks.filter(task =>
      task.completed
    ).length;

  const pending =
    total - completed;

  document.getElementById(
    "totalTasks"
  ).innerText = total;

  document.getElementById(
    "completedTasks"
  ).innerText = completed;

  document.getElementById(
    "pendingTasks"
  ).innerText = pending;

  // Progress Bar

  const progress =
    total === 0
      ? 0
      : (completed / total) * 100;

  progressBar.style.width =
    `${progress}%`;

}

// =========================
// Search Tasks
// =========================

searchInput.addEventListener(
  "input",
  renderTasks
);

// =========================
// Filter Buttons
// =========================

const filterButtons =
  document.querySelectorAll(".filter-btn");

filterButtons.forEach(button => {

  button.addEventListener("click", () => {

    filterButtons.forEach(btn =>
      btn.classList.remove("active")
    );

    button.classList.add("active");

    currentFilter =
      button.dataset.filter;

    renderTasks();

  });

});

// =========================
// Enter Key Support
// =========================

taskInput.addEventListener(
  "keypress",
  function (e) {

    if (e.key === "Enter") {
      addTask();
    }

  }
);

// =========================
// Theme Toggle
// =========================

themeToggle.addEventListener(
  "click",
  () => {

    document.body.classList.toggle("light");

    if (
      document.body.classList.contains("light")
    ) {

      themeToggle.innerText =
        "🌞 Light Mode";

    } else {

      themeToggle.innerText =
        "🌙 Dark Mode";

    }

  }
);

// =========================
// Voice Input
// =========================

const voiceBtn =
  document.getElementById("voiceBtn");

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

if (SpeechRecognition) {

  const recognition =
    new SpeechRecognition();

  voiceBtn.addEventListener(
    "click",
    () => {

      recognition.start();

    }
  );

  recognition.onresult =
    function (event) {

      const transcript =
        event.results[0][0].transcript;

      taskInput.value = transcript;

    };

}

// =========================
// Drag and Drop
// =========================

let dragItem = null;

document.addEventListener(
  "dragstart",
  (e) => {

    dragItem = e.target;

  }
);

document.addEventListener(
  "dragover",
  (e) => {

    e.preventDefault();

  }
);

document.addEventListener(
  "drop",
  (e) => {

    e.preventDefault();

    const dropItem =
      e.target.closest("li");

    if (
      dropItem &&
      dragItem !== dropItem
    ) {

      taskList.insertBefore(
        dragItem,
        dropItem
      );

    }

  }
);

// =========================
// Initial Render
// =========================

renderTasks();