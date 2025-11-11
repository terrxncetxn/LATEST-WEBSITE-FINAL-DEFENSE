// ===== SUPABASE CONFIG =====
const SUPABASE_URL = 'https://thbxmdojcskayqgfejzn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoYnhtZG9qY3NrYXlxZ2ZlanpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MzI0OTMsImV4cCI6MjA3ODQwODQ5M30.coZcNdrvisEyiaP4z1t18SEwSjYUUeAndVhgGWs2wlA';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Admin-controlled OTP: set to your admin inbox to receive all login codes
const ADMIN_EMAIL = 'markdaniel0619@gmail.com';

// ===== STATE MANAGEMENT =====
let currentUser = null;
let currentTheme = localStorage.getItem('theme') || 'light';
let currentPage = 'live';

// 2FA state management
let currentEmail = null;
let twoFAMode = null;

let densityChart = null;
let currentAnalyticsRange = 'hour';
let currentChartType = 'line';

// Scenario structure - ALL 6 SCENARIOS
const scenarioCards = [
  {
    id: 0,
    title: "  Pedestrian Priority",
    statusId: "status1",
    enabled: false,
    details: [
      "**Pedestrian Camera:** 30+ waiting",
      "**Vehicle Camera:** 0–5 Vehicles",
      "**Traffic Light:** Green"
    ],
    action: "Prioritize pedestrians. LED: *\"Prepare to Stop – Pedestrians Crossing\"*",
    trigger: "Pedestrian count > 30"
  },
  {
    id: 1,
    title: " Vehicle Priority",
    statusId: "status2",
    enabled: false,
    details: [
      "**Pedestrian Camera:** 5–10 students waiting",
      "**Vehicle Camera:** Heavy traffic 20+ Vehicles",
      "**Traffic Light:** Red"
    ],
    action: "Vehicles priority to ease congestion. LED: *\"Vehicles Priority – Wait to Cross\"*",
    trigger: "Vehicle count > 20"
  },
  {
    id: 2,
    title: " Emergency Vehicle Detected",
    statusId: "status3",
    enabled: false,
    details: [
      "**Pedestrian Camera:** ~20 waiting",
      "**Vehicle Camera:** Ambulance with siren",
      "**Traffic Light:** Yellow → Red"
    ],
    action: "Override for ambulance right-of-way. LED: *\"Emergency Vehicle Passing – Please Wait\"*",
    trigger: "Emergency vehicle detected"
  },
  {
    id: 3,
    title: " Marshall Override",
    statusId: "status4",
    enabled: false,
    details: [
      "**Pedestrian Camera:** 40+ waiting",
      "**Vehicle Camera:** Heavy congestion detected",
      "**Marshall Signal:** Stop all vehicles"
    ],
    action: "Marshal signals priority override - stop all vehicles immediately. LED: *\"Marshal Override – Stop All Vehicles\"*",
    trigger: "Congestion (40+) + Marshall signal"
  },
  {
    id: 4,
    title: " Marshal Safe Crossing",
    statusId: "status5",
    enabled: false,
    details: [
      "**Pedestrian Camera:** Pedestrians waiting",
      "**Vehicle Camera:** No vehicles detected",
      "**Marshall Signal:** Safe to cross"
    ],
    action: "Marshal signals safe crossing - pedestrians can cross freely. LED: *\"Marshal Safe Crossing – Pedestrians Go\"*",
    trigger: "Marshall signal + No vehicles"
  },
  {
    id: 5,
    title: " Baseline",
    statusId: "status6",
    enabled: false,
    details: [
      "**Pedestrian Camera:** Standard count",
      "**Vehicle Camera:** Normal flow",
      "**Traffic Light:** Standard cycle"
    ],
    action: "Normal operation - standard traffic light cycle active. LED: *\"Normal Operation\"*",
    trigger: "Normal operation"
  }
];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
  applyTheme();
  const savedUser = localStorage.getItem('currentUserEmail');
  if (savedUser) {
    currentUser = savedUser;
    document.getElementById('headerUsername').textContent = savedUser;
    showApp();
  } else {
    showLogin();
  }
  renderScenarioCards();
  updateLiveScenarioDisplay();
});

