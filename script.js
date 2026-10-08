const STORAGE_KEY = "taskly_tasks_v1";
const THEME_KEY = "taskly_theme_v1";

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const priorityInput = document.getElementById("priority");
const tasksEl = document.getElementById("tasks");
const emptyState = document.getElementById("emptyState");
const clearCompleted = document.getElementById("clearCompleted");
const themeToggle = document.getElementById("themeToggle");

let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let currentFilter = "all";

const priorityNames = { high: "مهمة", normal: "عادية", low: "منخفضة" };

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function relativeDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString("ar-EG", { day:"numeric", month:"short" });
}

function render() {
  const filtered = tasks.filter(task => {
    if (currentFilter === "active") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
  });

  tasksEl.innerHTML = filtered.map(task => `
    <article class="task ${task.completed ? "done" : ""}" data-id="${task.id}">
      <button class="check" aria-label="${task.completed ? "إلغاء الإنجاز" : "إنجاز المهمة"}"></button>
      <div class="task-content">
        <p class="task-title">${escapeHTML(task.title)}</p>
        <div class="task-meta">
          <span class="priority ${task.priority}">${priorityNames[task.priority]}</span>
          <span>•</span>
          <span>${relativeDate(task.createdAt)}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-btn edit" aria-label="تعديل">✎</button>
        <button class="icon-btn delete" aria-label="حذف">×</button>
      </div>
    </article>
  `).join("");

  emptyState.hidden = filtered.length !== 0;
  updateStats();
}

function updateStats() {
  const all = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const active = all - completed;

  document.getElementById("allCount").textContent = all;
  document.getElementById("activeCount").textContent = active;
  document.getElementById("completedCount").textContent = completed;
  document.getElementById("statAll").textContent = all;
  document.getElementById("statActive").textContent = active;
  document.getElementById("statCompleted").textContent = completed;

  document.getElementById("sectionHint").textContent =
    currentFilter === "all" ? "كل مهامك في مكان واحد" :
    currentFilter === "active" ? "المهام التي تحتاج لإنجازها" : "المهام التي أنجزتها";
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll("[data-filter]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  render();
}

taskForm.addEventListener("submit", e => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;

  tasks.unshift({
    id: Date.now().toString(),
    title,
    priority: priorityInput.value,
    completed: false,
    createdAt: Date.now()
  });

  save();
  taskInput.value = "";
  priorityInput.value = "normal";
  taskInput.focus();
  setFilter("all");
});

tasksEl.addEventListener("click", e => {
  const item = e.target.closest(".task");
  if (!item) return;
  const id = item.dataset.id;
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  if (e.target.closest(".check")) {
    task.completed = !task.completed;
  } else if (e.target.closest(".delete")) {
    tasks = tasks.filter(t => t.id !== id);
  } else if (e.target.closest(".edit")) {
    const updated = prompt("عدّل اسم المهمة:", task.title);
    if (updated !== null && updated.trim()) task.title = updated.trim();
  } else {
    return;
  }

  save();
  render();
});

document.querySelectorAll("[data-filter]").forEach(btn => {
  btn.addEventListener("click", () => setFilter(btn.dataset.filter));
});

clearCompleted.addEventListener("click", () => {
  if (!tasks.some(t => t.completed)) return;
  tasks = tasks.filter(t => !t.completed);
  save();
  render();
});

function setTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  themeToggle.textContent = theme === "dark" ? "☀" : "☾";
  localStorage.setItem(THEME_KEY, theme);
}

themeToggle.addEventListener("click", () => {
  setTheme(document.body.classList.contains("dark") ? "light" : "dark");
});

const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme) setTheme(savedTheme);

document.getElementById("today").textContent =
  new Date().toLocaleDateString("ar-EG", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

render();


// Pomodoro Timer
let pomoSeconds=25*60,pomoInterval=null,pomoRunning=false;
const timerEl=document.getElementById("timer"),startBtn=document.getElementById("timerStart"),resetBtn=document.getElementById("timerReset"),modeButtons=document.querySelectorAll(".pomo-mode");
function updateTimer(){const m=Math.floor(pomoSeconds/60).toString().padStart(2,"0"),s=(pomoSeconds%60).toString().padStart(2,"0");timerEl.textContent=`${m}:${s}`}
function setPomodoro(minutes){clearInterval(pomoInterval);pomoRunning=false;pomoSeconds=minutes*60;startBtn.textContent="ابدأ";updateTimer()}
startBtn.addEventListener("click",()=>{if(pomoRunning){clearInterval(pomoInterval);pomoRunning=false;startBtn.textContent="استمرار";return}pomoRunning=true;startBtn.textContent="إيقاف مؤقت";pomoInterval=setInterval(()=>{if(pomoSeconds<=0){clearInterval(pomoInterval);pomoRunning=false;startBtn.textContent="ابدأ";alert("أحسنت! انتهى الوقت 🎉");return}pomoSeconds--;updateTimer()},1000)});
resetBtn.addEventListener("click",()=>setPomodoro(Number(document.querySelector(".pomo-mode.active").dataset.minutes)));
modeButtons.forEach(btn=>btn.addEventListener("click",()=>{modeButtons.forEach(b=>b.classList.remove("active"));btn.classList.add("active");setPomodoro(Number(btn.dataset.minutes))}));
