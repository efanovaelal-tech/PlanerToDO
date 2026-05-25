(() => {
  "use strict";

  const STORAGE_KEY = "twelveWeekPlannerData";
  const SCHEMA_VERSION = 1;
  const TOTAL_DAYS = 84;
  const TOTAL_WEEKS = 12;
  const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
  const TASK_CATEGORIES = ["resource", "social", "project"];

  const elements = {
    onboarding: document.querySelector("#onboardingScreen"),
    dashboard: document.querySelector("#dashboardScreen"),
    completion: document.querySelector("#completionScreen"),
    form: document.querySelector("#cycleForm"),
    cycleGoal: document.querySelector("#cycleGoal"),
    successCriterion: document.querySelector("#successCriterion"),
    cycleStartDate: document.querySelector("#cycleStartDate"),
    finishCycleButton: document.querySelector("#finishCycleButton"),
    exportButton: document.querySelector("#exportButton"),
    importButton: document.querySelector("#importButton"),
    importFile: document.querySelector("#importFile"),
    dashboardTitle: document.querySelector("#dashboardTitle"),
    activeSuccessCriterion: document.querySelector("#activeSuccessCriterion"),
    cycleEndDate: document.querySelector("#cycleEndDate"),
    currentDay: document.querySelector("#currentDay"),
    currentWeek: document.querySelector("#currentWeek"),
    progressPercent: document.querySelector("#progressPercent"),
    progressBar: document.querySelector("#cycleProgress"),
    progressFill: document.querySelector("#progressFill"),
    cycleDates: document.querySelector("#cycleDates"),
    weeklyFocus: document.querySelector("#weeklyFocus"),
    focusSaveStatus: document.querySelector("#focusSaveStatus"),
    overviewWeekRange: document.querySelector("#overviewWeekRange"),
    overviewWeekNumber: document.querySelector("#overviewWeekNumber"),
    previousWeekButton: document.querySelector("#previousWeekButton"),
    nextWeekButton: document.querySelector("#nextWeekButton"),
    weekDays: document.querySelector("#weekDays"),
    selectedDate: document.querySelector("#selectedDate"),
    selectedDateNote: document.querySelector("#selectedDateNote"),
    dayStatus: document.querySelector("#dayStatus"),
    previousDayButton: document.querySelector("#previousDayButton"),
    todayButton: document.querySelector("#todayButton"),
    nextDayButton: document.querySelector("#nextDayButton"),
    emptyDayMessage: document.querySelector("#emptyDayMessage"),
    taskForms: document.querySelectorAll(".task-form"),
    taskColumns: document.querySelector(".task-columns"),
    taskLists: {
      resource: document.querySelector("#resourceTaskList"),
      social: document.querySelector("#socialTaskList"),
      project: document.querySelector("#projectTaskList")
    },
    taskChecklistModal: document.querySelector("#taskChecklistModal"),
    pendingTaskText: document.querySelector("#pendingTaskText"),
    cancelTaskButton: document.querySelector("#cancelTaskButton"),
    saveTaskButton: document.querySelector("#saveTaskButton"),
    taskEditModal: document.querySelector("#taskEditModal"),
    taskEditForm: document.querySelector("#taskEditForm"),
    editedTaskText: document.querySelector("#editedTaskText"),
    editedTaskDate: document.querySelector("#editedTaskDate"),
    cancelTaskEditButton: document.querySelector("#cancelTaskEditButton"),
    habitForm: document.querySelector("#habitForm"),
    habitName: document.querySelector("#habitName"),
    habitsDateNote: document.querySelector("#habitsDateNote"),
    habitsList: document.querySelector("#habitsList"),
    statsWeekRange: document.querySelector("#statsWeekRange"),
    statsWeekNumber: document.querySelector("#statsWeekNumber"),
    taskScore: document.querySelector("#taskScore"),
    taskScoreNote: document.querySelector("#taskScoreNote"),
    habitScore: document.querySelector("#habitScore"),
    habitScoreNote: document.querySelector("#habitScoreNote"),
    weeklyReflectionForm: document.querySelector("#weeklyReflectionForm"),
    reflectionWeekNumber: document.querySelector("#reflectionWeekNumber"),
    reflectionWins: document.querySelector("#reflectionWins"),
    reflectionLessons: document.querySelector("#reflectionLessons"),
    reflectionSaveStatus: document.querySelector("#reflectionSaveStatus"),
    finalTaskScore: document.querySelector("#finalTaskScore"),
    finalTaskScoreNote: document.querySelector("#finalTaskScoreNote"),
    finalHabitScore: document.querySelector("#finalHabitScore"),
    finalHabitScoreNote: document.querySelector("#finalHabitScoreNote"),
    finalReflection: document.querySelector("#finalReflection"),
    finalReflectionSaveStatus: document.querySelector("#finalReflectionSaveStatus"),
    archiveCycleButton: document.querySelector("#archiveCycleButton"),
    startNewCycleButton: document.querySelector("#startNewCycleButton"),
    storagePreview: document.querySelector("#storagePreview"),
    storageMessage: document.querySelector("#storageMessage"),
    storageIndicator: document.querySelector("#storageIndicator")
  };

  let appData = loadData();
  let pendingTask = null;
  let editingTaskId = null;

  function createInitialData() {
    return {
      schemaVersion: SCHEMA_VERSION,
      activeCycleId: null,
      cycles: []
    };
  }

  function isDateInputValue(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const date = new Date(toUtcTimestamp(value));
    return date.toISOString().slice(0, 10) === value;
  }

  function toUtcTimestamp(value) {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  }

  function addCalendarDays(value, days) {
    const date = new Date(toUtcTimestamp(value));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function clampDateToCycle(value, startDate, endDate) {
    if (!isDateInputValue(value) || value < startDate) {
      return startDate;
    }

    if (value > endDate) {
      return endDate;
    }

    return value;
  }

  function normalizeTask(task, startDate, endDate) {
    if (!task || typeof task !== "object") {
      return null;
    }

    const text = typeof task.text === "string" ? task.text.trim() : "";
    const category = TASK_CATEGORIES.includes(task.category) ? task.category : null;
    const date =
      isDateInputValue(task.date) && task.date >= startDate && task.date <= endDate
        ? task.date
        : null;

    if (!text || !category || !date) {
      return null;
    }

    return {
      id: typeof task.id === "string" ? task.id : createTaskId(),
      text,
      category,
      date,
      status: task.status === "completed" ? "completed" : "active",
      history: Array.isArray(task.history)
        ? task.history
            .map((entry) => normalizeTaskHistoryEntry(entry, startDate, endDate))
            .filter(Boolean)
        : [],
      createdAt: typeof task.createdAt === "string" ? task.createdAt : new Date().toISOString()
    };
  }

  function normalizeTaskHistoryEntry(entry, startDate, endDate) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const text = typeof entry.text === "string" ? entry.text.trim() : "";
    const date =
      isDateInputValue(entry.date) && entry.date >= startDate && entry.date <= endDate
        ? entry.date
        : null;

    if (!text || !date) {
      return null;
    }

    return {
      text,
      date,
      changedAt: typeof entry.changedAt === "string" ? entry.changedAt : new Date().toISOString()
    };
  }

  function normalizeHabit(habit, startDate, endDate) {
    if (!habit || typeof habit !== "object") {
      return null;
    }

    const name = typeof habit.name === "string" ? habit.name.trim() : "";

    if (!name || habit.isActive !== true) {
      return null;
    }

    const checks =
      habit.checks && typeof habit.checks === "object" && !Array.isArray(habit.checks)
        ? Object.fromEntries(
            Object.entries(habit.checks).filter(
              ([date, value]) =>
                value === true &&
                isDateInputValue(date) &&
                date >= startDate &&
                date <= endDate
            )
          )
        : {};

    return {
      id: typeof habit.id === "string" ? habit.id : createHabitId(),
      name,
      isActive: true,
      checks,
      createdAt: typeof habit.createdAt === "string" ? habit.createdAt : new Date().toISOString()
    };
  }

  function normalizeWeeklyReflections(candidate) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(candidate)
        .filter(([week]) => Number(week) >= 1 && Number(week) <= TOTAL_WEEKS)
        .map(([week, reflection]) => [
          week,
          {
            wins:
              reflection && typeof reflection.wins === "string" ? reflection.wins : "",
            lessons:
              reflection && typeof reflection.lessons === "string" ? reflection.lessons : ""
          }
        ])
    );
  }

  function normalizeCycle(cycle) {
    if (!cycle || typeof cycle !== "object" || !isDateInputValue(cycle.startDate)) {
      return null;
    }

    const startDate = cycle.startDate;
    const endDate = addCalendarDays(startDate, TOTAL_DAYS - 1);
    const selectedDate = clampDateToCycle(
      typeof cycle.selectedDate === "string"
        ? cycle.selectedDate
        : formatDateForInput(new Date()),
      startDate,
      endDate
    );

    return {
      id: typeof cycle.id === "string" ? cycle.id : createCycleId(),
      status: cycle.status === "archived" ? "archived" : "active",
      goal:
        typeof cycle.goal === "string"
          ? cycle.goal
          : typeof cycle.name === "string"
            ? cycle.name
            : "",
      successCriterion:
        typeof cycle.successCriterion === "string"
          ? cycle.successCriterion
          : typeof cycle.focus === "string"
            ? cycle.focus
            : "",
      startDate,
      endDate,
      weeklyFocus: typeof cycle.weeklyFocus === "string" ? cycle.weeklyFocus : "",
      selectedDate,
      tasks: Array.isArray(cycle.tasks)
        ? cycle.tasks.map((task) => normalizeTask(task, startDate, endDate)).filter(Boolean)
        : [],
      habits: Array.isArray(cycle.habits)
        ? cycle.habits
            .map((habit) => normalizeHabit(habit, startDate, endDate))
            .filter(Boolean)
            .slice(0, 2)
        : [],
      weeklyReflections: normalizeWeeklyReflections(cycle.weeklyReflections),
      finalReflection:
        typeof cycle.finalReflection === "string" ? cycle.finalReflection : "",
      archivedAt: typeof cycle.archivedAt === "string" ? cycle.archivedAt : null,
      createdAt: typeof cycle.createdAt === "string" ? cycle.createdAt : new Date().toISOString()
    };
  }

  function normalizeData(candidate) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return createInitialData();
    }

    const cycles = Array.isArray(candidate.cycles)
      ? candidate.cycles.map(normalizeCycle).filter(Boolean)
      : [];
    const requestedActiveId =
      typeof candidate.activeCycleId === "string" ? candidate.activeCycleId : null;
    const hasActiveCycle = cycles.some(
      (cycle) => cycle.id === requestedActiveId && cycle.status === "active"
    );

    return {
      schemaVersion: SCHEMA_VERSION,
      activeCycleId: hasActiveCycle ? requestedActiveId : null,
      cycles
    };
  }

  function loadData() {
    try {
      const storedValue = localStorage.getItem(STORAGE_KEY);

      if (!storedValue) {
        const initialData = createInitialData();
        persistData(initialData);
        return initialData;
      }

      const normalizedData = normalizeData(JSON.parse(storedValue));
      persistData(normalizedData);
      return normalizedData;
    } catch (error) {
      showStorageWarning("Хранилище недоступно. Данные показаны только в этой вкладке.");
      return createInitialData();
    }
  }

  function persistData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      elements.storageIndicator.classList.remove("warning");
      elements.storageIndicator.textContent = "localStorage";
      elements.storageMessage.textContent =
        "Данные сохранены под ключом twelveWeekPlannerData.";
    } catch (error) {
      showStorageWarning("Не удалось записать данные в localStorage.");
    }
  }

  function showStorageWarning(message) {
    elements.storageIndicator.classList.add("warning");
    elements.storageIndicator.textContent = "Только просмотр";
    elements.storageMessage.textContent = message;
  }

  function formatDateForInput(date) {
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
  }

  function formatReadableDate(value) {
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function formatOverviewWeekday(value) {
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString("ru-RU", { weekday: "short" }).replace(".", "");
  }

  function formatOverviewDate(value) {
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  }

  function createCycleId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `cycle-${Date.now()}`;
  }

  function createTaskId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `task-${Date.now()}-${Math.round(Math.random() * 10000)}`;
  }

  function createHabitId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `habit-${Date.now()}-${Math.round(Math.random() * 10000)}`;
  }

  function getActiveCycle() {
    return appData.cycles.find((cycle) => cycle.id === appData.activeCycleId) || null;
  }

  function countDaysBetween(startDate, endDate) {
    return Math.floor((toUtcTimestamp(endDate) - toUtcTimestamp(startDate)) / MILLISECONDS_PER_DAY) + 1;
  }

  function getCycleDateForToday(cycle) {
    return clampDateToCycle(formatDateForInput(new Date()), cycle.startDate, cycle.endDate);
  }

  function calculateViewedWeek(cycle) {
    const dayNumber = countDaysBetween(cycle.startDate, cycle.selectedDate);
    const weekNumber = Math.min(Math.ceil(dayNumber / 7), TOTAL_WEEKS);
    const weekStart = addCalendarDays(cycle.startDate, (weekNumber - 1) * 7);
    const rawWeekEnd = addCalendarDays(weekStart, 6);
    const weekEnd = rawWeekEnd > cycle.endDate ? cycle.endDate : rawWeekEnd;

    return { weekNumber, weekStart, weekEnd };
  }

  function calculateCycleProgress(cycle) {
    const today = formatDateForInput(new Date());
    const rawDayNumber =
      Math.floor((toUtcTimestamp(today) - toUtcTimestamp(cycle.startDate)) / MILLISECONDS_PER_DAY) + 1;
    const dayNumber = Math.min(Math.max(rawDayNumber, 1), TOTAL_DAYS);
    const weekNumber = Math.min(Math.ceil(dayNumber / 7), TOTAL_WEEKS);
    const percentage = Math.round((dayNumber / TOTAL_DAYS) * 100);

    return {
      rawDayNumber,
      dayNumber,
      weekNumber,
      percentage,
      isFinished: rawDayNumber > TOTAL_DAYS
    };
  }

  function showScreen(screenToShow) {
    const showOnboarding = screenToShow === "onboarding";
    const showDashboard = screenToShow === "dashboard";
    const showCompletion = screenToShow === "completion";

    elements.onboarding.classList.toggle("hidden", !showOnboarding);
    elements.dashboard.classList.toggle("hidden", !showDashboard);
    elements.completion.classList.toggle("hidden", !showCompletion);
    elements.onboarding.setAttribute("aria-hidden", String(!showOnboarding));
    elements.dashboard.setAttribute("aria-hidden", String(!showDashboard));
    elements.completion.setAttribute("aria-hidden", String(!showCompletion));
  }

  function renderStoragePreview() {
    elements.storagePreview.textContent = JSON.stringify(appData, null, 2);
  }

  function renderWeekOverview(cycle) {
    const { weekNumber, weekStart, weekEnd } = calculateViewedWeek(cycle);
    const activeHabits = cycle.habits.filter((habit) => habit.isActive);
    const today = formatDateForInput(new Date());

    elements.overviewWeekNumber.textContent = `${weekNumber}-я неделя`;
    elements.overviewWeekRange.textContent =
      `${formatReadableDate(weekStart)} - ${formatReadableDate(weekEnd)}`;
    elements.previousWeekButton.disabled = weekNumber <= 1;
    elements.nextWeekButton.disabled = weekNumber >= TOTAL_WEEKS;
    elements.weekDays.replaceChildren();

    for (let date = weekStart; date <= weekEnd; date = addCalendarDays(date, 1)) {
      const tasks = cycle.tasks.filter((task) => task.date === date);
      const completedTasks = tasks.filter((task) => task.status === "completed").length;
      const completedHabits = activeHabits.filter((habit) => habit.checks[date] === true).length;
      const isSelected = date === cycle.selectedDate;
      const isToday = date === today;
      const isFuture = date > today;
      const isComplete =
        !isFuture &&
        tasks.length > 0 &&
        completedTasks === tasks.length &&
        (activeHabits.length === 0 || completedHabits === activeHabits.length);
      const button = document.createElement("button");
      const weekday = document.createElement("span");
      const dayDate = document.createElement("span");
      const summary = document.createElement("span");
      const taskSummary = document.createElement("span");
      const habitSummary = document.createElement("span");

      button.type = "button";
      button.className = [
        "week-day",
        isSelected ? "selected" : "",
        isToday ? "today" : "",
        isFuture ? "future" : "",
        isComplete ? "complete" : ""
      ].filter(Boolean).join(" ");
      button.dataset.date = date;
      button.setAttribute(
        "aria-label",
        `${formatReadableDate(date)}. Задачи: ${completedTasks} из ${tasks.length}. ` +
          `Привычки: ${completedHabits} из ${activeHabits.length}.`
      );

      if (isSelected) {
        button.setAttribute("aria-current", "date");
      }

      weekday.className = "week-day-name";
      weekday.textContent = formatOverviewWeekday(date);
      dayDate.className = "week-day-date";
      dayDate.textContent = formatOverviewDate(date);
      summary.className = "week-day-summary";
      taskSummary.textContent = `Задачи ${completedTasks}/${tasks.length}`;
      habitSummary.textContent = `Привычки ${completedHabits}/${activeHabits.length}`;
      summary.append(taskSummary, habitSummary);
      button.append(weekday, dayDate, summary);
      elements.weekDays.append(button);
    }
  }

  function renderDayHeader(cycle) {
    const today = formatDateForInput(new Date());
    const todayInCycle = getCycleDateForToday(cycle);
    const isFutureDate = cycle.selectedDate > today;

    elements.selectedDate.min = cycle.startDate;
    elements.selectedDate.max = cycle.endDate;
    elements.selectedDate.value = cycle.selectedDate;
    elements.selectedDateNote.textContent = `Записи на ${formatReadableDate(cycle.selectedDate)}`;
    elements.dayStatus.textContent = isFutureDate
      ? "Планирование"
      : cycle.selectedDate === today
        ? "Сегодня"
        : "Дневник";
    elements.dayStatus.classList.toggle("planning", isFutureDate);
    elements.previousDayButton.disabled = cycle.selectedDate <= cycle.startDate;
    elements.nextDayButton.disabled = cycle.selectedDate >= cycle.endDate;
    elements.todayButton.disabled = cycle.selectedDate === todayInCycle;
  }

  function renderTasks(cycle) {
    const tasksForDay = cycle.tasks.filter((task) => task.date === cycle.selectedDate);
    elements.emptyDayMessage.classList.toggle("hidden", tasksForDay.length > 0);

    TASK_CATEGORIES.forEach((category) => {
      const taskList = elements.taskLists[category];
      const tasks = tasksForDay.filter((task) => task.category === category);

      taskList.replaceChildren();

      if (tasksForDay.length === 0) {
        return;
      }

      if (tasks.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.className = "task-empty";
        emptyItem.textContent = "Пока пусто";
        taskList.append(emptyItem);
        return;
      }

      tasks.forEach((task) => {
        const taskItem = document.createElement("li");
        const toggleButton = document.createElement("button");
        const taskContent = document.createElement("div");
        const taskText = document.createElement("span");
        const taskActions = document.createElement("div");
        const editButton = document.createElement("button");
        const deleteButton = document.createElement("button");
        const isCompleted = task.status === "completed";

        taskItem.className = `task-item${isCompleted ? " completed" : ""}`;

        toggleButton.className = "task-toggle";
        toggleButton.type = "button";
        toggleButton.dataset.action = "toggle";
        toggleButton.dataset.taskId = task.id;
        toggleButton.setAttribute(
          "aria-label",
          isCompleted ? "Снять выполнение задачи" : "Отметить задачу выполненной"
        );
        toggleButton.textContent = isCompleted ? "✓" : "";

        taskText.className = "task-text";
        taskText.textContent = task.text;

        taskActions.className = "task-actions";
        editButton.className = "task-edit";
        editButton.type = "button";
        editButton.dataset.action = "edit";
        editButton.dataset.taskId = task.id;
        editButton.textContent = "Изменить";

        deleteButton.className = "task-delete";
        deleteButton.type = "button";
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.taskId = task.id;
        deleteButton.textContent = "Удалить";

        taskActions.append(editButton, deleteButton);
        taskContent.className = "task-content";
        taskContent.append(taskText, taskActions);

        if (task.history.length > 0) {
          const history = document.createElement("details");
          const historySummary = document.createElement("summary");
          const historyList = document.createElement("ul");

          history.className = "task-history";
          historySummary.textContent = `История формулировок (${task.history.length})`;
          task.history.forEach((entry) => {
            const item = document.createElement("li");
            const formerText = document.createElement("span");
            const formerDate = document.createElement("span");

            formerText.className = "task-history-text";
            formerText.textContent = entry.text;
            formerDate.className = "task-history-date";
            formerDate.textContent = `Дата: ${formatReadableDate(entry.date)}`;
            item.append(formerText, formerDate);
            historyList.append(item);
          });
          history.append(historySummary, historyList);
          taskContent.append(history);
        }

        taskItem.append(toggleButton, taskContent);
        taskList.append(taskItem);
      });
    });
  }

  function renderHabits(cycle) {
    const activeHabits = cycle.habits.filter((habit) => habit.isActive);
    const today = formatDateForInput(new Date());
    const isFutureDate = cycle.selectedDate > today;

    elements.habitsDateNote.textContent = isFutureDate
      ? "Будущие даты доступны только для просмотра."
      : `Отметки на ${formatReadableDate(cycle.selectedDate)}`;
    elements.habitsList.replaceChildren();

    if (activeHabits.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "habit-empty";
      emptyItem.textContent = "Добавьте до двух привычек";
      elements.habitsList.append(emptyItem);
      return;
    }

    activeHabits.forEach((habit) => {
      const item = document.createElement("li");
      const toggleButton = document.createElement("button");
      const habitName = document.createElement("span");
      const isChecked = habit.checks[cycle.selectedDate] === true;

      item.className = "habit-item";
      toggleButton.className = `habit-toggle${isChecked ? " checked" : ""}`;
      toggleButton.type = "button";
      toggleButton.dataset.habitId = habit.id;
      toggleButton.disabled = isFutureDate;
      toggleButton.setAttribute(
        "aria-label",
        isChecked ? "Снять отметку привычки" : "Отметить привычку"
      );
      habitName.className = "habit-name";
      habitName.textContent = habit.name;
      item.append(toggleButton, habitName);

      if (isFutureDate) {
        const note = document.createElement("span");
        note.className = "habit-future-note";
        note.textContent = "недоступно";
        item.append(note);
      }

      elements.habitsList.append(item);
    });
  }

  function calculateWeeklyScores(cycle, weekNumber, includeFullWeek = false) {
    const weekStart = addCalendarDays(cycle.startDate, (weekNumber - 1) * 7);
    const rawWeekEnd = addCalendarDays(weekStart, 6);
    const weekEnd = rawWeekEnd > cycle.endDate ? cycle.endDate : rawWeekEnd;
    const tasks = cycle.tasks.filter((task) => task.date >= weekStart && task.date <= weekEnd);
    const completedTasks = tasks.filter((task) => task.status === "completed").length;
    const activeHabits = cycle.habits.filter((habit) => habit.isActive);
    const today = formatDateForInput(new Date());
    const eligibleEnd = includeFullWeek || today > weekEnd ? weekEnd : today;
    const eligibleDays = eligibleEnd >= weekStart ? countDaysBetween(weekStart, eligibleEnd) : 0;
    const possibleHabitChecks = activeHabits.length * eligibleDays;
    const completedHabitChecks = activeHabits.reduce((total, habit) => {
      const completedForHabit = Object.keys(habit.checks).filter(
        (date) => date >= weekStart && date <= eligibleEnd
      ).length;

      return total + completedForHabit;
    }, 0);

    return {
      weekNumber,
      weekStart,
      weekEnd,
      tasksCount: tasks.length,
      completedTasks,
      taskScore: tasks.length === 0 ? null : Math.round((completedTasks / tasks.length) * 100),
      possibleHabitChecks,
      completedHabitChecks,
      habitScore:
        possibleHabitChecks === 0
          ? null
          : Math.round((completedHabitChecks / possibleHabitChecks) * 100)
    };
  }

  function renderWeeklyStats(cycle) {
    const { weekNumber } = calculateViewedWeek(cycle);
    const scores = calculateWeeklyScores(cycle, weekNumber);

    elements.statsWeekNumber.textContent = `${weekNumber}-я неделя`;
    elements.statsWeekRange.textContent =
      `${formatReadableDate(scores.weekStart)} - ${formatReadableDate(scores.weekEnd)}`;

    if (scores.taskScore === null) {
      elements.taskScore.textContent = "нет данных";
      elements.taskScoreNote.textContent = "На этой неделе нет задач.";
    } else {
      elements.taskScore.textContent = `${scores.taskScore}%`;
      elements.taskScoreNote.textContent =
        `Выполнено ${scores.completedTasks} из ${scores.tasksCount} задач.`;
    }

    if (scores.habitScore === null) {
      elements.habitScore.textContent = "нет данных";
      elements.habitScoreNote.textContent = "Нет доступных отметок привычек.";
    } else {
      elements.habitScore.textContent = `${scores.habitScore}%`;
      elements.habitScoreNote.textContent =
        `Выполнено ${scores.completedHabitChecks} из ${scores.possibleHabitChecks} возможных отметок.`;
    }
  }

  function renderWeeklyReflection(cycle) {
    const { weekNumber } = calculateViewedWeek(cycle);
    const reflection = cycle.weeklyReflections[String(weekNumber)] || {
      wins: "",
      lessons: ""
    };

    elements.reflectionWeekNumber.textContent = `${weekNumber}-я неделя`;
    elements.reflectionWins.value = reflection.wins;
    elements.reflectionLessons.value = reflection.lessons;
    elements.reflectionSaveStatus.textContent = "Сохраняется автоматически";
  }

  function renderSelectedDay(cycle) {
    renderWeekOverview(cycle);
    renderDayHeader(cycle);
    renderTasks(cycle);
    renderHabits(cycle);
    renderWeeklyStats(cycle);
    renderWeeklyReflection(cycle);
  }

  function renderDashboard(cycle) {
    const progress = calculateCycleProgress(cycle);

    elements.dashboardTitle.textContent = cycle.goal;
    elements.activeSuccessCriterion.textContent = cycle.successCriterion;
    elements.cycleEndDate.textContent = formatReadableDate(cycle.endDate);
    elements.currentDay.textContent = progress.dayNumber;
    elements.currentWeek.textContent = progress.weekNumber;
    elements.progressPercent.textContent = `${progress.percentage}%`;
    elements.progressFill.style.width = `${progress.percentage}%`;
    elements.progressBar.setAttribute("aria-valuenow", String(progress.percentage));
    elements.cycleDates.textContent =
      `${formatReadableDate(cycle.startDate)} - ${formatReadableDate(cycle.endDate)}`;
    elements.weeklyFocus.value = cycle.weeklyFocus;
    elements.focusSaveStatus.textContent = "Сохраняется автоматически";
    renderSelectedDay(cycle);
  }

  function calculateAverageScore(scores) {
    if (scores.length === 0) {
      return null;
    }

    return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length);
  }

  function renderCompletion(cycle) {
    const scoresByWeek = Array.from({ length: TOTAL_WEEKS }, (_, index) =>
      calculateWeeklyScores(cycle, index + 1, true)
    );
    const taskScores = scoresByWeek
      .map((scores) => scores.taskScore)
      .filter((score) => score !== null);
    const habitScores = scoresByWeek
      .map((scores) => scores.habitScore)
      .filter((score) => score !== null);
    const averageTaskScore = calculateAverageScore(taskScores);
    const averageHabitScore = calculateAverageScore(habitScores);

    elements.finalTaskScore.textContent =
      averageTaskScore === null ? "нет данных" : `${averageTaskScore}%`;
    elements.finalTaskScoreNote.textContent =
      averageTaskScore === null
        ? "Нет недель с задачами."
        : `Среднее по ${taskScores.length} нед. с задачами.`;
    elements.finalHabitScore.textContent =
      averageHabitScore === null ? "нет данных" : `${averageHabitScore}%`;
    elements.finalHabitScoreNote.textContent =
      averageHabitScore === null
        ? "Нет недель с привычками."
        : `Среднее по ${habitScores.length} нед. с отметками.`;
    elements.finalReflection.value = cycle.finalReflection;
    elements.finalReflectionSaveStatus.textContent = "Сохраняется автоматически";
  }

  function closeTaskChecklist() {
    pendingTask = null;
    elements.pendingTaskText.textContent = "";
    elements.taskChecklistModal.classList.add("hidden");
  }

  function closeTaskEditor() {
    editingTaskId = null;
    elements.taskEditForm.reset();
    elements.taskEditModal.classList.add("hidden");
  }

  function archiveActiveCycle() {
    const activeCycle = getActiveCycle();

    if (!activeCycle) {
      return;
    }

    activeCycle.status = "archived";
    activeCycle.archivedAt = new Date().toISOString();
    appData.activeCycleId = null;
    persistData(appData);
    elements.form.reset();
    elements.cycleStartDate.value = formatDateForInput(new Date());
    render();
  }

  function exportData() {
    const exportContent = JSON.stringify(appData, null, 2);
    const blob = new Blob([exportContent], { type: "application/json" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateSuffix = formatDateForInput(new Date());

    link.href = downloadUrl;
    link.download = `twelve-week-planner-${dateSuffix}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  }

  async function importData(file) {
    let candidate;

    try {
      candidate = JSON.parse(await file.text());
    } catch (error) {
      window.alert("Файл не содержит корректный JSON.");
      return;
    }

    if (!candidate || typeof candidate !== "object" || !Array.isArray(candidate.cycles)) {
      window.alert("В файле отсутствует массив cycles.");
      return;
    }

    const normalizedData = normalizeData(candidate);

    if (normalizedData.cycles.length !== candidate.cycles.length) {
      window.alert("Файл содержит некорректные данные цикла.");
      return;
    }

    if (!window.confirm("Импорт заменит текущие данные планера. Продолжить?")) {
      return;
    }

    appData = normalizedData;
    persistData(appData);
    closeTaskChecklist();
    closeTaskEditor();
    render();
  }

  function render() {
    const activeCycle = getActiveCycle();
    renderStoragePreview();

    if (appData.activeCycleId && activeCycle) {
      if (calculateCycleProgress(activeCycle).isFinished) {
        renderCompletion(activeCycle);
        showScreen("completion");
        return;
      }

      renderDashboard(activeCycle);
      showScreen("dashboard");
      return;
    }

    showScreen("onboarding");
  }

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();

    const startDate = elements.cycleStartDate.value;
    const goal = elements.cycleGoal.value.trim();
    const successCriterion = elements.successCriterion.value.trim();

    if (!isDateInputValue(startDate) || !goal || !successCriterion) {
      return;
    }

    const cycle = {
      id: createCycleId(),
      status: "active",
      goal,
      successCriterion,
      startDate,
      endDate: addCalendarDays(startDate, TOTAL_DAYS - 1),
      weeklyFocus: "",
      selectedDate: clampDateToCycle(
        formatDateForInput(new Date()),
        startDate,
        addCalendarDays(startDate, TOTAL_DAYS - 1)
      ),
      tasks: [],
      habits: [],
      weeklyReflections: {},
      finalReflection: "",
      archivedAt: null,
      createdAt: new Date().toISOString()
    };

    appData = {
      ...appData,
      activeCycleId: cycle.id,
      cycles: [cycle, ...appData.cycles]
    };

    persistData(appData);
    render();
  });

  elements.weeklyFocus.addEventListener("input", () => {
    const activeCycle = getActiveCycle();

    if (!activeCycle) {
      return;
    }

    activeCycle.weeklyFocus = elements.weeklyFocus.value;
    persistData(appData);
    renderStoragePreview();
    elements.focusSaveStatus.textContent = "Сохранено";
  });

  elements.weeklyReflectionForm.addEventListener("input", () => {
    const activeCycle = getActiveCycle();

    if (!activeCycle) {
      return;
    }

    const { weekNumber } = calculateViewedWeek(activeCycle);
    activeCycle.weeklyReflections[String(weekNumber)] = {
      wins: elements.reflectionWins.value,
      lessons: elements.reflectionLessons.value
    };
    persistData(appData);
    renderStoragePreview();
    elements.reflectionSaveStatus.textContent = "Сохранено";
  });

  elements.selectedDate.addEventListener("change", () => {
    const activeCycle = getActiveCycle();

    if (!activeCycle) {
      return;
    }

    activeCycle.selectedDate = clampDateToCycle(
      elements.selectedDate.value,
      activeCycle.startDate,
      activeCycle.endDate
    );
    persistData(appData);
    renderSelectedDay(activeCycle);
    renderStoragePreview();
  });

  elements.previousDayButton.addEventListener("click", () => {
    const activeCycle = getActiveCycle();

    if (!activeCycle || activeCycle.selectedDate <= activeCycle.startDate) {
      return;
    }

    activeCycle.selectedDate = addCalendarDays(activeCycle.selectedDate, -1);
    persistData(appData);
    renderSelectedDay(activeCycle);
    renderStoragePreview();
  });

  elements.nextDayButton.addEventListener("click", () => {
    const activeCycle = getActiveCycle();

    if (!activeCycle || activeCycle.selectedDate >= activeCycle.endDate) {
      return;
    }

    activeCycle.selectedDate = addCalendarDays(activeCycle.selectedDate, 1);
    persistData(appData);
    renderSelectedDay(activeCycle);
    renderStoragePreview();
  });

  elements.todayButton.addEventListener("click", () => {
    const activeCycle = getActiveCycle();

    if (!activeCycle) {
      return;
    }

    activeCycle.selectedDate = getCycleDateForToday(activeCycle);
    persistData(appData);
    renderSelectedDay(activeCycle);
    renderStoragePreview();
  });

  elements.previousWeekButton.addEventListener("click", () => {
    const activeCycle = getActiveCycle();
    const { weekNumber } = activeCycle ? calculateViewedWeek(activeCycle) : { weekNumber: 1 };

    if (!activeCycle || weekNumber <= 1) {
      return;
    }

    activeCycle.selectedDate = addCalendarDays(activeCycle.selectedDate, -7);
    persistData(appData);
    renderSelectedDay(activeCycle);
    renderStoragePreview();
  });

  elements.nextWeekButton.addEventListener("click", () => {
    const activeCycle = getActiveCycle();
    const { weekNumber } = activeCycle ? calculateViewedWeek(activeCycle) : { weekNumber: TOTAL_WEEKS };

    if (!activeCycle || weekNumber >= TOTAL_WEEKS) {
      return;
    }

    activeCycle.selectedDate = addCalendarDays(activeCycle.selectedDate, 7);
    persistData(appData);
    renderSelectedDay(activeCycle);
    renderStoragePreview();
  });

  elements.weekDays.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-date]");
    const activeCycle = getActiveCycle();

    if (!button || !activeCycle) {
      return;
    }

    activeCycle.selectedDate = clampDateToCycle(
      button.dataset.date,
      activeCycle.startDate,
      activeCycle.endDate
    );
    persistData(appData);
    renderSelectedDay(activeCycle);
    renderStoragePreview();
  });

  elements.taskForms.forEach((taskForm) => {
    taskForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const activeCycle = getActiveCycle();
      const input = taskForm.elements.taskText;
      const text = input.value.trim();
      const category = taskForm.dataset.category;

      if (!activeCycle || !text || !TASK_CATEGORIES.includes(category)) {
        return;
      }

      pendingTask = {
        text,
        category,
        date: activeCycle.selectedDate,
        input
      };
      elements.pendingTaskText.textContent = text;
      elements.taskChecklistModal.classList.remove("hidden");
      elements.saveTaskButton.focus();
    });
  });

  elements.cancelTaskButton.addEventListener("click", () => {
    closeTaskChecklist();
  });

  elements.saveTaskButton.addEventListener("click", () => {
    const activeCycle = getActiveCycle();

    if (!activeCycle || !pendingTask) {
      closeTaskChecklist();
      return;
    }

    const task = {
      id: createTaskId(),
      text: pendingTask.text,
      category: pendingTask.category,
      date: pendingTask.date,
      status: "active",
      history: [],
      createdAt: new Date().toISOString()
    };

    activeCycle.tasks.push(task);
    pendingTask.input.value = "";
    persistData(appData);
    closeTaskChecklist();
    renderSelectedDay(activeCycle);
    renderStoragePreview();
  });

  elements.taskColumns.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    const activeCycle = getActiveCycle();

    if (!button || !activeCycle) {
      return;
    }

    const task = activeCycle.tasks.find(
      (item) => item.id === button.dataset.taskId && item.date === activeCycle.selectedDate
    );

    if (!task) {
      return;
    }

    if (button.dataset.action === "toggle") {
      task.status = task.status === "completed" ? "active" : "completed";
    }

    if (button.dataset.action === "edit") {
      editingTaskId = task.id;
      elements.editedTaskText.value = task.text;
      elements.editedTaskDate.min = activeCycle.startDate;
      elements.editedTaskDate.max = activeCycle.endDate;
      elements.editedTaskDate.value = task.date;
      elements.taskEditModal.classList.remove("hidden");
      elements.editedTaskText.focus();
      return;
    }

    if (button.dataset.action === "delete") {
      const shouldDelete = window.confirm("Удалить эту задачу?");

      if (!shouldDelete) {
        return;
      }

      activeCycle.tasks = activeCycle.tasks.filter((item) => item.id !== task.id);
    }

    persistData(appData);
    renderSelectedDay(activeCycle);
    renderStoragePreview();
  });

  elements.cancelTaskEditButton.addEventListener("click", () => {
    closeTaskEditor();
  });

  elements.taskEditForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const activeCycle = getActiveCycle();
    const task = activeCycle?.tasks.find((item) => item.id === editingTaskId);
    const text = elements.editedTaskText.value.trim();
    const date = elements.editedTaskDate.value;

    if (!activeCycle || !task || !text || !isDateInputValue(date)) {
      return;
    }

    const nextDate = clampDateToCycle(date, activeCycle.startDate, activeCycle.endDate);

    if (text !== task.text) {
      task.history.push({
        text: task.text,
        date: task.date,
        changedAt: new Date().toISOString()
      });
    }

    if (text !== task.text || nextDate !== task.date) {
      task.text = text;
      task.date = nextDate;
      persistData(appData);
    }

    closeTaskEditor();
    renderSelectedDay(activeCycle);
    renderStoragePreview();
  });

  elements.habitForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const activeCycle = getActiveCycle();
    const name = elements.habitName.value.trim();

    if (!activeCycle || !name) {
      return;
    }

    if (activeCycle.habits.filter((habit) => habit.isActive).length >= 2) {
      window.alert("Можно вести не более двух активных привычек.");
      return;
    }

    activeCycle.habits.push({
      id: createHabitId(),
      name,
      isActive: true,
      checks: {},
      createdAt: new Date().toISOString()
    });
    elements.habitForm.reset();
    persistData(appData);
    renderSelectedDay(activeCycle);
    renderStoragePreview();
  });

  elements.habitsList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-habit-id]");
    const activeCycle = getActiveCycle();
    const today = formatDateForInput(new Date());

    if (!button || !activeCycle || activeCycle.selectedDate > today) {
      return;
    }

    const habit = activeCycle.habits.find(
      (item) => item.id === button.dataset.habitId && item.isActive
    );

    if (!habit) {
      return;
    }

    if (habit.checks[activeCycle.selectedDate]) {
      delete habit.checks[activeCycle.selectedDate];
    } else {
      habit.checks[activeCycle.selectedDate] = true;
    }

    persistData(appData);
    renderSelectedDay(activeCycle);
    renderStoragePreview();
  });

  elements.finalReflection.addEventListener("input", () => {
    const activeCycle = getActiveCycle();

    if (!activeCycle) {
      return;
    }

    activeCycle.finalReflection = elements.finalReflection.value;
    persistData(appData);
    renderStoragePreview();
    elements.finalReflectionSaveStatus.textContent = "Сохранено";
  });

  elements.exportButton.addEventListener("click", () => {
    exportData();
  });

  elements.importButton.addEventListener("click", () => {
    elements.importFile.click();
  });

  elements.importFile.addEventListener("change", async () => {
    const [file] = elements.importFile.files;

    if (file) {
      await importData(file);
    }

    elements.importFile.value = "";
  });

  elements.finishCycleButton.addEventListener("click", () => {
    if (window.confirm("Завершить и архивировать текущий цикл?")) {
      closeTaskChecklist();
      closeTaskEditor();
      archiveActiveCycle();
    }
  });

  elements.archiveCycleButton.addEventListener("click", () => {
    archiveActiveCycle();
  });

  elements.startNewCycleButton.addEventListener("click", () => {
    archiveActiveCycle();
    elements.cycleGoal.focus();
  });

  elements.cycleStartDate.value = formatDateForInput(new Date());
  render();
})();
