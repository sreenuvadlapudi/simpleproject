let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let currentFilter = "all";

window.onload = function () {
  renderTasks();
};

// Add Task
function addTask() {
  let input = document.getElementById("taskInput");
  let text = input.value.trim();

  if (text === "") {
    alert("Enter a task");
    return;
  }

  tasks.push({ text: text, completed: false });
  updateStorage();
  renderTasks();

  input.value = "";
}

// Set Filter
function setFilter(filter) {
  currentFilter = filter;
  renderTasks();
}

// Clear All Tasks
function clearAll() {
  if (confirm("Are you sure?")) {
    tasks = [];
    updateStorage();
    renderTasks();
  }
}

// Render Tasks
function renderTasks() {
  let list = document.getElementById("taskList");
  let search = document.getElementById("searchInput").value.toLowerCase();

  list.innerHTML = "";

  tasks
    .filter(task => {
      if (currentFilter === "completed") return task.completed;
      if (currentFilter === "pending") return !task.completed;
      return true;
    })
    .filter(task => task.text.toLowerCase().includes(search))
    .forEach((task, index) => {
      let li = document.createElement("li");

      let span = document.createElement("span");
      span.textContent = task.text;

      if (task.completed) {
        li.classList.add("completed");
      }

      // Toggle complete
      span.onclick = function () {
        task.completed = !task.completed;
        updateStorage();
        renderTasks();
      };

      // Edit
      let editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.onclick = function () {
        let newText = prompt("Edit task:", task.text);
        if (newText && newText.trim() !== "") {
          task.text = newText.trim();
          updateStorage();
          renderTasks();
        }
      };

      // Delete
      let delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.onclick = function () {
        tasks = tasks.filter(t => t !== task);
        updateStorage();
        renderTasks();
      };

      li.appendChild(span);
      li.appendChild(editBtn);
      li.appendChild(delBtn);

      list.appendChild(li);
    });
}

// Save to localStorage
function updateStorage() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}