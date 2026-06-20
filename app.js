// State Management
let players = [];
let selectedPlayerIds = new Set();
let history = [];
let currentEditingId = null;

// Rating Dimensions Configuration (8 Dimensions total)
const DIMENSIONS = [
  { key: 'throw', label: '传盘', icon: 'fa-paper-plane' },
  { key: 'catch', label: '接盘', icon: 'fa-hands' },
  { key: 'stamina', label: '体能', icon: 'fa-heartbeat' },
  { key: 'speed', label: '速度和灵活性', icon: 'fa-running' },
  { key: 'defense', label: '防守', icon: 'fa-shield-halved' },
  { key: 'awareness', label: '意识', icon: 'fa-brain' },
  { key: 'build', label: '体格', icon: 'fa-ruler-vertical' },
  { key: 'sportsmanship', label: '竞技精神', icon: 'fa-handshake' }
];

// Current form ratings state (integers 0 to 5)
let currentRatings = {
  throw: 3,
  catch: 3,
  stamina: 3,
  speed: 3,
  defense: 3,
  awareness: 3,
  build: 3,
  sportsmanship: 3
};

// Mock Preset Players (Ratings 0 to 5 integers)
const PRESET_PLAYERS = [
  { id: "p-preset-1", name: "阿波罗", gender: "male", ratings: { throw: 5, catch: 5, stamina: 5, speed: 4, defense: 4, awareness: 5, build: 4, sportsmanship: 5 } },
  { id: "p-preset-2", name: "闪电", gender: "male", ratings: { throw: 4, catch: 4, stamina: 5, speed: 5, defense: 4, awareness: 4, build: 3, sportsmanship: 5 } },
  { id: "p-preset-3", name: "飞盘侠", gender: "male", ratings: { throw: 5, catch: 5, stamina: 4, speed: 3, defense: 4, awareness: 5, build: 4, sportsmanship: 5 } },
  { id: "p-preset-4", name: "铁壁", gender: "male", ratings: { throw: 3, catch: 3, stamina: 4, speed: 4, defense: 5, awareness: 4, build: 5, sportsmanship: 5 } },
  { id: "p-preset-5", name: "风之子", gender: "male", ratings: { throw: 4, catch: 4, stamina: 5, speed: 5, defense: 3, awareness: 4, build: 4, sportsmanship: 4 } },
  { id: "p-preset-6", name: "萌新小王", gender: "male", ratings: { throw: 2, catch: 2, stamina: 3, speed: 3, defense: 3, awareness: 2, build: 3, sportsmanship: 5 } },
  { id: "p-preset-7", name: "瑶瑶", gender: "female", ratings: { throw: 4, catch: 4, stamina: 4, speed: 4, defense: 4, awareness: 5, build: 3, sportsmanship: 5 } },
  { id: "p-preset-8", name: "追风少女", gender: "female", ratings: { throw: 4, catch: 4, stamina: 5, speed: 5, defense: 3, awareness: 4, build: 3, sportsmanship: 5 } },
  { id: "p-preset-9", name: "盘姬", gender: "female", ratings: { throw: 5, catch: 5, stamina: 3, speed: 3, defense: 4, awareness: 5, build: 3, sportsmanship: 5 } },
  { id: "p-preset-10", name: "大力", gender: "female", ratings: { throw: 3, catch: 3, stamina: 4, speed: 4, defense: 4, awareness: 4, build: 4, sportsmanship: 5 } },
  { id: "p-preset-11", name: "默默", gender: "female", ratings: { throw: 4, catch: 4, stamina: 4, speed: 4, defense: 4, awareness: 4, build: 3, sportsmanship: 4 } },
  { id: "p-preset-12", name: "萱萱", gender: "female", ratings: { throw: 3, catch: 3, stamina: 3, speed: 3, defense: 3, awareness: 3, build: 3, sportsmanship: 5 } }
];

