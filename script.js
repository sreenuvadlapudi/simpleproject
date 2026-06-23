(() => {
  "use strict";

  const STORAGE_KEY = "focusWorkspaceNotionV1";
  const LEGACY_TASKS_KEY = "tasks";
  const STATUSES = ["Backlog", "In progress", "Done"];
  const PRIORITIES = ["Low", "Medium", "High"];
  const BLOCK_TYPES = [
    {
      type: "text",
      label: "Text",
      shortLabel: "T",
      description: "Plain paragraph",
      aliases: ["text", "p"]
    },
    {
      type: "heading",
      label: "Heading",
      shortLabel: "H",
      description: "Section title",
      aliases: ["heading", "h1", "h2"]
    },
    {
      type: "todo",
      label: "To-do",
      shortLabel: "C",
      description: "Checkbox item",
      aliases: ["todo", "check", "task"]
    },
    {
      type: "bullet",
      label: "Bullet",
      shortLabel: "B",
      description: "List item",
      aliases: ["bullet", "list", "li"]
    },
    {
      type: "callout",
      label: "Callout",
      shortLabel: "!",
      description: "Highlighted note",
      aliases: ["callout", "note", "tip"]
    },
    {
      type: "divider",
      label: "Divider",
      shortLabel: "-",
      description: "Visual break",
      aliases: ["divider", "line", "hr"]
    }
  ];

  const ICONS = {
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"></path></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"></path></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"></path></svg>'
  };

  const dom = {};
  let state = loadWorkspace();
  let pendingFocusBlockId = null;
  let draggedTaskId = null;
  let toastTimer = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    collectDom();
    normalizeState();
    bindEvents();
    renderApp();
    saveWorkspace();
  }

  function collectDom() {
    dom.sidebar = document.getElementById("sidebar");
    dom.menuBtn = document.getElementById("menuBtn");
    dom.newPageBtn = document.getElementById("newPageBtn");
    dom.addPageMiniBtn = document.getElementById("addPageMiniBtn");
    dom.commandBtn = document.getElementById("commandBtn");
    dom.favoriteList = document.getElementById("favoriteList");
    dom.pageList = document.getElementById("pageList");
    dom.workspaceCount = document.getElementById("workspaceCount");
    dom.sidebarProgress = document.getElementById("sidebarProgress");
    dom.breadcrumbs = document.getElementById("breadcrumbs");
    dom.themeToggle = document.getElementById("themeToggle");
    dom.taskSearchInput = document.getElementById("taskSearchInput");
    dom.pageUpdated = document.getElementById("pageUpdated");
    dom.favoriteBtn = document.getElementById("favoriteBtn");
    dom.deletePageBtn = document.getElementById("deletePageBtn");
    dom.pageTitle = document.getElementById("pageTitle");
    dom.blockList = document.getElementById("blockList");
    dom.blockInput = document.getElementById("blockInput");
    dom.slashMenu = document.getElementById("slashMenu");
    dom.addBlockBtn = document.getElementById("addBlockBtn");
    dom.taskSummary = document.getElementById("taskSummary");
    dom.newTaskToggle = document.getElementById("newTaskToggle");
    dom.statusFilter = document.getElementById("statusFilter");
    dom.taskForm = document.getElementById("taskForm");
    dom.taskTitle = document.getElementById("taskTitle");
    dom.taskStatus = document.getElementById("taskStatus");
    dom.taskPriority = document.getElementById("taskPriority");
    dom.taskDue = document.getElementById("taskDue");
    dom.taskPage = document.getElementById("taskPage");
    dom.taskNotes = document.getElementById("taskNotes");
    dom.cancelTaskBtn = document.getElementById("cancelTaskBtn");
    dom.taskTable = document.getElementById("taskTable");
    dom.taskBoard = document.getElementById("taskBoard");
    dom.commandOverlay = document.getElementById("commandOverlay");
    dom.commandSearch = document.getElementById("commandSearch");
    dom.commandList = document.getElementById("commandList");
    dom.toast = document.getElementById("toast");
  }

  function bindEvents() {
    dom.menuBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      document.body.classList.toggle("sidebar-open");
    });

    document.addEventListener("click", (event) => {
      if (
        document.body.classList.contains("sidebar-open") &&
        !dom.sidebar.contains(event.target) &&
        !dom.menuBtn.contains(event.target)
      ) {
        closeSidebar();
      }
    });

    dom.newPageBtn.addEventListener("click", () => createPage());
    dom.addPageMiniBtn.addEventListener("click", () => createPage());
    dom.deletePageBtn.addEventListener("click", () => deletePage(state.activePageId));
    dom.favoriteBtn.addEventListener("click", toggleFavorite);
    dom.themeToggle.addEventListener("click", toggleTheme);
    dom.commandBtn.addEventListener("click", openCommandPalette);

    dom.pageTitle.addEventListener("input", () => {
      const page = currentPage();
      page.title = dom.pageTitle.value;
      touchPage(page);
      renderSidebar();
      renderBreadcrumb();
      renderTaskFormPages();
      saveWorkspace();
    });

    dom.pageTitle.addEventListener("blur", () => {
      const page = currentPage();
      if (!page.title.trim()) {
        page.title = "Untitled";
        renderPage();
        saveWorkspace();
      }
    });

    dom.blockInput.addEventListener("input", renderSlashMenu);
    dom.blockInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addBlockFromComposer();
      }

      if (event.key === "Escape") {
        hideSlashMenu();
      }
    });

    dom.addBlockBtn.addEventListener("click", () => addBlockFromComposer());

    document.addEventListener("click", (event) => {
      if (!dom.slashMenu.contains(event.target) && event.target !== dom.blockInput) {
        hideSlashMenu();
      }
    });

    dom.taskSearchInput.addEventListener("input", () => {
      state.taskQuery = dom.taskSearchInput.value;
      renderTasks();
      saveWorkspace();
    });

    dom.statusFilter.addEventListener("change", () => {
      state.taskFilter = dom.statusFilter.value;
      renderTasks();
      saveWorkspace();
    });

    document.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeView = button.dataset.view;
        renderTasks();
        saveWorkspace();
      });
    });

    dom.newTaskToggle.addEventListener("click", () => showTaskForm(true));
    dom.cancelTaskBtn.addEventListener("click", () => {
      resetTaskForm();
      showTaskForm(false);
    });

    dom.taskForm.addEventListener("submit", (event) => {
      event.preventDefault();
      createTaskFromForm();
    });

    document.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      const hasModifier = event.ctrlKey || event.metaKey;

      if (hasModifier && key === "k") {
        event.preventDefault();
        openCommandPalette();
      }

      if (event.key === "Escape") {
        closeCommandPalette();
        closeSidebar();
        hideSlashMenu();
      }
    });

    dom.commandOverlay.addEventListener("click", (event) => {
      if (event.target === dom.commandOverlay) {
        closeCommandPalette();
      }
    });

    dom.commandSearch.addEventListener("input", renderCommandList);
  }

  function loadWorkspace() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (stored && Array.isArray(stored.pages)) {
        return stored;
      }
    } catch (error) {
      console.warn("Could not load workspace", error);
    }

    return createSeedWorkspace();
  }

  function createSeedWorkspace() {
    const planningPageId = uid("page");
    const notesPageId = uid("page");
    const roadmapPageId = uid("page");
    const legacyTasks = importLegacyTasks(planningPageId);

    return {
      theme: "light",
      activePageId: planningPageId,
      activeView: "table",
      taskFilter: "all",
      taskQuery: "",
      pages: [
        {
          id: planningPageId,
          title: "Launch plan",
          icon: "LP",
          favorite: true,
          updatedAt: new Date().toISOString(),
          blocks: [
            createBlock("heading", "This week"),
            createBlock("text", "A focused operating page for priorities, decisions, and the task database."),
            createBlock("todo", "Review the open task board", false),
            createBlock("todo", "Draft the next project note", true),
            createBlock("callout", "Press Ctrl K for the command menu."),
            createBlock("heading", "Decisions"),
            createBlock("bullet", "Keep the workspace lightweight and saved locally.")
          ]
        },
        {
          id: notesPageId,
          title: "Meeting notes",
          icon: "MN",
          favorite: false,
          updatedAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
          blocks: [
            createBlock("heading", "Standup"),
            createBlock("text", "Capture decisions, blockers, and owners in plain editable blocks."),
            createBlock("bullet", "Ship the first polished workspace pass."),
            createBlock("bullet", "Turn recurring items into database tasks.")
          ]
        },
        {
          id: roadmapPageId,
          title: "Product roadmap",
          icon: "PR",
          favorite: false,
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
          blocks: [
            createBlock("heading", "Milestones"),
            createBlock("text", "Plan larger work here, then link concrete tasks to this page."),
            createBlock("divider", ""),
            createBlock("callout", "Use the board view when priorities need movement.")
          ]
        }
      ],
      tasks: legacyTasks.length
        ? legacyTasks
        : [
            createTask("Write page templates", planningPageId, "In progress", "High", offsetDate(1), "Reusable project and meeting pages."),
            createTask("Polish mobile layout", planningPageId, "Backlog", "Medium", offsetDate(3), "Check sidebar, table scroll, and editor controls."),
            createTask("Prepare standup notes", notesPageId, "Done", "Low", offsetDate(-1), "Summarize shipped items."),
            createTask("Prioritize roadmap items", roadmapPageId, "Backlog", "High", offsetDate(6), "Move selected cards into in progress.")
          ]
    };
  }

  function importLegacyTasks(defaultPageId) {
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_TASKS_KEY)) || [];
      if (!Array.isArray(legacy)) {
        return [];
      }

      return legacy
        .filter((task) => task && typeof task.text === "string")
        .map((task) => ({
          id: uid("task"),
          title: task.text,
          status: task.completed ? "Done" : "Backlog",
          priority: "Medium",
          due: task.dueDate || "",
          pageId: defaultPageId,
          notes: task.time || task.createdAt ? `Imported from todo app: ${task.time || task.createdAt}` : "",
          createdAt: new Date().toISOString()
        }));
    } catch (error) {
      return [];
    }
  }

  function normalizeState() {
    const seed = createSeedWorkspace();
    state.theme = state.theme === "dark" ? "dark" : "light";
    state.activeView = state.activeView === "board" ? "board" : "table";
    state.taskFilter = state.taskFilter || "all";
    state.taskQuery = state.taskQuery || "";
    state.pages = Array.isArray(state.pages) && state.pages.length ? state.pages : seed.pages;
    state.tasks = Array.isArray(state.tasks) ? state.tasks : seed.tasks;

    state.pages = state.pages.map((page, index) => ({
      id: page.id || uid("page"),
      title: page.title || "Untitled",
      icon: normalizePageIcon(page.icon, page.title, index),
      favorite: Boolean(page.favorite),
      updatedAt: page.updatedAt || new Date().toISOString(),
      blocks: Array.isArray(page.blocks) && page.blocks.length
        ? page.blocks.map(normalizeBlock)
        : [createBlock("text", "")]
    }));

    if (!state.pages.some((page) => page.id === state.activePageId)) {
      state.activePageId = state.pages[0].id;
    }

    state.tasks = state.tasks.map((task) => ({
      id: task.id || uid("task"),
      title: task.title || task.text || "Untitled task",
      status: STATUSES.includes(task.status) ? task.status : task.completed ? "Done" : "Backlog",
      priority: PRIORITIES.includes(task.priority) ? task.priority : "Medium",
      due: task.due || task.dueDate || "",
      pageId: state.pages.some((page) => page.id === task.pageId) ? task.pageId : state.pages[0].id,
      notes: task.notes || "",
      createdAt: task.createdAt || new Date().toISOString()
    }));
  }

  function normalizeBlock(block) {
    const type = BLOCK_TYPES.some((item) => item.type === block.type) ? block.type : "text";

    return {
      id: block.id || uid("block"),
      type,
      content: block.content || "",
      checked: Boolean(block.checked)
    };
  }

  function normalizePageIcon(icon, title, index) {
    if (typeof icon === "string" && icon.trim()) {
      return icon.trim().slice(0, 2).toUpperCase();
    }

    const letters = String(title || `P${index + 1}`)
      .split(/\s+/)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return letters || "PG";
  }

  function saveWorkspace() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function renderApp() {
    applyTheme();
    renderSidebar();
    renderPage();
    renderTaskFormPages();
    renderTasks();
    renderCommandList();
  }

  function applyTheme() {
    document.body.classList.toggle("dark", state.theme === "dark");
    dom.themeToggle.textContent = state.theme === "dark" ? "Light" : "Dark";
  }

  function renderSidebar() {
    const pageCount = state.pages.length;
    dom.workspaceCount.textContent = `${pageCount} ${pageCount === 1 ? "page" : "pages"}`;

    const total = state.tasks.length;
    const done = state.tasks.filter((task) => task.status === "Done").length;
    dom.sidebarProgress.style.width = `${total ? (done / total) * 100 : 0}%`;

    renderPageStack(
      dom.favoriteList,
      state.pages.filter((page) => page.favorite),
      "No favorites yet",
      false
    );

    renderPageStack(dom.pageList, state.pages, "No pages yet", true);
  }

  function renderPageStack(container, pages, emptyText, showDelete) {
    container.innerHTML = "";

    if (!pages.length) {
      const empty = document.createElement("div");
      empty.className = "empty-note";
      empty.textContent = emptyText;
      container.appendChild(empty);
      return;
    }

    pages.forEach((page) => {
      const row = document.createElement("div");
      row.className = "page-row";
      row.classList.toggle("active", page.id === state.activePageId);

      const button = document.createElement("button");
      button.className = "page-item";
      button.type = "button";
      button.addEventListener("click", () => {
        state.activePageId = page.id;
        closeSidebar();
        renderApp();
        saveWorkspace();
      });

      const badge = document.createElement("span");
      badge.className = "page-badge";
      badge.textContent = page.icon;

      const copy = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = visiblePageTitle(page);
      const meta = document.createElement("span");
      meta.textContent = `${page.blocks.length} ${page.blocks.length === 1 ? "block" : "blocks"}`;
      copy.append(title, meta);

      button.append(badge, copy);
      row.appendChild(button);

      const deleteButton = iconButton("Delete page", "close", "page-delete");
      deleteButton.disabled = state.pages.length <= 1 || !showDelete;
      deleteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        deletePage(page.id);
      });
      row.appendChild(deleteButton);

      container.appendChild(row);
    });
  }

  function renderBreadcrumb() {
    dom.breadcrumbs.textContent = `Focus Workspace / ${visiblePageTitle(currentPage())}`;
  }

  function renderPage() {
    const page = currentPage();

    renderBreadcrumb();

    if (document.activeElement !== dom.pageTitle) {
      dom.pageTitle.value = page.title;
    }

    dom.pageUpdated.textContent = `Edited ${relativeTime(page.updatedAt)}`;
    dom.favoriteBtn.textContent = page.favorite ? "Starred" : "Star";
    dom.favoriteBtn.setAttribute("aria-pressed", String(page.favorite));
    dom.deletePageBtn.disabled = state.pages.length <= 1;

    renderBlocks(page);
  }

  function renderBlocks(page) {
    dom.blockList.innerHTML = "";

    if (!page.blocks.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No blocks yet";
      dom.blockList.appendChild(empty);
    }

    page.blocks.forEach((block, index) => {
      const row = document.createElement("div");
      row.className = `block-row block-type-${block.type}`;
      row.dataset.blockId = block.id;

      const rail = document.createElement("div");
      rail.className = "block-rail";
      const handle = document.createElement("span");
      handle.className = "block-handle";
      handle.setAttribute("aria-hidden", "true");
      for (let i = 0; i < 6; i += 1) {
        handle.appendChild(document.createElement("span"));
      }
      rail.appendChild(handle);

      const main = document.createElement("div");
      main.className = "block-main";
      appendBlockContent(main, block);

      const actions = document.createElement("div");
      actions.className = "block-actions";
      actions.append(
        typeSelect(block),
        moveBlockButton(block.id, -1, index === 0, "up", "Move block up"),
        moveBlockButton(block.id, 1, index === page.blocks.length - 1, "down", "Move block down"),
        deleteBlockButton(block.id)
      );

      row.append(rail, main, actions);
      dom.blockList.appendChild(row);
    });

    if (pendingFocusBlockId) {
      const focusId = pendingFocusBlockId;
      pendingFocusBlockId = null;
      window.setTimeout(() => {
        const target = dom.blockList.querySelector(`[data-editable-id="${focusId}"]`);
        if (target) {
          target.focus();
          placeCaretAtEnd(target);
        }
      }, 0);
    }
  }

  function appendBlockContent(parent, block) {
    if (block.type === "divider") {
      const divider = document.createElement("div");
      divider.className = "block-divider";
      divider.setAttribute("role", "separator");
      parent.appendChild(divider);
      return;
    }

    if (block.type === "todo") {
      const wrap = document.createElement("div");
      wrap.className = "block-todo";
      wrap.classList.toggle("done", block.checked);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = block.checked;
      checkbox.addEventListener("change", () => {
        block.checked = checkbox.checked;
        touchAndSave();
        renderBlocks(currentPage());
      });

      const editable = editableBlock(block, "To-do");
      wrap.append(checkbox, editable);
      parent.appendChild(wrap);
      return;
    }

    if (block.type === "bullet") {
      const bullet = document.createElement("div");
      bullet.className = "block-bullet";
      bullet.appendChild(editableBlock(block, "List item"));
      parent.appendChild(bullet);
      return;
    }

    const editable = editableBlock(
      block,
      block.type === "heading" ? "Heading" : block.type === "callout" ? "Callout" : "Text"
    );

    if (block.type === "heading") {
      editable.classList.add("block-heading");
    }

    if (block.type === "callout") {
      editable.classList.add("block-callout");
    }

    parent.appendChild(editable);
  }

  function editableBlock(block, placeholder) {
    const editable = document.createElement("div");
    editable.className = "block-content";
    editable.dataset.editableId = block.id;
    editable.setAttribute("contenteditable", "true");
    editable.setAttribute("spellcheck", "true");
    editable.setAttribute("data-placeholder", placeholder);
    editable.textContent = block.content;

    editable.addEventListener("input", () => {
      block.content = editable.textContent;
      touchAndSave();
    });

    editable.addEventListener("paste", (event) => {
      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    });

    editable.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        const next = addBlock("text", "", block.id);
        pendingFocusBlockId = next.id;
        renderPage();
        saveWorkspace();
      }

      if (
        event.key === "Backspace" &&
        !editable.textContent.trim() &&
        currentPage().blocks.length > 1
      ) {
        event.preventDefault();
        removeBlock(block.id);
      }
    });

    return editable;
  }

  function typeSelect(block) {
    const select = document.createElement("select");
    select.className = "type-select";
    select.setAttribute("aria-label", "Block type");

    BLOCK_TYPES.forEach((type) => {
      const option = document.createElement("option");
      option.value = type.type;
      option.textContent = type.label;
      option.selected = type.type === block.type;
      select.appendChild(option);
    });

    select.addEventListener("change", () => {
      block.type = select.value;
      if (block.type === "divider") {
        block.content = "";
      }
      touchAndSave();
      renderBlocks(currentPage());
    });

    return select;
  }

  function moveBlockButton(blockId, direction, disabled, icon, label) {
    const button = iconButton(label, icon, "tiny-button");
    button.disabled = disabled;
    button.addEventListener("click", () => {
      moveBlock(blockId, direction);
    });
    return button;
  }

  function deleteBlockButton(blockId) {
    const button = iconButton("Delete block", "trash", "tiny-button");
    button.addEventListener("click", () => removeBlock(blockId));
    return button;
  }

  function renderSlashMenu() {
    const value = dom.blockInput.value.trim().toLowerCase();

    if (!value.startsWith("/")) {
      hideSlashMenu();
      return;
    }

    const query = value.slice(1).split(/\s+/)[0];
    const options = BLOCK_TYPES.filter((type) => {
      return (
        type.label.toLowerCase().includes(query) ||
        type.aliases.some((alias) => alias.includes(query))
      );
    });

    dom.slashMenu.innerHTML = "";

    options.forEach((option) => {
      const button = document.createElement("button");
      button.className = "slash-option";
      button.type = "button";

      const mark = document.createElement("span");
      mark.textContent = option.shortLabel;

      const copy = document.createElement("span");
      const label = document.createElement("strong");
      label.textContent = option.label;
      const description = document.createElement("small");
      description.textContent = option.description;
      copy.append(label, description);

      button.append(mark, copy);
      button.addEventListener("click", () => addBlockFromComposer(option.type));
      dom.slashMenu.appendChild(button);
    });

    dom.slashMenu.classList.toggle("hidden", options.length === 0);
  }

  function hideSlashMenu() {
    dom.slashMenu.classList.add("hidden");
  }

  function addBlockFromComposer(forcedType) {
    const parsed = parseComposerValue(dom.blockInput.value, forcedType);

    if (!parsed.type) {
      showToast("Choose a block type");
      return;
    }

    const block = addBlock(parsed.type, parsed.content);
    pendingFocusBlockId = block.id;
    dom.blockInput.value = "";
    hideSlashMenu();
    renderPage();
    saveWorkspace();
  }

  function parseComposerValue(value, forcedType) {
    const trimmed = value.trim();

    if (forcedType) {
      return {
        type: forcedType,
        content: trimmed.startsWith("/") ? trimmed.replace(/^\/\S*\s*/, "") : trimmed
      };
    }

    if (!trimmed.startsWith("/")) {
      return {
        type: "text",
        content: trimmed
      };
    }

    const parts = trimmed.slice(1).split(/\s+/);
    const command = parts.shift().toLowerCase();
    const type = BLOCK_TYPES.find((blockType) => blockType.aliases.includes(command));

    return {
      type: type ? type.type : null,
      content: parts.join(" ")
    };
  }

  function addBlock(type, content = "", afterId) {
    const page = currentPage();
    const block = createBlock(type, content);

    if (afterId) {
      const index = page.blocks.findIndex((item) => item.id === afterId);
      page.blocks.splice(index + 1, 0, block);
    } else {
      page.blocks.push(block);
    }

    touchPage(page);
    return block;
  }

  function removeBlock(blockId) {
    const page = currentPage();

    if (page.blocks.length <= 1) {
      const block = page.blocks[0];
      block.type = "text";
      block.content = "";
      block.checked = false;
    } else {
      page.blocks = page.blocks.filter((block) => block.id !== blockId);
    }

    touchAndSave();
    renderPage();
  }

  function moveBlock(blockId, direction) {
    const page = currentPage();
    const index = page.blocks.findIndex((block) => block.id === blockId);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= page.blocks.length) {
      return;
    }

    const [block] = page.blocks.splice(index, 1);
    page.blocks.splice(nextIndex, 0, block);
    touchAndSave();
    renderPage();
  }

  function renderTaskFormPages() {
    const selected = dom.taskPage.value || state.activePageId;
    dom.taskPage.innerHTML = "";

    state.pages.forEach((page) => {
      const option = document.createElement("option");
      option.value = page.id;
      option.textContent = visiblePageTitle(page);
      option.selected = page.id === selected;
      dom.taskPage.appendChild(option);
    });
  }

  function renderTasks() {
    const total = state.tasks.length;
    const done = state.tasks.filter((task) => task.status === "Done").length;
    dom.taskSummary.textContent = total ? `${done}/${total} complete` : "No tasks";

    if (document.activeElement !== dom.taskSearchInput) {
      dom.taskSearchInput.value = state.taskQuery;
    }

    dom.statusFilter.value = state.taskFilter;

    document.querySelectorAll("[data-view]").forEach((button) => {
      const active = button.dataset.view === state.activeView;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });

    const tasks = filteredTasks();

    if (state.activeView === "board") {
      dom.taskTable.classList.add("hidden");
      dom.taskBoard.classList.remove("hidden");
      renderBoard(tasks);
    } else {
      dom.taskBoard.classList.add("hidden");
      dom.taskTable.classList.remove("hidden");
      renderTable(tasks);
    }

    renderSidebar();
  }

  function filteredTasks() {
    const query = state.taskQuery.trim().toLowerCase();

    return state.tasks
      .filter((task) => state.taskFilter === "all" || task.status === state.taskFilter)
      .filter((task) => {
        if (!query) {
          return true;
        }

        const page = pageById(task.pageId);
        return [
          task.title,
          task.notes,
          task.status,
          task.priority,
          task.due,
          page ? page.title : ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        const statusOrder = STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
        if (statusOrder !== 0) {
          return statusOrder;
        }

        return dueValue(a.due) - dueValue(b.due);
      });
  }

  function renderTable(tasks) {
    dom.taskTable.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "table-wrap";

    const header = document.createElement("div");
    header.className = "table-row header";
    ["Task", "Page", "Status", "Priority", "Due", ""].forEach((label) => {
      const cell = document.createElement("div");
      cell.className = "table-cell";
      cell.textContent = label;
      header.appendChild(cell);
    });
    wrap.appendChild(header);

    if (!tasks.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No matching tasks";
      dom.taskTable.appendChild(empty);
      return;
    }

    tasks.forEach((task) => {
      const row = document.createElement("div");
      row.className = "table-row";
      row.append(
        tableTitleCell(task),
        tablePageCell(task),
        tableSelectCell(task, "status", STATUSES),
        tableSelectCell(task, "priority", PRIORITIES),
        tableDueCell(task),
        tableDeleteCell(task)
      );
      wrap.appendChild(row);
    });

    dom.taskTable.appendChild(wrap);
  }

  function tableTitleCell(task) {
    const cell = tableCell();
    const input = document.createElement("input");
    input.type = "text";
    input.value = task.title;
    input.setAttribute("aria-label", "Task title");
    input.addEventListener("input", () => {
      task.title = input.value;
      saveWorkspace();
      renderCommandList();
    });
    input.addEventListener("blur", () => {
      if (!task.title.trim()) {
        task.title = "Untitled task";
        renderTasks();
        saveWorkspace();
      }
    });
    cell.appendChild(input);
    return cell;
  }

  function tablePageCell(task) {
    const cell = tableCell();
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Linked page");

    state.pages.forEach((page) => {
      const option = document.createElement("option");
      option.value = page.id;
      option.textContent = visiblePageTitle(page);
      option.selected = page.id === task.pageId;
      select.appendChild(option);
    });

    select.addEventListener("change", () => {
      task.pageId = select.value;
      saveWorkspace();
      renderTasks();
    });

    cell.appendChild(select);
    return cell;
  }

  function tableSelectCell(task, property, options) {
    const cell = tableCell();
    const select = document.createElement("select");
    select.setAttribute("aria-label", property);

    options.forEach((optionValue) => {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue;
      option.selected = task[property] === optionValue;
      select.appendChild(option);
    });

    select.addEventListener("change", () => {
      task[property] = select.value;
      saveWorkspace();
      renderTasks();
    });

    cell.appendChild(select);
    return cell;
  }

  function tableDueCell(task) {
    const cell = tableCell();
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "numeric";
    input.placeholder = "YYYY-MM-DD";
    input.pattern = "\\d{4}-\\d{2}-\\d{2}";
    input.value = task.due || "";
    input.setAttribute("aria-label", "Task due date");
    input.addEventListener("change", () => {
      task.due = input.value;
      saveWorkspace();
      renderTasks();
    });
    cell.appendChild(input);
    return cell;
  }

  function tableDeleteCell(task) {
    const cell = tableCell();
    const button = iconButton("Delete task", "trash", "icon-button");
    button.addEventListener("click", () => deleteTask(task.id));
    cell.appendChild(button);
    return cell;
  }

  function tableCell() {
    const cell = document.createElement("div");
    cell.className = "table-cell";
    return cell;
  }

  function renderBoard(tasks) {
    dom.taskBoard.innerHTML = "";

    STATUSES.forEach((status) => {
      const columnTasks = tasks.filter((task) => task.status === status);
      const column = document.createElement("section");
      column.className = "board-column";
      column.dataset.status = status;

      column.addEventListener("dragover", (event) => {
        event.preventDefault();
        column.classList.add("drag-over");
      });

      column.addEventListener("dragleave", () => {
        column.classList.remove("drag-over");
      });

      column.addEventListener("drop", (event) => {
        event.preventDefault();
        column.classList.remove("drag-over");
        if (draggedTaskId) {
          updateTask(draggedTaskId, { status });
          draggedTaskId = null;
        }
      });

      const heading = document.createElement("div");
      heading.className = "board-heading";
      const title = document.createElement("span");
      title.textContent = status;
      const count = document.createElement("span");
      count.textContent = String(columnTasks.length);
      heading.append(title, count);
      column.appendChild(heading);

      if (!columnTasks.length) {
        const empty = document.createElement("div");
        empty.className = "empty-note";
        empty.textContent = "No tasks";
        column.appendChild(empty);
      }

      columnTasks.forEach((task) => {
        column.appendChild(boardCard(task));
      });

      dom.taskBoard.appendChild(column);
    });
  }

  function boardCard(task) {
    const card = document.createElement("article");
    card.className = "board-card";
    card.draggable = true;
    card.addEventListener("dragstart", () => {
      draggedTaskId = task.id;
    });
    card.addEventListener("dragend", () => {
      draggedTaskId = null;
    });

    const title = document.createElement("strong");
    title.textContent = task.title;

    const page = pageById(task.pageId);
    const meta = document.createElement("div");
    meta.className = "card-meta";
    meta.append(
      tag(page ? visiblePageTitle(page) : "No page"),
      tag(task.priority, task.priority.toLowerCase()),
      tag(task.due ? formatDate(task.due) : "No due")
    );

    const actions = document.createElement("div");
    actions.className = "task-tags";
    STATUSES.forEach((status) => {
      const button = document.createElement("button");
      button.className = "toolbar-button";
      button.type = "button";
      button.textContent = status === task.status ? "Current" : status;
      button.disabled = status === task.status;
      button.addEventListener("click", () => updateTask(task.id, { status }));
      actions.appendChild(button);
    });

    card.append(title, meta, actions);
    return card;
  }

  function tag(text, className = "") {
    const span = document.createElement("span");
    span.className = `tag ${className}`.trim();
    span.textContent = text;
    return span;
  }

  function showTaskForm(show) {
    dom.taskForm.classList.toggle("hidden", !show);

    if (show) {
      renderTaskFormPages();
      dom.taskPage.value = state.activePageId;
      window.setTimeout(() => dom.taskTitle.focus(), 0);
    }
  }

  function resetTaskForm() {
    dom.taskForm.reset();
    dom.taskStatus.value = "Backlog";
    dom.taskPriority.value = "Medium";
    dom.taskPage.value = state.activePageId;
  }

  function createTaskFromForm() {
    const title = dom.taskTitle.value.trim();

    if (!title) {
      showToast("Task name is required");
      dom.taskTitle.focus();
      return;
    }

    state.tasks.push({
      id: uid("task"),
      title,
      status: dom.taskStatus.value,
      priority: dom.taskPriority.value,
      due: dom.taskDue.value,
      pageId: dom.taskPage.value || state.activePageId,
      notes: dom.taskNotes.value.trim(),
      createdAt: new Date().toISOString()
    });

    resetTaskForm();
    showTaskForm(false);
    saveWorkspace();
    renderTasks();
    showToast("Task saved");
  }

  function updateTask(taskId, patch) {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) {
      return;
    }

    Object.assign(task, patch);
    saveWorkspace();
    renderTasks();
  }

  function deleteTask(taskId) {
    state.tasks = state.tasks.filter((task) => task.id !== taskId);
    saveWorkspace();
    renderTasks();
  }

  function createPage(title = "Untitled") {
    const page = {
      id: uid("page"),
      title,
      icon: normalizePageIcon("", title, state.pages.length),
      favorite: false,
      updatedAt: new Date().toISOString(),
      blocks: [
        createBlock("heading", "New page"),
        createBlock("text", "")
      ]
    };

    state.pages.unshift(page);
    state.activePageId = page.id;
    closeSidebar();
    saveWorkspace();
    renderApp();
    showToast("Page created");
    window.setTimeout(() => {
      dom.pageTitle.focus();
      dom.pageTitle.select();
    }, 0);
  }

  function duplicatePage() {
    const page = currentPage();
    const clone = {
      ...page,
      id: uid("page"),
      title: `${visiblePageTitle(page)} copy`,
      favorite: false,
      updatedAt: new Date().toISOString(),
      blocks: page.blocks.map((block) => ({
        ...block,
        id: uid("block")
      }))
    };

    state.pages.unshift(clone);
    state.activePageId = clone.id;
    saveWorkspace();
    renderApp();
    showToast("Page duplicated");
  }

  function deletePage(pageId) {
    if (state.pages.length <= 1) {
      showToast("Keep at least one page");
      return;
    }

    const page = pageById(pageId);
    if (!page) {
      return;
    }

    const confirmed = window.confirm(`Delete "${visiblePageTitle(page)}"? Tasks linked to it will move to the next page.`);
    if (!confirmed) {
      return;
    }

    state.pages = state.pages.filter((item) => item.id !== pageId);
    const fallbackPage = state.pages[0];
    state.tasks.forEach((task) => {
      if (task.pageId === pageId) {
        task.pageId = fallbackPage.id;
      }
    });

    if (state.activePageId === pageId) {
      state.activePageId = fallbackPage.id;
    }

    saveWorkspace();
    renderApp();
    showToast("Page deleted");
  }

  function toggleFavorite() {
    const page = currentPage();
    page.favorite = !page.favorite;
    touchAndSave();
    renderApp();
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    saveWorkspace();
  }

  function openCommandPalette() {
    dom.commandOverlay.classList.remove("hidden");
    dom.commandSearch.value = "";
    renderCommandList();
    window.setTimeout(() => dom.commandSearch.focus(), 0);
  }

  function closeCommandPalette() {
    dom.commandOverlay.classList.add("hidden");
  }

  function renderCommandList() {
    if (!dom.commandList) {
      return;
    }

    const query = dom.commandSearch.value.trim().toLowerCase();
    const commands = commandItems().filter((command) => {
      return `${command.label} ${command.hint}`.toLowerCase().includes(query);
    });

    dom.commandList.innerHTML = "";

    if (!commands.length) {
      const empty = document.createElement("div");
      empty.className = "empty-note";
      empty.textContent = "No commands found";
      dom.commandList.appendChild(empty);
      return;
    }

    commands.forEach((command) => {
      const button = document.createElement("button");
      button.className = "command-item";
      button.type = "button";

      const label = document.createElement("strong");
      label.textContent = command.label;
      const hint = document.createElement("span");
      hint.textContent = command.hint;

      button.append(label, hint);
      button.addEventListener("click", () => {
        closeCommandPalette();
        command.run();
      });

      dom.commandList.appendChild(button);
    });
  }

  function commandItems() {
    return [
      {
        label: "New page",
        hint: "Create a blank page",
        run: () => createPage()
      },
      {
        label: "Duplicate page",
        hint: visiblePageTitle(currentPage()),
        run: duplicatePage
      },
      {
        label: "Add text block",
        hint: "Append paragraph",
        run: () => commandAddBlock("text")
      },
      {
        label: "Add heading block",
        hint: "Append section title",
        run: () => commandAddBlock("heading")
      },
      {
        label: "Add to-do block",
        hint: "Append checkbox",
        run: () => commandAddBlock("todo")
      },
      {
        label: "Add callout block",
        hint: "Append highlighted note",
        run: () => commandAddBlock("callout")
      },
      {
        label: "New task",
        hint: "Open task form",
        run: () => showTaskForm(true)
      },
      {
        label: "Table view",
        hint: "Show task database as rows",
        run: () => {
          state.activeView = "table";
          saveWorkspace();
          renderTasks();
        }
      },
      {
        label: "Board view",
        hint: "Show task database as columns",
        run: () => {
          state.activeView = "board";
          saveWorkspace();
          renderTasks();
        }
      },
      {
        label: "Toggle theme",
        hint: state.theme === "dark" ? "Switch to light" : "Switch to dark",
        run: toggleTheme
      },
      {
        label: "Clear completed tasks",
        hint: "Remove done items",
        run: clearCompletedTasks
      }
    ];
  }

  function commandAddBlock(type) {
    const block = addBlock(type, "");
    pendingFocusBlockId = block.id;
    touchAndSave();
    renderPage();
  }

  function clearCompletedTasks() {
    const completed = state.tasks.filter((task) => task.status === "Done").length;
    state.tasks = state.tasks.filter((task) => task.status !== "Done");
    saveWorkspace();
    renderTasks();
    showToast(completed ? "Completed tasks cleared" : "No completed tasks");
  }

  function currentPage() {
    return state.pages.find((page) => page.id === state.activePageId) || state.pages[0];
  }

  function pageById(id) {
    return state.pages.find((page) => page.id === id);
  }

  function visiblePageTitle(page) {
    return page && page.title.trim() ? page.title.trim() : "Untitled";
  }

  function touchPage(page = currentPage()) {
    page.updatedAt = new Date().toISOString();
  }

  function touchAndSave() {
    touchPage();
    saveWorkspace();
    renderSidebar();
    renderBreadcrumb();
  }

  function createBlock(type = "text", content = "", checked = false) {
    return {
      id: uid("block"),
      type,
      content,
      checked
    };
  }

  function createTask(title, pageId, status, priority, due, notes) {
    return {
      id: uid("task"),
      title,
      pageId,
      status,
      priority,
      due,
      notes,
      createdAt: new Date().toISOString()
    };
  }

  function iconButton(label, icon, className = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `icon-button ${className}`.trim();
    button.setAttribute("aria-label", label);
    button.innerHTML = ICONS[icon] || "";
    return button;
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function offsetDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function dueValue(value) {
    return value ? new Date(`${value}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
  }

  function formatDate(value) {
    if (!value) {
      return "No date";
    }

    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    });
  }

  function relativeTime(value) {
    const date = new Date(value);
    const diff = Date.now() - date.getTime();
    const minute = 1000 * 60;
    const hour = minute * 60;
    const day = hour * 24;

    if (Number.isNaN(date.getTime()) || diff < minute) {
      return "just now";
    }

    if (diff < hour) {
      const minutes = Math.floor(diff / minute);
      return `${minutes}m ago`;
    }

    if (diff < day) {
      const hours = Math.floor(diff / hour);
      return `${hours}h ago`;
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    });
  }

  function placeCaretAtEnd(element) {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function closeSidebar() {
    document.body.classList.remove("sidebar-open");
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    dom.toast.textContent = message;
    dom.toast.classList.remove("hidden");
    toastTimer = window.setTimeout(() => {
      dom.toast.classList.add("hidden");
    }, 2200);
  }
})();