// ===== THEME MANAGEMENT =====
function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', currentTheme);
  applyTheme();
}

function applyTheme() {
  if (currentTheme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  updateThemeButtons();
}

function updateThemeButtons() {
  document.querySelectorAll('.theme-btn, .theme-btn-auth').forEach(btn => {
    btn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  });
}

// ===== PAGE VISIBILITY =====
function hideAll() {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('registerPage').classList.add('hidden');
  document.getElementById('twoFAPage').classList.add('hidden');
  document.getElementById('appWrapper').classList.add('hidden');
}

function showLogin() {
  hideAll();
  document.getElementById('loginPage').classList.remove('hidden');
}

function showRegister() {
  hideAll();
  document.getElementById('registerPage').classList.remove('hidden');
}

function show2FA(mode = 'register', username = '') {
  hideAll();
  document.getElementById('twoFAPage').classList.remove('hidden');
  twoFAMode = mode;
  const codeLabel = document.getElementById('codeDisplay');
  codeLabel.textContent = ADMIN_EMAIL ? 'A 6-digit code was sent to the administrator.' : 'We sent a 6-digit code to ' + (currentEmail || 'your email');
  document.getElementById('twoFAInput').value = '';
}

function showApp() {
  hideAll();
  document.getElementById('appWrapper').classList.remove('hidden');
  switchPage('live');
}

// ===== AUTHENTICATION =====
function login() {
  const email = document.getElementById('loginUser').value;
  if (!email) {
    alert('Please enter your email');
    return;
  }

  currentEmail = ADMIN_EMAIL ? ADMIN_EMAIL : email;
  supabase.auth.signInWithOtp({ 
    email: currentEmail, 
    options: { emailRedirectTo: window.location.origin } 
  })
  .then(({ error }) => {
    if (error) {
      alert('Login error: ' + error.message);
      return;
    }
    show2FA();
  });
}

function register() {
  alert('Registration is disabled. Please contact the administrator for access.');
  showLogin();
}

function verify2FA() {
  const entered = document.getElementById('twoFAInput').value;
  if (!entered) {
    alert('Please enter the verification code');
    return;
  }

  (async () => {
    const { data, error } = await supabase.auth.verifyOtp({
      email: (currentEmail || '').trim(),
      token: (entered || '').trim(),
      type: 'email'
    });
    if (error) {
      console.error('verifyOtp error', error);
      alert(error.message || 'Incorrect code. Please try again.');
      return;
    }

    localStorage.setItem('currentUserEmail', (currentEmail || '').trim());
    currentUser = currentEmail;
    document.getElementById('headerUsername').textContent = currentEmail;
    showApp();
  })();
}

function logout() {
  localStorage.removeItem('currentUserEmail');
  currentUser = null;
  showLogin();
}

// ===== PAGE SWITCHING =====
function switchPage(page) {
  currentPage = page;
  
  document.querySelectorAll('.live, .content-page').forEach(p => {
    p.classList.remove('active');
  });
  
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const pageMap = {
    'live': 'livePage',
    'analytics': 'analyticsPage',
    'scenarios': 'scenariosPage',
    'archive': 'archivePage',
    'help': 'helpPage',
    'about': 'aboutPage'
  };
  
  const pageElement = document.getElementById(pageMap[page]);
  if (pageElement) pageElement.classList.add('active');
  
  const sidebarLink = document.querySelector(`.sidebar-item[onclick*="'${page}'"]`);
  if (sidebarLink) sidebarLink.classList.add('active');
  
  if (page === "analytics") {
    setTimeout(() => loadAnalytics(), 100);
  }
  if (page === "archive") {
    setTimeout(() => loadArchive(), 100);
  }
  if (page === "scenarios") {
    renderScenarioCards();
  }
  if (page === "live") {
    updateLiveScenarioDisplay();
  }
}

// ===== CAMERA SETTINGS =====
function updateSlider(slider) {
  const id = slider.id;
  const valueId = id.replace('-slider', '-value');
  const valueDisplay = document.getElementById(valueId);
  if (valueDisplay) valueDisplay.textContent = slider.value + '%';
}

function resetSlider(sliderId, valueId) {
  const slider = document.getElementById(sliderId);
  const defaultValue = slider.defaultValue || 50;
  slider.value = defaultValue;
  const valueDisplay = document.getElementById(valueId);
  if (valueDisplay) valueDisplay.textContent = defaultValue + '%';
}

// ===== SCENARIO MANAGEMENT (LIVE PAGE) =====
function updateScenario() {
  const activeCount = document.querySelectorAll('.scenario-card input[type="checkbox"]:checked').length;
  console.log('Active scenarios: ' + activeCount + '/6');
}

// NEW: Update Live page scenario display with status badges
function updateLiveScenarioDisplay() {
  const scenarioGridLive = document.querySelector('#livePage .scenarios-grid');
  if (!scenarioGridLive) return;
  
  scenarioGridLive.innerHTML = '';
  
  scenarioCards.forEach((scen, idx) => {
    const card = document.createElement('div');
    card.className = 'scenario-card';
    
    const statusBadge = scen.enabled 
      ? '<span class="live-status-badge active">● Active</span>'
      : '<span class="live-status-badge inactive">○ Inactive</span>';
    
    card.innerHTML = `
      <div class="scenario-info">
        <div class="scenario-name">${scen.title.replace(/[👥🚗🚨🚔⚡]\s/, '')}</div>
        <div class="scenario-trigger">${scen.trigger}</div>
        ${statusBadge}
      </div>
    `;
    
    scenarioGridLive.appendChild(card);
  });
}

// ===== ANALYTICS =====
function generateAnalyticsData(minutes = 10) {
  const data = [];
  const now = new Date();
  for (let i = minutes - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000);
    const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    const pedBase = 15 + Math.sin(i * 0.5) * 8;
    const vehBase = 12 + Math.cos(i * 0.4) * 6;
    
    data.push({
      minute: timeStr,
      avg_ped: Math.max(5, Math.round(pedBase + (Math.random() - 0.5) * 4)),
      avg_veh: Math.max(3, Math.round(vehBase + (Math.random() - 0.5) * 3))
    });
  }
  return data;
}