// Document Ready initialization
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  switchTab("play");
  updateGroupSizeEstimation();
  initRadarEditor(); // Setup interactive SVG
});

// Load data from LocalStorage
function loadData() {
  try {
    const savedPlayers = localStorage.getItem("fg_players");
    if (savedPlayers) {
      players = JSON.parse(savedPlayers);
    } else {
      // First load, populate preset
      players = [...PRESET_PLAYERS];
      localStorage.setItem("fg_players", JSON.stringify(players));
    }

    const savedHistory = localStorage.getItem("fg_history");
    if (savedHistory) {
      history = JSON.parse(savedHistory);
    } else {
      history = [];
    }

    // Default select all players initially for ease
    selectedPlayerIds = new Set(players.map(p => p.id));

    renderRosterList();
    renderSelectionGrid();
    renderHistoryList();
    updateHeaderStats();
  } catch (e) {
    showToast("加载本地数据失败，已重置", "error");
    console.error(e);
  }
}

// Save players to LocalStorage
function savePlayersToStorage() {
  localStorage.setItem("fg_players", JSON.stringify(players));
  updateHeaderStats();
}

// Save history to LocalStorage
function saveHistoryToStorage() {
  localStorage.setItem("fg_history", JSON.stringify(history));
}

// Global UI Header Stats Update
function updateHeaderStats() {
  document.getElementById("header-member-count").innerHTML = `<i class="fa-solid fa-users"></i> 队员: ${players.length}`;
  document.getElementById("roster-count").innerText = players.length;
}

// Switch navigation tabs
function switchTab(tabId) {
  document.querySelectorAll(".nav-tab").forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));

  const activeTabBtn = document.getElementById(`tab-btn-${tabId}`);
  const activePanel = document.getElementById(`tab-${tabId}`);

  if (activeTabBtn && activePanel) {
    activeTabBtn.classList.add("active");
    activePanel.classList.add("active");
  }

  // Reload grids on switch
  if (tabId === "play") {
    renderSelectionGrid();
  } else if (tabId === "roster") {
    renderRosterList();
  }
}

