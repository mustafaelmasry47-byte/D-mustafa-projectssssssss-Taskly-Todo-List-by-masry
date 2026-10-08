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


// Pomodoro Timer — uses a real end timestamp so it keeps counting accurately
// even when the tab is in the background. If the browser/page is fully closed,
// browsers do not allow ordinary page JavaScript to keep running.
const POMO_KEY = "taskly_pomodoro_v3";
let pomoSeconds = 25 * 60, pomoInterval = null, pomoRunning = false, pomoEndAt = null;
let pomoModeMinutes = 25;
let audioContext = null;

const timerEl = document.getElementById("timer");
const startBtn = document.getElementById("timerStart");
const resetBtn = document.getElementById("timerReset");
const modeButtons = document.querySelectorAll(".pomo-mode");
const celebration = document.getElementById("celebration");
const alarmStatus = document.getElementById("alarmStatus");
const timerCircle = document.querySelector(".timer-circle");

function updateTimer(){
  const safe = Math.max(0, Math.floor(pomoSeconds));
  const m = Math.floor(safe / 60).toString().padStart(2,"0");
  const sec = (safe % 60).toString().padStart(2,"0");
  timerEl.textContent = `${m}:${sec}`;
}

function savePomo(){
  localStorage.setItem(POMO_KEY, JSON.stringify({
    seconds:pomoSeconds, running:pomoRunning, endAt:pomoEndAt, minutes:pomoModeMinutes
  }));
}

function loadPomo(){
  try{
    const data=JSON.parse(localStorage.getItem(POMO_KEY)||"null");
    if(!data) return;
    pomoModeMinutes=Number(data.minutes)||25;
    pomoSeconds=Math.max(0,Number(data.seconds)||pomoModeMinutes*60);
    pomoEndAt=data.endAt?Number(data.endAt):null;
    modeButtons.forEach(b=>b.classList.toggle("active",Number(b.dataset.minutes)===pomoModeMinutes));
    if(data.running && pomoEndAt){
      pomoRunning=true;
      syncTimer(true);
      startTicker();
    }
  }catch(e){ localStorage.removeItem(POMO_KEY); }
  updateTimer();
}

function startTicker(){
  clearInterval(pomoInterval);
  pomoInterval=setInterval(()=>syncTimer(false),250);
}

function syncTimer(silent){
  if(!pomoRunning || !pomoEndAt) return;
  pomoSeconds=Math.max(0,Math.ceil((pomoEndAt-Date.now())/1000));
  updateTimer();
  if(pomoSeconds<=0) finishPomodoro(silent);
}

function setPomodoro(minutes){
  clearInterval(pomoInterval);
  pomoRunning=false;
  pomoEndAt=null;
  pomoModeMinutes=Number(minutes)||25;
  pomoSeconds=pomoModeMinutes*60;
  startBtn.textContent="ابدأ";
  timerCircle.classList.remove("finished");
  updateTimer();
  savePomo();
}

function ensureAudio(){
  if(!audioContext) audioContext=new (window.AudioContext||window.webkitAudioContext)();
  if(audioContext.state==="suspended") audioContext.resume();
}

function playAlarm(){
  try{
    ensureAudio();
    const now=audioContext.currentTime;
    [0,0.35,0.7,1.05].forEach((offset,i)=>{
      const osc=audioContext.createOscillator();
      const gain=audioContext.createGain();
      osc.type="sine"; osc.frequency.value=i%2?880:660;
      gain.gain.setValueAtTime(0.0001,now+offset);
      gain.gain.exponentialRampToValueAtTime(0.22,now+offset+0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001,now+offset+0.28);
      osc.connect(gain).connect(audioContext.destination);
      osc.start(now+offset); osc.stop(now+offset+0.3);
    });
  }catch(e){ /* Browser may block audio until a user gesture. */ }
}

function showStatus(message){
  alarmStatus.textContent=message;
  alarmStatus.classList.add("show");
  setTimeout(()=>alarmStatus.classList.remove("show"),3500);
}

function notifyFinish(){
  if("Notification" in window && Notification.permission==="granted"){
    new Notification("Taskly 🍅",{body:"انتهى وقت التركيز! خُد استراحة قصيرة.",tag:"taskly-pomodoro"});
  }
}

function finishPomodoro(){
  clearInterval(pomoInterval);
  pomoRunning=false;
  pomoEndAt=null;
  pomoSeconds=0;
  startBtn.textContent="ابدأ";
  updateTimer();
  timerCircle.classList.add("finished");
  playAlarm();
  notifyFinish();
  showStatus("⏰ انتهى الوقت — خُد استراحة صغيرة!");
  setTimeout(()=>timerCircle.classList.remove("finished"),3000);
  savePomo();
}

startBtn.addEventListener("click",()=>{
  ensureAudio();
  if(pomoRunning){
    syncTimer(false);
    if(!pomoRunning) return;
    pomoSeconds=Math.max(0,Math.ceil((pomoEndAt-Date.now())/1000));
    pomoRunning=false;
    pomoEndAt=null;
    clearInterval(pomoInterval);
    startBtn.textContent="استمرار";
    savePomo();
    return;
  }
  if(pomoSeconds<=0) pomoSeconds=pomoModeMinutes*60;
  pomoEndAt=Date.now()+pomoSeconds*1000;
  pomoRunning=true;
  startBtn.textContent="إيقاف مؤقت";
  startTicker();
  savePomo();
});

resetBtn.addEventListener("click",()=>setPomodoro(pomoModeMinutes));
modeButtons.forEach(btn=>btn.addEventListener("click",()=>{
  modeButtons.forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  setPomodoro(Number(btn.dataset.minutes));
}));

// Ask once for notifications after the user has interacted with the timer.
if("Notification" in window && Notification.permission==="default"){
  // Permission is intentionally requested only after clicking Start.
  const oldStart=startBtn.onclick;
  startBtn.addEventListener("click",()=>{
    if(Notification.permission==="default") Notification.requestPermission().catch(()=>{});
  },{once:true});
}

// If the tab was hidden, sync from Date.now() when the user returns.
document.addEventListener("visibilitychange",()=>{
  if(!document.hidden && pomoRunning) syncTimer(false);
});
window.addEventListener("pageshow",()=>{ if(pomoRunning) syncTimer(false); });

// Celebration when a task is completed.
function celebrate(){
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduced) return;
  const pieces=Array.from({length:55},()=>{
    const el=document.createElement("i");
    el.className="confetti-piece";
    el.style.left=(Math.random()*100)+"%";
    el.style.setProperty("--drift",((Math.random()-.5)*220)+"px");
    el.style.background=["#6c5ce7","#20b486","#f3a847","#e15d6b","#4aa3df"][Math.floor(Math.random()*5)];
    el.style.animationDelay=(Math.random()*.35)+"s";
    el.style.transform=`rotate(${Math.random()*180}deg)`;
    celebration.appendChild(el);
    setTimeout(()=>el.remove(),2300);
    return el;
  });
}

// Extend the existing task click behavior with celebration without changing the task logic.
const originalTaskClick = tasksEl.onclick;
// Capture completion at the event level before the existing delegated handler changes it.
tasksEl.addEventListener("click",(e)=>{
  if(!e.target.closest(".check")) return;
  const item=e.target.closest(".task");
  if(!item) return;
  const id=item.dataset.id;
  const task=tasks.find(t=>t.id===id);
  if(task && !task.completed) setTimeout(celebrate,40);
});

loadPomo();