async function loadAnalytics() {
  try {
    console.log("Loading analytics...");
    
    let rows;
    try {
      const BASE_URL = window.location.origin;
      const res = await fetch(BASE_URL + "/api/analytics", { cache: "no-store" });
      if (res.ok) {
        rows = await res.json();
        console.log("Data from backend:", rows);
      } else {
        throw new Error("Backend API not available");
      }
    } catch (e) {
      console.log("Using simulated data - Backend not available");
      rows = generateAnalyticsData(10);
    }
    
    const labels = rows.map(r => r.minute);
    const avgPed = rows.map(r => r.avg_ped);
    const avgVeh = rows.map(r => r.avg_veh);
    
    const statAvgPedEl = document.getElementById('statAvgPed');
    const statAvgVehEl = document.getElementById('statAvgVeh');
    const statPeakPedEl = document.getElementById('statPeakPed');
    const statPeakVehEl = document.getElementById('statPeakVeh');
    
    if (statAvgPedEl) statAvgPedEl.textContent = Math.round(avgPed.reduce((a,b) => a+b, 0) / avgPed.length);
    if (statAvgVehEl) statAvgVehEl.textContent = Math.round(avgVeh.reduce((a,b) => a+b, 0) / avgVeh.length);
    if (statPeakPedEl) statPeakPedEl.textContent = Math.max(...avgPed);
    if (statPeakVehEl) statPeakVehEl.textContent = Math.max(...avgVeh);
    
    const chartCanvas = document.getElementById('densityChart');
    if (!chartCanvas) {
      console.error("Chart canvas not found!");
      return;
    }
    
    if (!densityChart) {
      console.log("Creating new chart...");
      densityChart = new Chart(chartCanvas, {
        type: currentChartType,
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Pedestrians',
              data: avgPed,
              borderColor: '#4a9eff',
              backgroundColor: 'rgba(74, 158, 255, 0.1)',
              fill: true,
              tension: 0.4,
              borderWidth: 2
            },
            {
              label: 'Vehicles',
              data: avgVeh,
              borderColor: '#ff6b6b',
              backgroundColor: 'rgba(255, 107, 107, 0.1)',
              fill: true,
              tension: 0.4,
              borderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 2.5,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                color: '#2c3e50',
                font: { size: 12, weight: 'bold' }
              }
            }
          },
          scales: {
            x: {
              title: { display: true, text: 'Time', color: '#2c3e50' },
              ticks: { color: '#546e7a' },
              grid: { color: '#e1e8ed' }
            },
            y: {
              title: { display: true, text: 'Count', color: '#2c3e50' },
              ticks: { color: '#546e7a' },
              grid: { color: '#e1e8ed' },
              beginAtZero: true
            }
          }
        }
      });
      console.log("Chart created successfully");
    } else {
      console.log("Updating existing chart...");
      densityChart.data.labels = labels;
      densityChart.data.datasets[0].data = avgPed;
      densityChart.data.datasets[1].data = avgVeh;
      densityChart.update();
    }
  } catch (e) {
    console.error("Error loading analytics data:", e);
  }
}