// Render active lineup checkboxes on grouping tab
function renderSelectionGrid() {
  const grid = document.getElementById("selection-grid");
  if (!grid) return;

  if (players.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-user-plus"></i>
        <p>暂无队员数据，请先前往“队员管理”录入队员</p>
      </div>`;
    updateSelectionStats();
    return;
  }

  // Sort players alphabetically or by gender
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.gender !== b.gender) {
      return a.gender === "male" ? -1 : 1;
    }
    return a.name.localeCompare(b.name, "zh-CN");
  });

  grid.innerHTML = sortedPlayers.map(player => {
    const isSelected = selectedPlayerIds.has(player.id);
    const overall = getPlayerOverall(player);
    const genderClass = player.gender === "male" ? "male" : "female";
    const genderIcon = player.gender === "male" ? '<i class="fa-solid fa-mars"></i>' : '<i class="fa-solid fa-venus"></i>';
    
    return `
      <div class="player-tag-btn ${isSelected ? 'selected' : ''}" 
           onclick="togglePlayerSelection('${player.id}')" 
           id="sel-player-${player.id}">
        <span class="player-tag-name">${player.name}</span>
        <div class="player-tag-score">
          <span class="player-tag-gender ${genderClass}">${genderIcon}</span>
          <span>★${overall.toFixed(1)}</span>
        </div>
      </div>
    `;
  }).join("");

  updateSelectionStats();
}

// Toggle individual selection state
function togglePlayerSelection(playerId) {
  const el = document.getElementById(`sel-player-${playerId}`);
  if (selectedPlayerIds.has(playerId)) {
    selectedPlayerIds.delete(playerId);
    if (el) el.classList.remove("selected");
  } else {
    selectedPlayerIds.add(playerId);
    if (el) el.classList.add("selected");
  }
  updateSelectionStats();
  updateGroupSizeEstimation();
}

// Select All / Clear All helpers
function selectAllPlayers(shouldSelect) {
  if (shouldSelect) {
    selectedPlayerIds = new Set(players.map(p => p.id));
  } else {
    selectedPlayerIds.clear();
  }
  renderSelectionGrid();
}

// Update stats badge under today's active members
function updateSelectionStats() {
  const totalSelected = selectedPlayerIds.size;
  let maleCount = 0;
  let femaleCount = 0;

  players.forEach(p => {
    if (selectedPlayerIds.has(p.id)) {
      if (p.gender === "male") maleCount++;
      else femaleCount++;
    }
  });

  document.getElementById("stats-total-selected").innerText = `已选: ${totalSelected} 人`;
  document.getElementById("stats-male-selected").innerHTML = `<i class="fa-solid fa-mars"></i> ${maleCount}`;
  document.getElementById("stats-female-selected").innerHTML = `<i class="fa-solid fa-venus"></i> ${femaleCount}`;
}

// Estimate team sizing based on selection
function updateGroupSizeEstimation() {
  const countSelect = document.getElementById("group-count");
  if (!countSelect) return;
  const numGroups = parseInt(countSelect.value);
  const totalSelected = selectedPlayerIds.size;

  if (totalSelected === 0) return;
  const baseSize = Math.floor(totalSelected / numGroups);
  const remainder = totalSelected % numGroups;
}

// Roster: Save / Update Player
function savePlayer(event) {
  event.preventDefault();
  
  const nameInput = document.getElementById("player-name");
  const genderRadio = document.querySelector('input[name="player-gender"]:checked');
  
  const name = nameInput.value.trim();
  const gender = genderRadio ? genderRadio.value : "male";
  
  // Clone current ratings state
  const ratings = { ...currentRatings };

  if (!name) {
    showToast("请输入队员姓名", "error");
    return;
  }

  if (currentEditingId) {
    // Edit existing player
    const playerIndex = players.findIndex(p => p.id === currentEditingId);
    if (playerIndex !== -1) {
      players[playerIndex].name = name;
      players[playerIndex].gender = gender;
      players[playerIndex].ratings = ratings;
      showToast(`已更新队员 ${name}`, "success");
    }
    currentEditingId = null;
    document.getElementById("roster-form-title").innerText = "添加队员";
    document.getElementById("btn-cancel-edit").classList.add("hidden");
    document.getElementById("btn-save-player").innerHTML = '<i class="fa-solid fa-check"></i> 保存队员';
  } else {
    // Add new player
    const newPlayer = {
      id: "p-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
      name,
      gender,
      ratings
    };
    players.push(newPlayer);
    selectedPlayerIds.add(newPlayer.id); // auto-select new player
    showToast(`成功添加队员 ${name}`, "success");
  }

  savePlayersToStorage();
  resetRosterForm();
  renderRosterList();
}

// Reset Roster Form inputs
function resetRosterForm() {
  document.getElementById("player-form").reset();
  currentEditingId = null;
  document.getElementById("roster-form-title").innerText = "添加队员";
  document.getElementById("btn-cancel-edit").classList.add("hidden");
  document.getElementById("btn-save-player").innerHTML = '<i class="fa-solid fa-check"></i> 保存队员';
  
  // Reset ratings state to default 3
  currentRatings = {
    throw: 3,
    stamina: 3,
    speed: 3,
    defense: 3,
    awareness: 3,
    build: 3,
    sportsmanship: 3
  };
  
  updateOverallScoreDisplay();
  drawRadarChart();
  renderRadarValuesList();
}

// Edit player trigger
function editPlayer(id) {
  const player = players.find(p => p.id === id);
  if (!player) return;

  currentEditingId = id;
  document.getElementById("roster-form-title").innerText = `编辑队员: ${player.name}`;
  document.getElementById("btn-cancel-edit").classList.remove("hidden");
  document.getElementById("btn-save-player").innerHTML = '<i class="fa-solid fa-save"></i> 更新队员';

  // Fill name & gender
  document.getElementById("player-name").value = player.name;
  if (player.gender === "male") {
    document.getElementById("gender-male").checked = true;
  } else {
    document.getElementById("gender-female").checked = true;
  }

  // Load player ratings to active state (ensuring fallback to 3, and rounding to integer 0-5)
  DIMENSIONS.forEach(dim => {
    let rawVal = player.ratings[dim.key] !== undefined ? player.ratings[dim.key] : 3;
    currentRatings[dim.key] = Math.max(0, Math.min(5, Math.round(rawVal)));
  });

  updateOverallScoreDisplay();
  drawRadarChart();
  renderRadarValuesList();

  // Scroll to form nicely
  document.getElementById("player-form").scrollIntoView({ behavior: "smooth" });
}

/* -------------------------------------------------------------
   INTERACTIVE RADAR CHART LOGIC
------------------------------------------------------------- */
const RADAR_CX = 170;
const RADAR_CY = 170;
const RADAR_R = 100;
let isDraggingRadar = false;

// Initialize Pointer event listeners on SVG
function initRadarEditor() {
  const svg = document.getElementById("radar-editor-svg");
  if (!svg) return;

  // Pointer down: start tracking drag
  svg.addEventListener("pointerdown", (e) => {
    isDraggingRadar = true;
    svg.setPointerCapture(e.pointerId);
    handleRadarInteraction(e);
  });

  // Pointer move: update handle positions
  svg.addEventListener("pointermove", (e) => {
    if (isDraggingRadar) {
      handleRadarInteraction(e);
    }
  });

  // Pointer up: stop tracking drag
  svg.addEventListener("pointerup", (e) => {
    if (isDraggingRadar) {
      svg.releasePointerCapture(e.pointerId);
      isDraggingRadar = false;
    }
  });

  // Initial draw
  drawRadarChart();
  renderRadarValuesList();
  updateOverallScoreDisplay();
}

// Convert screen/pointer coordinates to SVG space and update rating state
function handleRadarInteraction(e) {
  const svg = document.getElementById("radar-editor-svg");
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // Map pointer to SVG viewbox (340x340) coordinate space
  const svgX = (x / rect.width) * 340;
  const svgY = (y / rect.height) * 340;

  // Calculate angle and distance relative to center (CX, CY)
  const dx = svgX - RADAR_CX;
  const dy = svgY - RADAR_CY;
  const pointerAngle = Math.atan2(dy, dx);
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Find the closest dimension axis out of DIMENSIONS.length
  let closestIdx = 0;
  let minDiff = Infinity;

  DIMENSIONS.forEach((dim, idx) => {
    const axisAngle = -Math.PI / 2 + (2 * Math.PI * idx) / DIMENSIONS.length;
    const diff = angleDiff(pointerAngle, axisAngle);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = idx;
    }
  });

  // Calculate rating level: map dist (0 to R) to discrete level (0 to 5)
  const level = Math.max(0, Math.min(5, Math.round((dist / RADAR_R) * 5)));
  
  // Update state and refresh UI
  const key = DIMENSIONS[closestIdx].key;
  currentRatings[key] = level;

  updateOverallScoreDisplay();
  drawRadarChart();
  renderRadarValuesList();
}

// Helper: difference between two angles in range [-PI, PI]
function angleDiff(a, b) {
  let diff = a - b;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  return Math.abs(diff);
}

// Calculate and display overall score (average of all dimensions)
function updateOverallScoreDisplay() {
  const sum = Object.values(currentRatings).reduce((a, b) => a + b, 0);
  const avg = parseFloat((sum / DIMENSIONS.length).toFixed(1));
  const el = document.getElementById("radar-overall-val");
  if (el) el.innerText = avg.toFixed(1);
}

// Render dynamic Regular Polygon Radar Chart inside SVG
function drawRadarChart() {
  const svg = document.getElementById("radar-editor-svg");
  if (!svg) return;

  let html = "";
  const len = DIMENSIONS.length;

  // 1. Concentric polygon background rings (levels 1, 2, 3, 4, 5)
  for (let l = 1; l <= 5; l++) {
    const r = (l / 5) * RADAR_R;
    const points = [];
    for (let i = 0; i < len; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / len;
      const px = RADAR_CX + r * Math.cos(angle);
      const py = RADAR_CY + r * Math.sin(angle);
      points.push(`${px},${py}`);
    }
    html += `<polygon points="${points.join(" ")}" class="radar-ring radar-ring-${l}"></polygon>`;
  }

  // 2. Straight axis grid lines and vertex text labels
  DIMENSIONS.forEach((dim, idx) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * idx) / len;
    
    // Axis line
    const ax = RADAR_CX + RADAR_R * Math.cos(angle);
    const ay = RADAR_CY + RADAR_R * Math.sin(angle);
    html += `<line x1="${RADAR_CX}" y1="${RADAR_CY}" x2="${ax}" y2="${ay}" class="radar-axis-line"></line>`;

    // Text Label offset position (push out slightly from level 5 vertex)
    const labelDist = RADAR_R + 24;
    let lx = RADAR_CX + labelDist * Math.cos(angle);
    let ly = RADAR_CY + labelDist * Math.sin(angle);

    // Minor alignment tweaks for readability
    if (Math.abs(lx - RADAR_CX) < 10) {
      ly += (ly > RADAR_CY ? 4 : -4); // nudge vertically
    } else {
      lx += (lx > RADAR_CX ? 4 : -4); // nudge horizontally
    }

    html += `<text x="${lx}" y="${ly}" class="radar-label-text">${dim.label}</text>`;
  });

  // 3. Active data polygon (filled neon green shape representing scores)
  const activePoints = [];
  DIMENSIONS.forEach((dim, idx) => {
    const val = currentRatings[dim.key];
    const r = (val / 5) * RADAR_R;
    const angle = -Math.PI / 2 + (2 * Math.PI * idx) / len;
    const px = RADAR_CX + r * Math.cos(angle);
    const py = RADAR_CY + r * Math.sin(angle);
    activePoints.push(`${px},${py}`);
  });
  html += `<polygon points="${activePoints.join(" ")}" class="radar-active-poly"></polygon>`;

  // 4. Dot handles on each vertex of active shape for visual feedback and dragging
  DIMENSIONS.forEach((dim, idx) => {
    const val = currentRatings[dim.key];
    const r = (val / 5) * RADAR_R;
    const angle = -Math.PI / 2 + (2 * Math.PI * idx) / len;
    const px = RADAR_CX + r * Math.cos(angle);
    const py = RADAR_CY + r * Math.sin(angle);
    
    html += `<circle cx="${px}" cy="${py}" r="6" class="radar-handle"></circle>`;
  });

  svg.innerHTML = html;
}

// Render simple lists below heptagon with manual adjustments (+/-)
function renderRadarValuesList() {
  const container = document.getElementById("radar-values-list");
  if (!container) return;

  container.innerHTML = DIMENSIONS.map(dim => {
    const val = currentRatings[dim.key];
    return `
      <div class="radar-value-row">
        <div class="radar-value-label-group">
          <i class="fa-solid ${dim.icon}"></i>
          <span>${dim.label}</span>
        </div>
        <div class="radar-value-controls">
          <button type="button" class="radar-btn-adj" onclick="adjustDimensionValue('${dim.key}', -1)">-</button>
          <span class="radar-val-display">${val}</span>
          <button type="button" class="radar-btn-adj" onclick="adjustDimensionValue('${dim.key}', 1)">+</button>
        </div>
      </div>
    `;
  }).join("");
}

// Button adjuster callback (plus/minus buttons)
function adjustDimensionValue(dimKey, amount) {
  const val = currentRatings[dimKey] || 0;
  const newVal = Math.max(0, Math.min(5, val + amount));
  currentRatings[dimKey] = newVal;

  updateOverallScoreDisplay();
  drawRadarChart();
  renderRadarValuesList();
}

// Delete player trigger
function deletePlayer(id, name) {
  if (confirm(`确认要删除队员 ${name} 吗？`)) {
    players = players.filter(p => p.id !== id);
    selectedPlayerIds.delete(id);
    savePlayersToStorage();
    renderRosterList();
    showToast(`已删除队员 ${name}`, "info");
  }
}

// Render members table in Roster tab
function renderRosterList() {
  const tbody = document.getElementById("roster-table-body");
  if (!tbody) return;

  const searchQuery = document.getElementById("roster-search").value.trim().toLowerCase();
  
  // Filter search
  const filtered = players.filter(p => p.name.toLowerCase().includes(searchQuery));

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted" style="padding: 30px;">
          暂无符合搜索条件的队员
        </td>
      </tr>`;
    return;
  }

  // Sort alphabetically
  filtered.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));

  tbody.innerHTML = filtered.map(player => {
    const overall = getPlayerOverall(player);
    const genderHtml = player.gender === "male" 
      ? '<span class="gender-tag male"><i class="fa-solid fa-mars"></i> 男生</span>'
      : '<span class="gender-tag female"><i class="fa-solid fa-venus"></i> 女生</span>';

    return `
      <tr>
        <td style="font-weight: 600;">${player.name}</td>
        <td>${genderHtml}</td>
        <td><span class="badge-overall">★ ${overall.toFixed(1)}</span></td>
        <td class="actions-col">
          <div class="action-row-btns">
            <button class="btn btn-outline btn-xs" onclick="editPlayer('${player.id}')">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn btn-danger btn-xs" onclick="deletePlayer('${player.id}', '${player.name}')">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// Generate Group Assignment Action
function generateGroups() {
  const activeList = players.filter(p => selectedPlayerIds.has(p.id));
  const groupCountVal = parseInt(document.getElementById("group-count").value);
  const strategy = document.querySelector('input[name="group-strategy"]:checked').value;
  const genderBalance = document.getElementById("opt-gender-balance").checked;
  const avoidHistory = document.getElementById("opt-avoid-history").checked;

  if (activeList.length < groupCountVal) {
    showToast(`当前只勾选了 ${activeList.length} 人，至少需要勾选 ${groupCountVal} 人才能分成 ${groupCountVal} 队`, "error");
    return;
  }

  // Show result card and scroll loader
  const resultCard = document.getElementById("result-card");
  const loader = document.getElementById("shuffle-loader");
  const output = document.getElementById("groups-output");

  resultCard.classList.remove("hidden");
  loader.classList.remove("hidden");
  output.innerHTML = "";
  
  resultCard.scrollIntoView({ behavior: "smooth" });

  // 1-second shuffle animation delay for rich premium feel
  setTimeout(() => {
    try {
      const teams = performGrouping(activeList, groupCountVal, strategy, genderBalance, avoidHistory, history);
      
      loader.classList.add("hidden");
      renderGroupingResult(teams);
      
      // Save result to local history (keep last 30 items)
      saveToHistory(teams, strategy);
    } catch (e) {
      loader.classList.add("hidden");
      output.innerHTML = `<div class="empty-state text-danger"><i class="fa-solid fa-circle-xmark"></i> <p>分组计算出错: ${e.message}</p></div>`;
      console.error(e);
    }
  }, 1000);
}

// Render grouping teams output
function renderGroupingResult(teams) {
  const output = document.getElementById("groups-output");
  if (!output) return;

  output.innerHTML = teams.map((team, idx) => {
    const boys = team.players.filter(p => p.gender === "male").length;
    const girls = team.players.filter(p => p.gender === "female").length;
    
    const playersHtml = team.players.map(p => {
      const gIcon = p.gender === "male" 
        ? '<i class="fa-solid fa-mars male-icon"></i>' 
        : '<i class="fa-solid fa-venus female-icon"></i>';
      
      // Highlight high rated stars in visual UI
      const starIcon = getPlayerOverall(p) >= 4.2 
        ? '<i class="fa-solid fa-star player-star" title="核心选手"></i>' 
        : '';
        
      return `
        <span class="team-player-pill">
          ${gIcon} ${p.name} ${starIcon}
        </span>
      `;
    }).join("");

    return `
      <div class="group-team-box" style="border-left-color: ${idx % 2 === 0 ? 'var(--color-cyan)' : 'var(--color-neon)'}">
        <div class="group-team-header">
          <div class="team-title">
            <h3>${team.name}</h3>
            <span class="badge gender-badge male-badge"><i class="fa-solid fa-mars"></i> ${boys}</span>
            <span class="badge gender-badge female-badge"><i class="fa-solid fa-venus"></i> ${girls}</span>
          </div>
          <span class="team-score-badge">平均战力: <strong>★ ${team.trueAverage.toFixed(1)}</strong></span>
        </div>
        <div class="team-players-list">
          ${playersHtml}
        </div>
      </div>
    `;
  }).join("");
}

// Save recent session to history list
function saveToHistory(teams, strategy) {
  const strategyLabels = {
    "balance": "实力均衡",
    "run-dog": "看盘跑死狗",
    "lion-sheep": "跟着狮子的绵羊",
    "god": "上帝安排"
  };

  const record = {
    id: "h-" + Date.now(),
    timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    strategyLabel: strategyLabels[strategy] || "智能分组",
    teams: teams.map(t => ({
      name: t.name,
      players: t.players.map(p => ({ id: p.id, name: p.name, gender: p.gender }))
    }))
  };

  // Prepend to history, cap at last 30 sessions
  history.unshift(record);
  if (history.length > 30) {
    history.pop();
  }

  saveHistoryToStorage();
  renderHistoryList();
}

// Render history records list
function renderHistoryList() {
  const container = document.getElementById("history-list");
  if (!container) return;

  if (history.length === 0) {
    container.innerHTML = `<div class="empty-state-small">暂无历史记录</div>`;
    return;
  }

  container.innerHTML = history.map(item => {
    // Generate text preview of teams
    const teamsStr = item.teams.map(t => `${t.name}(${t.players.length}人): ${t.players.map(p => p.name).join(",")}`).join(" | ");

    return `
      <div class="history-item">
        <span class="history-time"><i class="fa-solid fa-clock"></i> ${item.timestamp}</span>
        <span class="history-teams" title="${teamsStr}">
          <strong class="text-neon">[${item.strategyLabel}]</strong> ${teamsStr}
        </span>
        <div class="history-action">
          <button class="btn btn-outline btn-xs" onclick="copySpecificHistory('${item.id}')">复制</button>
        </div>
      </div>
    `;
  }).join("");
}

// Copy specific history item
function copySpecificHistory(id) {
  const item = history.find(h => h.id === id);
  if (!item) return;
  
  const text = formatTeamsToText(item.teams, item.strategyLabel);
  copyToClipboard(text);
}

// Clear recent history list
function clearHistory() {
  if (confirm("确认要清空最近的 30 次分组历史吗？这会清除避开重复队友的历史依据。")) {
    history = [];
    saveHistoryToStorage();
    renderHistoryList();
    showToast("分组历史已清空", "info");
  }
}

// Construct plain text representation of teams for easy copy-paste
function formatTeamsToText(teams, strategyLabel) {
  let dateStr = new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  let timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  let text = `🥏 盘聚 FrisbeeGroup 分组结果 (${dateStr} ${timeStr})\n`;
  text += `🎯 策略: ${strategyLabel}\n`;
  text += `=========================\n\n`;

  teams.forEach(team => {
    const names = team.players.map(p => p.name).join("、");
    const m = team.players.filter(p => p.gender === "male").length;
    const f = team.players.filter(p => p.gender === "female").length;
    text += `👥 ${team.name} (${team.players.length}人 - ${m}男${f}女):\n`;
    text += `👉 ${names}\n\n`;
  });
  
  text += `🔥 上场拼搏，安全第一！`;
  return text;
}

// Copy grouping result
function copyResultText() {
  const resultCard = document.getElementById("result-card");
  if (resultCard.classList.contains("hidden")) return;

  const strategy = document.querySelector('input[name="group-strategy"]:checked').value;
  const strategyLabels = {
    "balance": "实力均衡",
    "run-dog": "看盘跑死狗",
    "lion-sheep": "跟着狮子的绵羊",
    "god": "上帝安排"
  };

  // Re-fetch current active result from UI or state
  if (history.length === 0) return;
  const currentResult = history[0]; // The one just created
  const formattedText = formatTeamsToText(currentResult.teams, strategyLabels[strategy]);
  
  copyToClipboard(formattedText);
}

// Copy sharing link text
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast("分组结果已复制到剪贴板，快发微信群吧！", "success");
  }).catch(err => {
    // Fallback approach
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast("分组结果已复制到剪贴板", "success");
    } catch (err) {
      showToast("复制失败，请手动选取复制", "error");
    }
    document.body.removeChild(textArea);
  });
}

// Export Data (JSON)
function exportDataToFile() {
  const exportObj = {
    app: "FrisbeeGroup",
    version: "1.0",
    players,
    history
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `frisbee_group_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast("备份文件导出成功", "success");
}

// Import Data (JSON)
function importDataFromFile(event) {
  const fileReader = new FileReader();
  const file = event.target.files[0];
  if (!file) return;

  fileReader.onload = function(e) {
    try {
      const importedObj = JSON.parse(e.target.result);
      if (importedObj.app === "FrisbeeGroup" && Array.isArray(importedObj.players)) {
        players = importedObj.players;
        history = Array.isArray(importedObj.history) ? importedObj.history : [];
        
        savePlayersToStorage();
        saveHistoryToStorage();
        
        // Auto-select all imported players
        selectedPlayerIds = new Set(players.map(p => p.id));

        renderRosterList();
        renderSelectionGrid();
        renderHistoryList();
        updateHeaderStats();
        
        showToast("数据成功导入并覆写！", "success");
      } else {
        showToast("无效的备份文件格式", "error");
      }
    } catch (err) {
      showToast("解析JSON失败，请检查文件内容", "error");
    }
  };
  fileReader.readAsText(file);
}

// Factory Reset Cleanup
function factoryReset() {
  if (confirm("⚠️ 注意！这将永久删除您所有的队员配置和 30 次分组记录，且不可恢复！确认清除吗？")) {
    localStorage.removeItem("fg_players");
    localStorage.removeItem("fg_history");
    players = [];
    history = [];
    selectedPlayerIds.clear();
    
    renderRosterList();
    renderSelectionGrid();
    renderHistoryList();
    updateHeaderStats();
    
    showToast("所有本地数据已成功清空", "info");
  }
}

// Toast Alert System Helper
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  let icon = '<i class="fa-solid fa-circle-check"></i>';
  if (type === "error") {
    icon = '<i class="fa-solid fa-circle-exclamation"></i>';
  } else if (type === "info") {
    icon = '<i class="fa-solid fa-circle-info"></i>';
  }

  toast.innerHTML = `${icon} <span>${message}</span>`;
  container.appendChild(toast);

  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.style.animation = "fadeOut 0.3s ease forwards";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3200);
}