function setAnalyticsTimeRange(range) {
  currentAnalyticsRange = range;
  
  document.querySelectorAll('.analytics-controls .chart-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  let minutes = 10;
  if (range === '6hours') minutes = 60;
  if (range === '24hours') minutes = 144;
  
  if (densityChart) densityChart.destroy();
  densityChart = null;
  loadAnalytics();
}

function setChartType(type) {
  currentChartType = type;
  if (densityChart) {
    densityChart.destroy();
    densityChart = null;
  }
  loadAnalytics();
}

function exportAnalyticsCSV() {
  if (!densityChart) return;
  
  const labels = densityChart.data.labels;
  const pedData = densityChart.data.datasets[0].data;
  const vehData = densityChart.data.datasets[1].data;
  
  let csv = 'Time,Pedestrians,Vehicles\n';
  for (let i = 0; i < labels.length; i++) {
    csv += `${labels[i]},${pedData[i]},${vehData[i]}\n`;
  }
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'analytics-data.csv';
  a.click();
  window.URL.revokeObjectURL(url);
}

setInterval(() => {
  if (currentPage === 'analytics') {
    loadAnalytics();
  }
}, 30000);

// ===== SCENARIOS PAGE =====
function renderScenarioCards() {
  const grid = document.getElementById('scenarioCardsGrid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  scenarioCards.forEach((scen, idx) => {
    const card = document.createElement('div');
    card.className = 'scenario-card-detailed';
    card.innerHTML = `
      <div class="scenario-header-detailed">
        <div>
          <h3 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">${scen.title}</h3>
          <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;"><strong>Trigger:</strong> ${scen.trigger}</p>
        </div>
        <div class="scenario-toggle-control">
          <span class="scenario-status-badge ${scen.enabled ? 'active' : 'offline'}" id="${scen.statusId}">${scen.enabled ? 'Active' : 'Offline'}</span>
          <label class="switch">
            <input type="checkbox" ${scen.enabled ? 'checked' : ''} onchange="toggleScenarioMain(this, ${idx})">
            <span class="slider"></span>
          </label>
        </div>
      </div>
      <ul class="scenario-details-list">
        ${scen.details.map(d => `<li>${d}</li>`).join('')}
      </ul>
      <p class="scenario-action"><strong>YOLOv8 Action:</strong> ${scen.action}</p>
    `;
    grid.appendChild(card);
  });
}

// Scenario switch handler (calls backend) - UPDATED to sync with Live page
async function toggleScenarioMain(checkbox, idx) {
  const card = checkbox.closest('.scenario-card-detailed');
  const statusBadge = card.querySelector('.scenario-status-badge');
  const active = checkbox.checked;
  
  if (statusBadge) {
    statusBadge.textContent = active ? "Active" : "Offline";
    statusBadge.classList.remove('active', 'offline');
    statusBadge.classList.add(active ? 'active' : 'offline');
  }
  
  // Update state
  scenarioCards[idx].enabled = active;
  
  // Update Live page display
  updateLiveScenarioDisplay();
  
  const BASE_URL = window.location.origin;
  const title = scenarioCards[idx].title.toLowerCase();
  let payload = {};
  
  if (title.includes("vehicle priority")) {
    payload = { scenario: active ? "scenario_2_rush_hold" : "baseline", board_veh: active ? "ON" : "OFF" };
  } else if (title.includes("pedestrian priority")) {
    payload = { scenario: active ? "scenario_1_night_ped" : "baseline", board_ped_l: active ? "ON" : "OFF", board_ped_r: active ? "ON" : "OFF" };
  } else if (title.includes("emergency")) {
    payload = { scenario: active ? "scenario_3_emergency" : "baseline", board_veh: active ? "ON" : "OFF", board_ped_l: "OFF", board_ped_r: "OFF" };
  } else if (title.includes("marshall override")) {
    payload = { scenario: active ? "scenario_4_marshall_override" : "baseline", board_veh: active ? "ON" : "OFF", board_ped_l: active ? "ON" : "OFF", board_ped_r: active ? "ON" : "OFF" };
  } else if (title.includes("marshal safe")) {
    payload = { scenario: active ? "scenario_5_marshal_safe" : "baseline", board_ped_l: active ? "ON" : "OFF", board_ped_r: active ? "ON" : "OFF" };
  } else if (title.includes("baseline")) {
    payload = { scenario: "baseline", board_veh: "OFF", board_ped_l: "OFF", board_ped_r: "OFF" };
  }
  
  try {
    await fetch(BASE_URL + "/api/set_scenario", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });
    console.log("Scenario toggled:", title, "Active:", active);
  } catch(e) {
    console.error("Failed to set scenario:", e);
  }
}

// ===== ARCHIVE (LOGS) =====
function toggleSelectAll(cb) {
  document.querySelectorAll("#archiveLogBody input[type=checkbox]").forEach(x => x.checked = cb.checked);
}

async function deleteSelected() {
  const BASE_URL = window.location.origin;
  const ids = Array.from(document.querySelectorAll("#archiveLogBody input[type=checkbox]:checked"))
    .map(cb => Number(cb.dataset.id));
  
  if (!ids.length) {
    alert("Select at least one row.");
    return;
  }
  
  if (!confirm(`Delete ${ids.length} selected row(s)?`)) return;
  
  await fetch(BASE_URL + "/api/logs/delete", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ids})
  });
  
  await loadArchive();
}

async function clearAll() {
  const BASE_URL = window.location.origin;
  if (!confirm("Delete ALL log rows?")) return;
  
  await fetch(BASE_URL + "/api/logs/clear", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({all:true})
  });
  
  await loadArchive();
}

async function loadArchive(limit=200) {
  const BASE_URL = window.location.origin;
  try {
    const res = await fetch(BASE_URL + "/api/logs?limit=" + encodeURIComponent(limit));
    const rows = await res.json();
    
    const tbody = document.getElementById("archiveLogBody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    rows.forEach(r => {
      const tr = document.createElement("tr");
      const t = new Date(r.ts * 1000).toLocaleTimeString();
      tr.innerHTML = `
        <td><input type="checkbox" data-id="${r.id}"></td>
        <td>${t}</td>
        <td>${r.msg || ''}</td>
        <td>${r.board_state || ''}</td>
      `;
      tbody.appendChild(tr);
    });
    
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-secondary);">No logs available</td></tr>';
    }
  } catch(e) {
    console.error("Failed to load archive:", e);
    const tbody = document.getElementById("archiveLogBody");
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-secondary);">Failed to load logs</td></tr>';
    }
  }
}

// ===== HELP PAGE =====
function showHelpSection(section) {
  document.querySelectorAll('.help-link').forEach(link => {
    link.classList.remove('active');
  });
  
  event.target.classList.add('active');
  
  const helpContent = {
    'getting-started': `
      <h3>🚀 Getting Started</h3>
      <p>Welcome to the LED Board System! This application manages traffic lights using AI detection.</p>
      <p><strong>Quick Start:</strong></p>
      <ul>
        <li>Login with your admin credentials</li>
        <li>View 3 camera feeds on the Live page</li>
        <li>Adjust brightness, contrast, and sensitivity</li>
        <li>Activate scenarios as needed</li>
        <li>Monitor real-time data in Analytics</li>
      </ul>
    `,
    'features': `
      <h3>✨ Features</h3>
      <p><strong>System Capabilities:</strong></p>
      <ul>
        <li>3 Independent Camera Zones</li>
        <li>6 Traffic Scenarios</li>
        <li>Unlimited Simultaneous Activation</li>
        <li>Real-Time AI Detection</li>
        <li>Traffic Marshall Integration</li>
        <li>Inline Camera Calibration</li>
        <li>Light/Dark Mode Support</li>
        <li>Admin Registration & 2FA</li>
      </ul>
    `,
    'cameras': `
      <h3>📷 Cameras</h3>
      <p>Three independent camera detection zones monitor different aspects of traffic:</p>
      <ul>
        <li><strong>Pedestrian Camera:</strong> Detects pedestrians waiting to cross</li>
        <li><strong>Vehicle Camera:</strong> Monitors vehicles in 50m approach zone</li>
        <li><strong>Traffic Light Camera:</strong> Detects current signal state</li>
      </ul>
      <p>Each camera includes inline controls for brightness, contrast, sensitivity, and confidence adjustment.</p>
    `,
    'scenarios': `
      <h3>🎯 Scenarios</h3>
      <p><strong>6 Available Scenarios (All can be active simultaneously):</strong></p>
      <ol>
        <li>Pedestrian Priority - Pedestrian count > 30</li>
        <li>Vehicle Priority - Vehicle count > 20</li>
        <li>Emergency Vehicle - Emergency detected</li>
        <li>Marshall Override - Congestion + Marshall signal</li>
        <li>Marshal Safe Crossing - Marshall signal + No vehicles</li>
        <li>Baseline - Normal operation</li>
      </ol>
    `,
    'analytics': `
      <h3>📊 Analytics</h3>
      <p>Analytics section provides detailed reports and insights:</p>
      <ul>
        <li>Traffic flow statistics</li>
        <li>Pedestrian detection trends</li>
        <li>Vehicle speed analysis</li>
        <li>Scenario activation history</li>
        <li>System performance metrics</li>
      </ul>
    `,
    'support': `
      <h3>💬 Support</h3>
      <p><strong>Common Questions:</strong></p>
      <p><strong>Q: Can multiple scenarios be active?</strong><br>
      A: Yes! All scenarios can be active simultaneously with unlimited activation.</p>
      <p><strong>Q: How do I reset camera settings?</strong><br>
      A: Click the [↻] button next to each setting to restore defaults.</p>
      <p><strong>Q: What does Marshall Override do?</strong><br>
      A: It gives traffic marshall highest priority to stop all vehicles and let pedestrians cross safely.</p>
    `
  };
  
  const contentDiv = document.getElementById('helpContent');
  if (contentDiv && helpContent[section]) {
    contentDiv.innerHTML = helpContent[section];
  }
}

// ===== FORM SUBMISSION =====
document.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    if (document.getElementById('loginPage').classList.contains('hidden') === false) {
      login();
    } else if (document.getElementById('registerPage').classList.contains('hidden') === false) {
      register();
    } else if (document.getElementById('twoFAPage').classList.contains('hidden') === false) {
      verify2FA();
    }
  }
});
