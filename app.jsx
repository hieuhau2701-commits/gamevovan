import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Zap, Shield, Map as MapIcon, ChevronRight, Flame, Beaker, Package, X, ScrollText, Sword } from 'lucide-react';

// --- CẤU HÌNH TRÒ CHƠI ---
const MAP_WIDTH = 8000;
const MAP_HEIGHT = 8000;
const TILE_SIZE = 100;
const MAX_INVENTORY_SLOTS = 16;

const rand = (min, max) => Math.random() * (max - min) + min;

// --- HỆ THỐNG CẢNH GIỚI ---
const CULTIVATION_LEVELS = [
  { name: 'Phàm Nhân', req: 100, color: '#9ca3af', speed: 4, radius: 15, aura: 'rgba(156, 163, 175, 0.2)', dmg: 10 },
  { name: 'Luyện Khí Kỳ', req: 500, color: '#ffffff', speed: 4.5, radius: 18, aura: 'rgba(255, 255, 255, 0.3)', dmg: 25 },
  { name: 'Trúc Cơ Kỳ', req: 2500, color: '#4ade80', speed: 5, radius: 20, aura: 'rgba(74, 222, 128, 0.4)', dmg: 60 },
  { name: 'Kết Đan Kỳ', req: 10000, color: '#60a5fa', speed: 5.5, radius: 22, aura: 'rgba(96, 165, 250, 0.5)', dmg: 150 },
  { name: 'Nguyên Anh Kỳ', req: 50000, color: '#c084fc', speed: 6, radius: 25, aura: 'rgba(192, 132, 252, 0.5)', dmg: 400 },
  { name: 'Hóa Thần Kỳ', req: 250000, color: '#fb923c', speed: 7, radius: 28, aura: 'rgba(251, 146, 60, 0.6)', dmg: 1000 },
  { name: 'Luyện Hư Kỳ', req: 1000000, color: '#f87171', speed: 8, radius: 32, aura: 'rgba(248, 113, 113, 0.6)', dmg: 2500 },
  { name: 'Tiên Nhân', req: Infinity, color: '#22d3ee', speed: 10, radius: 40, aura: 'rgba(34, 211, 238, 0.8)', dmg: 10000 },
];

const SUB_STAGES = ['Sơ kỳ', 'Trung kỳ', 'Viên mãn', 'Đại viên mãn'];

// Định nghĩa vật phẩm
const INVENTORY_DEF = {
  stones: { name: 'Linh Thạch', icon: '💎', desc: 'Tiền tệ chung của Tu Tiên Giới.', canUse: false },
  meat: { name: 'Thịt Yêu Thú', icon: '🥩', desc: 'Sử dụng để hồi phục 20% lượng máu tối đa.', canUse: true },
  cores: { name: 'Yêu Đan', icon: '🔮', desc: 'Chứa tinh hoa quái vật. Dùng để luyện đan hoặc đổi thức ăn trong Tông môn.', canUse: false },
  pills: { name: 'Đan Dược', icon: '💊', desc: 'Tăng 10% tỷ lệ đột phá Đại Cảnh Giới hoặc sử dụng trực tiếp để nhận lượng lớn Linh Khí.', canUse: true }
};

export default function App() {
  const canvasRef = useRef(null);
  
  // Trạng thái giao diện
  const [uiState, setUiState] = useState({ 
    qi: 0, stones: 0, levelIndex: 0, subLevel: 0, hp: 100, maxHp: 100, currentRoom: null,
    x: 0, y: 0, logs: [], meat: 0, cores: 0, pills: 0 
  });

  const [isInvOpen, setInvOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Trạng thái Lõi của Game
  const gameState = useRef({
    player: { 
      x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, targetX: null, targetY: null, hp: 100, maxHp: 100, currentRoom: null,
      qi: 0, stones: 0, levelIndex: 0, subLevel: 0, attackTimer: 0,
      meat: 0, cores: 0, pills: 0
    },
    keys: { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false, space: false },
    camera: { x: 0, y: 0 },
    regions: [], decorations: [], monsters: [], items: [], zones: [], particles: [], projectiles: [],
    sects: [], caves: [], pets: [],
    lastTime: 0, logs: []
  });

  const addLog = (msg, type = 'normal') => {
    const newLog = { id: Date.now() + Math.random(), text: msg, type, time: new Date().toLocaleTimeString() };
    gameState.current.logs.unshift(newLog);
    if (gameState.current.logs.length > 5) gameState.current.logs.pop();
  };

  const spawnItem = (type, x, y) => {
    let emoji, value, radius;
    if (type === 'herb') { emoji = '🌿'; value = rand(10, 30); radius = 12; }
    else if (type === 'stone') { emoji = '💎'; value = rand(1, 5); radius = 10; }
    else if (type === 'meat') { emoji = '🥩'; value = 1; radius = 12; }
    else if (type === 'core') { emoji = '🔮'; value = 1; radius = 12; }
    return { id: Math.random().toString(), type, x, y, value: Math.floor(value), radius, emoji };
  };

  // --- HÀM TẠO THẾ GIỚI ---
  const generateWorld = () => {
    const state = gameState.current;

    // 1. Tông Môn
    const sectX = MAP_WIDTH / 2; const sectY = MAP_HEIGHT / 2 - 800; const sectRadius = 600;
    const sect = { x: sectX, y: sectY, radius: sectRadius, name: "Thanh Vân Môn", rooms: [], npcs: [], statues: [], barrierRotation: 0 };

    // 4 Tượng Thần Thú trấn giữ 4 phương (Sát ranh giới Đại trận)
    sect.statues.push({ name: 'Huyền Vũ Thần Tôn', emoji: '🐢', x: sectX, y: sectY - sectRadius }); // Bắc
    sect.statues.push({ name: 'Chu Tước Thần Tôn', emoji: '🦚', x: sectX, y: sectY + sectRadius }); // Nam
    sect.statues.push({ name: 'Thanh Long Thần Tôn', emoji: '🐉', x: sectX + sectRadius, y: sectY }); // Đông
    sect.statues.push({ name: 'Bạch Hổ Thần Tôn', emoji: '🐅', x: sectX - sectRadius, y: sectY }); // Tây

    // --- CÁC NGỌN NÚI KHÁC NHAU QUANH TÔNG MÔN ---
    const holyMountains = [
        { name: 'Băng Kết Lĩnh', emoji: '🏔️', angle: -Math.PI / 4, dist: 950, size: 160 },
        { name: 'Xích Viêm Phong', emoji: '🌋', angle: (3 * Math.PI) / 4, dist: 1000, size: 150 },
        { name: 'Vân Đỉnh Sơn', emoji: '🗻', angle: (5 * Math.PI) / 4, dist: 980, size: 180 },
        { name: 'Thanh Thạch Nhai', emoji: '⛰️', angle: (7 * Math.PI) / 4, dist: 1050, size: 140 },
    ];

    holyMountains.forEach(m => {
        state.decorations.push({
            type: 'holy_mountain',
            x: sectX + Math.cos(m.angle) * m.dist,
            y: sectY + Math.sin(m.angle) * m.dist,
            radius: m.size,
            emoji: m.emoji,
            name: m.name
        });
    });

    // --- ĐỊNH NGHĨA PHÒNG BAN ---
    sect.rooms = [
      { type: 'MainHall', name: 'Đại Điện', emoji: '🏛️', x: sectX, y: sectY - 300, width: 300, height: 220, color: 'rgba(250, 204, 21, 0.2)' },
      { type: 'Alchemy', name: 'Luyện Đan', emoji: '⚗️', x: sectX - 300, y: sectY - 50, width: 220, height: 160, color: 'rgba(56, 189, 248, 0.2)' },
      { type: 'Kitchen', name: 'Nhà Bếp', emoji: '🔥', x: sectX + 300, y: sectY - 50, width: 220, height: 160, color: 'rgba(248, 113, 113, 0.2)' },
      { type: 'Library', name: 'Tàng Thư Các', emoji: '📜', x: sectX - 300, y: sectY + 150, width: 220, height: 160, color: 'rgba(167, 139, 250, 0.2)' },
      { type: 'Armory', name: 'Kho Đồ', emoji: '🗡️', x: sectX + 300, y: sectY + 150, width: 220, height: 160, color: 'rgba(156, 163, 175, 0.2)' },
      { type: 'Cultivation', name: 'Phòng Tu Luyện 1', emoji: '🧘', x: sectX - 100, y: sectY + 300, width: 160, height: 140, color: 'rgba(74, 222, 128, 0.2)' },
      { type: 'Cultivation', name: 'Phòng Tu Luyện 2', emoji: '🧘', x: sectX + 100, y: sectY + 300, width: 160, height: 140, color: 'rgba(74, 222, 128, 0.2)' },
    ];

    // NPCs
    sect.npcs.push({ x: sectX, y: sectY - 300, title: 'Tông Chủ', emoji: '🧙‍♂️', color: '#facc15', targetX: sectX, targetY: sectY - 300, timer: 9999, role: 'master' });
    for(let i=0; i<15; i++) {
      sect.npcs.push({ x: sectX + rand(-200, 200), y: sectY + rand(0, 300), title: 'Đệ Tử', emoji: ['🧍', '🧍‍♂️', '🧍‍♀️'][Math.floor(Math.random()*3)], color: '#9ca3af', targetX: null, targetY: null, timer: 0, role: 'disciple' });
    }
    state.sects.push(sect);

    // 2. Núi và Hang động phổ thông CHỈ Ở BÊN NGOÀI XA
    for (let i = 0; i < 40; i++) {
      let mx, my;
      let nearSect = true;
      while(nearSect) {
          mx = rand(500, MAP_WIDTH - 500);
          my = rand(500, MAP_HEIGHT - 500);
          nearSect = Math.hypot(mx - sectX, my - sectY) < sectRadius + 1500; // Cách xa tông môn
      }
      
      if (i < 8) {
          state.caves.push({ x: mx, y: my, radius: 120, isSealed: true, unlockProgress: 0, requiredProgress: rand(1000, 3000), emoji: '🏔️' });
      } else {
          state.decorations.push({
              type: 'mountain',
              x: mx,
              y: my,
              radius: rand(60, 100),
              emoji: '⛰️'
          });
      }
    }

    // 3. Yêu Thú (Phát sinh bên ngoài)
    for (let i = 0; i < 150; i++) {
      const level = Math.floor(rand(0, 8)); const isDemon = Math.random() > 0.5;
      let emojis = isDemon ? ['👹', '🕷️', '🦂', '🦇'] : ['🐺', '🐍', '🦅', '🦌'];
      const emoji = emojis[Math.floor(Math.random()*emojis.length)];
      const isRanged = ['🕷️', '🐍', '🦂', '🦇', '🦅', '🦌'].includes(emoji);
      
      let mx, my;
      let inSect = true;
      while (inSect) {
        mx = rand(100, MAP_WIDTH - 100);
        my = rand(100, MAP_HEIGHT - 100);
        inSect = state.sects.some(s => Math.hypot(mx - s.x, my - s.y) < s.radius + 100);
      }

      state.monsters.push({
        id: i, level: level, type: isDemon ? 'demon' : 'spirit',
        x: mx, y: my, originX: mx, originY: my,
        radius: 20 + level * 3, speed: rand(1.5, 3.5), angle: rand(0, Math.PI * 2), emoji: emoji,
        wanderTimer: 0, attackTimer: rand(1, 3), isRanged: isRanged,
        hp: 100 * Math.pow(2.5, level), maxHp: 100 * Math.pow(2.5, level), isAggro: false,
        auraColor: isDemon ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'
      });
    }
    state.monsters.forEach(m => { m.originX = m.x; m.originY = m.y; });
    addLog('Địa hình Tông môn đã được thanh tẩy sạch sẽ.');
  };

  // --- CÁC HÀM XỬ LÝ (ACTIONS) ---
  const handleBreakthrough = () => {
    const p = gameState.current.player;
    const currentLevelData = CULTIVATION_LEVELS[p.levelIndex];
    const reqQi = currentLevelData.req * Math.pow(1.5, p.subLevel);

    if (p.qi >= reqQi) {
      if (p.subLevel < 3) {
        p.qi -= reqQi; p.subLevel += 1;
        p.maxHp = 100 * Math.pow(2, p.levelIndex) * (1 + p.subLevel * 0.2); p.hp = p.maxHp;
        addLog(`Đột phá thành công [${currentLevelData.name} - ${SUB_STAGES[p.subLevel]}]!`);
        for (let i = 0; i < 20; i++) gameState.current.particles.push({ x: p.x, y: p.y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1, color: '#4ade80' });
      } else {
        const baseProb = Math.max(10, 100 - (p.levelIndex * 15));
        const prob = Math.min(100, baseProb + (p.pills * 10));

        addLog(`Dùng ${p.pills} Đan Dược, tỷ lệ đột phá: ${prob}%...`);
        p.pills = 0; 

        if (Math.random() * 100 <= prob) {
          p.qi -= reqQi; p.levelIndex += 1; p.subLevel = 0;
          p.maxHp = 100 * Math.pow(2, p.levelIndex) * (1 + p.subLevel * 0.2); p.hp = p.maxHp;
          addLog(`KINH THIÊN ĐỘNG ĐỊA! Chúc mừng thăng cấp ${CULTIVATION_LEVELS[p.levelIndex].name}!`);
          for (let i = 0; i < 100; i++) gameState.current.particles.push({ x: p.x, y: p.y, vx: (Math.random()-0.5)*20, vy: (Math.random()-0.5)*20, life: 1, color: CULTIVATION_LEVELS[p.levelIndex].color });
        } else {
          p.qi -= reqQi * 0.8; 
          addLog(`Đột phá thất bại! Khí huyết dâng trào, hao tổn tu vi...`, 'error');
          for (let i = 0; i < 30; i++) gameState.current.particles.push({ x: p.x, y: p.y, vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15, life: 1, color: '#ef4444' });
        }
      }
    }
  };

  const buyFood = (type) => {
    const p = gameState.current.player;
    if (type === 'stone' && p.stones >= 10) { p.stones -= 10; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5); addLog("Ăn uống no say, hồi 50% HP!"); } 
    else if (type === 'core' && p.cores >= 1) { p.cores -= 1; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5); addLog("Dùng Yêu Đan hầm canh, hồi 50% HP!"); } 
    else { addLog("Không đủ nguyên liệu đổi thức ăn!", "error"); }
  };

  const craftPill = () => {
    const p = gameState.current.player;
    if (p.cores >= 3) { p.cores -= 3; p.pills += 1; addLog("Luyện đan thành công! Nhận 1 Đan Dược."); } 
    else { addLog("Cần 3 Yêu Đan để luyện đan!", "error"); }
  };

  const useItem = (itemKey) => {
    const p = gameState.current.player;
    if (p[itemKey] <= 0) return addLog("Không có đủ vật phẩm!", "error");
    if (!INVENTORY_DEF[itemKey].canUse) return addLog("Vật phẩm này không thể sử dụng trực tiếp!", "error");
    
    if (itemKey === 'meat') { p.meat -= 1; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.2); addLog("Đã dùng Thịt Yêu Thú, hồi 20% máu."); }
    if (itemKey === 'pills') { p.pills -= 1; p.qi += 5000 * (p.levelIndex + 1); addLog("Nuốt Đan Dược, linh khí dâng trào!"); }
    setSelectedItem(null); 
  };

  const discardItem = (itemKey) => {
    const p = gameState.current.player;
    if (p[itemKey] > 0) { 
      p[itemKey] -= 1; addLog(`Đã vứt bỏ 1 ${INVENTORY_DEF[itemKey].name}.`); 
      if (p[itemKey] === 0) setSelectedItem(null); 
    }
  };

  const handleDirDown = (key) => { if (gameState.current && gameState.current.keys.hasOwnProperty(key)) { gameState.current.keys[key] = true; gameState.current.player.targetX = null; gameState.current.player.targetY = null; } };
  const handleDirUp = (key) => { if (gameState.current && gameState.current.keys.hasOwnProperty(key)) gameState.current.keys[key] = false; };

  // --- GAME LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    generateWorld();

    const handleKeyDown = (e) => { 
      if (e.code === 'Space') gameState.current.keys.space = true;
      if (gameState.current.keys.hasOwnProperty(e.key)) { gameState.current.keys[e.key] = true; gameState.current.player.targetX = null; gameState.current.player.targetY = null; } 
    };
    const handleKeyUp = (e) => { 
      if (e.code === 'Space') gameState.current.keys.space = false;
      if (gameState.current.keys.hasOwnProperty(e.key)) gameState.current.keys[e.key] = false; 
    };
    const handleMouseDown = (e) => {
      if (e.target !== canvas) return;
      const rect = canvas.getBoundingClientRect();
      gameState.current.player.targetX = e.clientX - rect.left + gameState.current.camera.x;
      gameState.current.player.targetY = e.clientY - rect.top + gameState.current.camera.y;
    };

    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp); canvas.addEventListener('mousedown', handleMouseDown);
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize); resize();

    const isVisible = (x, y, radius = 400) => {
      const c = gameState.current.camera;
      return x + radius > c.x && x - radius < c.x + canvas.width && y + radius > c.y && y - radius < c.y + canvas.height;
    };

    const loop = (time) => {
      const state = gameState.current;
      const dt = (time - state.lastTime) / 1000 || 0.016; state.lastTime = time;
      const p = state.player;
      const levelData = CULTIVATION_LEVELS[p.levelIndex];
      const speed = levelData.speed * (1 + p.subLevel * 0.1);

      if (p.hp <= 0) {
        p.hp = p.maxHp; p.qi = Math.max(0, p.qi - (levelData.req * 0.5));
        p.x = MAP_WIDTH / 2; p.y = MAP_HEIGHT / 2 - 800;
        p.targetX = null; p.targetY = null;
        addLog("Trọng thương! Đã được đưa về Tông Môn dưỡng thương, tổn hao tu vi lớn.", "error");
      }

      let dx = 0; let dy = 0;
      if (state.keys.w || state.keys.ArrowUp) dy -= 1;
      if (state.keys.s || state.keys.ArrowDown) dy += 1;
      if (state.keys.a || state.keys.ArrowLeft) dx -= 1;
      if (state.keys.d || state.keys.ArrowRight) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const length = Math.sqrt(dx*dx + dy*dy);
        p.x += (dx / length) * speed; p.y += (dy / length) * speed;
      } else if (p.targetX !== null && p.targetY !== null) {
        const tdx = p.targetX - p.x; const tdy = p.targetY - p.y; const dist = Math.sqrt(tdx*tdx + tdy*tdy);
        if (dist > speed) { p.x += (tdx / dist) * speed; p.y += (tdy / dist) * speed; } 
        else { p.x = p.targetX; p.y = p.targetY; p.targetX = null; p.targetY = null; }
      }

      p.x = Math.max(levelData.radius, Math.min(MAP_WIDTH - levelData.radius, p.x));
      p.y = Math.max(levelData.radius, Math.min(MAP_HEIGHT - levelData.radius, p.y));
      p.qi += 5 * dt * (p.levelIndex * 4 + p.subLevel + 1);

      let inSect = false;
      let activeRoom = null;

      state.sects.forEach(sect => {
        if (Math.hypot(p.x - sect.x, p.y - sect.y) < sect.radius) { inSect = true; }
        sect.npcs.forEach(npc => {
          if (npc.role === 'disciple') {
            npc.timer -= dt;
            if (npc.timer <= 0) {
              const room = sect.rooms[Math.floor(Math.random() * sect.rooms.length)];
              npc.targetX = room.x + rand(-room.width/3, room.width/3); npc.targetY = room.y + rand(-room.height/3, room.height/3); npc.timer = rand(5, 15);
            }
            if (npc.targetX !== null) {
              const ndx = npc.targetX - npc.x; const ndy = npc.targetY - npc.y; const ndist = Math.sqrt(ndx*ndx + ndy*ndy);
              if (ndist > 2) { npc.x += (ndx/ndist)*2; npc.y += (ndy/ndist)*2; }
            }
          }
        });
        sect.rooms.forEach(room => {
          if (p.x > room.x - room.width/2 && p.x < room.x + room.width/2 && p.y > room.y - room.height/2 && p.y < room.y + room.height/2) {
            activeRoom = room.type;
            if (room.type === 'Cultivation') { p.qi += 200 * dt * (p.levelIndex * 2 + p.subLevel + 1); if(Math.random()<0.1) state.particles.push({ x: p.x, y: p.y, vx: 0, vy: -3, life: 1, color: '#4ade80' }); }
          }
        });
      });
      p.currentRoom = activeRoom;

      state.caves.forEach(cave => {
        if (Math.hypot(p.x - cave.x, p.y - cave.y) < cave.radius) {
          if (cave.isSealed && p.qi > 10 * dt) {
            p.qi -= 10 * dt; cave.unlockProgress += 50 * dt;
            state.particles.push({ x: cave.x + rand(-50,50), y: cave.y + rand(-50,50), vx: 0, vy: -1, life: 0.5, color: '#c084fc' });
            if (cave.unlockProgress >= cave.requiredProgress) { cave.isSealed = false; addLog(`Đã phá giải phong ấn Động Phủ!`); }
          } else if (!cave.isSealed) {
            p.qi += 300 * dt * (p.levelIndex + 1); if(Math.random()<0.2) state.particles.push({ x: p.x, y: p.y, vx: 0, vy: -5, life: 1, color: '#c084fc' });
          }
        }
      });

      p.attackTimer -= dt;
      let targetMonster = null; let closestDist = 400;

      for (let i = state.monsters.length - 1; i >= 0; i--) {
        const m = state.monsters[i];
        const distToPlayer = Math.hypot(m.x - p.x, m.y - p.y);
        if (distToPlayer < closestDist) { closestDist = distToPlayer; targetMonster = m; }
        if (inSect) { m.isAggro = false; } else {
           if (distToPlayer < 400) m.isAggro = true;
           if (distToPlayer > 800) m.isAggro = false;
        }
        let moveSpeed = m.speed;
        if (m.isAggro) { 
          m.angle = Math.atan2(p.y - m.y, p.x - m.x); moveSpeed = m.speed * 1.5; 
          const stopDist = m.isRanged ? 250 : levelData.radius + m.radius + 40;
          if (distToPlayer < stopDist) { moveSpeed = 0; }
          if (m.isRanged) {
            m.attackTimer -= dt;
            if (m.attackTimer <= 0 && distToPlayer < 400) {
              let pColor = m.type === 'demon' ? '#ef4444' : '#4ade80'; 
              if (m.emoji === '🕷️' || m.emoji === '🐍') pColor = '#10b981'; 
              if (m.emoji === '🦂' || m.emoji === '🦇') pColor = '#8b5cf6'; 
              if (m.emoji === '🦅' || m.emoji === '🦌') pColor = '#facc15'; 
              state.projectiles.push({ x: m.x, y: m.y, vx: Math.cos(m.angle) * 8, vy: Math.sin(m.angle) * 8, life: 2.0, dmg: (m.level * 10) + 10, isEnemy: true, color: pColor });
              m.attackTimer = rand(2, 4); 
            }
          }
        } else {
          m.wanderTimer -= dt;
          if (m.wanderTimer <= 0) { m.angle = rand(0, Math.PI * 2); m.wanderTimer = rand(1, 3); }
          if (Math.hypot(m.x - m.originX, m.y - m.originY) > 200) m.angle = Math.atan2(m.originY - m.y, m.originX - m.x);
        }
        let nextX = m.x + Math.cos(m.angle) * moveSpeed; let nextY = m.y + Math.sin(m.angle) * moveSpeed;
        let hitBarrier = false;
        state.sects.forEach(sect => { if (Math.hypot(nextX - sect.x, nextY - sect.y) < sect.radius + m.radius) { hitBarrier = true; } });
        if (hitBarrier) { m.angle += Math.PI + rand(-0.5, 0.5); m.isAggro = false; m.wanderTimer = 1; } 
        else {
          m.x = nextX; m.y = nextY;
          if (m.isAggro && !m.isRanged && Math.hypot(m.x - p.x, m.y - p.y) <= levelData.radius + m.radius + 50) {
            m.attackTimer -= dt;
            if (m.attackTimer <= 0) { p.hp -= (m.level * 20 + 5); m.attackTimer = 1.0; state.particles.push({ x: p.x, y: p.y, vx: rand(-5,5), vy: rand(-5,5), life: 0.5, color: '#ef4444' }); }
          }
        }
        if (m.hp <= 0) {
          addLog(`Tiêu diệt ${m.type === 'demon' ? 'Ma Thú' : 'Linh Thú'} Lv.${m.level}!`);
          state.items.push(spawnItem('meat', m.x + rand(-20,20), m.y + rand(-20,20)));
          state.items.push(spawnItem('core', m.x + rand(-20,20), m.y + rand(-20,20))); 
          for(let k=0; k<20; k++) state.particles.push({ x: m.x, y: m.y, vx: rand(-10,10), vy: rand(-10,10), life: 1, color: m.type === 'demon' ? '#ef4444' : '#4ade80' });
          state.monsters.splice(i, 1);
        }
      }

      const playerDmg = levelData.dmg * (1 + p.subLevel * 0.5);
      if (state.keys.space && p.attackTimer <= 0) {
        if (targetMonster) {
          const angle = Math.atan2(targetMonster.y - p.y, targetMonster.x - p.x);
          state.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(angle) * 20, vy: Math.sin(angle) * 20, life: 1.0, dmg: playerDmg, isEnemy: false });
        } else {
          state.projectiles.push({ x: p.x, y: p.y, vx: 20, vy: 0, life: 1.0, dmg: playerDmg, isEnemy: false });
        }
        p.attackTimer = 0.3;
      }

      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const proj = state.projectiles[i];
        proj.x += proj.vx; proj.y += proj.vy; proj.life -= dt;
        let hit = false;
        if (proj.isEnemy) { state.sects.forEach(sect => { if (Math.hypot(proj.x - sect.x, proj.y - sect.y) < sect.radius) hit = true; }); }
        if (!hit) {
          if (proj.isEnemy) { if (Math.hypot(proj.x - p.x, proj.y - p.y) < levelData.radius + 5) { p.hp -= proj.dmg; hit = true; } } 
          else { state.monsters.forEach(m => { if (!hit && Math.hypot(proj.x - m.x, proj.y - m.y) < m.radius + 10) { m.hp -= proj.dmg; m.isAggro = true; hit = true; } }); }
        }
        if (hit || proj.life <= 0) {
           const pColor = proj.isEnemy ? proj.color : '#38bdf8';
           for(let k=0; k<8; k++) state.particles.push({ x: proj.x, y: proj.y, vx: rand(-4,4), vy: rand(-4,4), life: 0.4, color: pColor });
           state.projectiles.splice(i, 1);
        }
      }

      for (let i = state.items.length - 1; i >= 0; i--) {
        const item = state.items[i];
        if (Math.hypot(p.x - item.x, p.y - item.y) < levelData.radius + item.radius + 30) {
          if (item.type === 'herb') p.qi += item.value * (p.levelIndex * 2 + p.subLevel + 1); 
          else if (item.type === 'stone') p.stones += item.value;
          else if (item.type === 'meat') p.meat += 1;
          else if (item.type === 'core') p.cores += 1;
          state.items.splice(i, 1);
        }
      }

      state.camera.x = Math.max(0, Math.min(MAP_WIDTH - canvas.width, p.x - canvas.width / 2));
      state.camera.y = Math.max(0, Math.min(MAP_HEIGHT - canvas.height, p.y - canvas.height / 2));

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.translate(-state.camera.x, -state.camera.y);

      ctx.fillStyle = '#0f172a'; ctx.fillRect(state.camera.x, state.camera.y, canvas.width, canvas.height);
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
      const startCol = Math.floor(state.camera.x / TILE_SIZE); const endCol = startCol + (canvas.width / TILE_SIZE) + 1;
      const startRow = Math.floor(state.camera.y / TILE_SIZE); const endRow = startRow + (canvas.height / TILE_SIZE) + 1;
      ctx.beginPath();
      for (let x = startCol; x <= endCol; x++) { ctx.moveTo(x * TILE_SIZE, state.camera.y); ctx.lineTo(x * TILE_SIZE, state.camera.y + canvas.height); }
      for (let y = startRow; y <= endRow; y++) { ctx.moveTo(state.camera.x, y * TILE_SIZE); ctx.lineTo(state.camera.x + canvas.width, y * TILE_SIZE); }
      ctx.stroke();

      state.sects.forEach(sect => {
        if (!isVisible(sect.x, sect.y, sect.radius + 100)) return;
        sect.barrierRotation = (sect.barrierRotation || 0) + 0.2 * dt;
        ctx.save(); ctx.translate(sect.x, sect.y); ctx.rotate(sect.barrierRotation);
        ctx.beginPath(); ctx.arc(0, 0, sect.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)'; ctx.lineWidth = 3; ctx.setLineDash([40, 20]); ctx.stroke(); ctx.restore();

        ctx.font = 'bold 50px serif'; ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; ctx.textAlign = 'center'; ctx.fillText(sect.name, sect.x, sect.y);

        sect.rooms.forEach(room => {
          const w = room.width; const h = room.height; const rx = room.x; const ry = room.y;
          const roofColor = room.color.replace('0.2', '0.7'); const wallColor = room.color.replace('0.2', '0.15'); const borderColor = room.color.replace('0.2', '1');
          ctx.fillStyle = wallColor; ctx.fillRect(rx - w/2 + 10, ry - h/2 + h*0.4, w - 20, h*0.6); ctx.strokeStyle = borderColor; ctx.lineWidth = 2; ctx.strokeRect(rx - w/2 + 10, ry - h/2 + h*0.4, w - 20, h*0.6);
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(rx, ry + h/2, 25, Math.PI, 0); ctx.fill();
          ctx.beginPath(); ctx.moveTo(rx, ry - h/2); ctx.quadraticCurveTo(rx + w*0.3, ry - h/2 + h*0.3, rx + w/2 + 20, ry - h/2 + h*0.4); ctx.lineTo(rx - w/2 - 20, ry - h/2 + h*0.4); ctx.quadraticCurveTo(rx - w*0.3, ry - h/2 + h*0.3, rx, ry - h/2); ctx.fillStyle = roofColor; ctx.fill(); ctx.strokeStyle = borderColor; ctx.stroke();
          ctx.beginPath(); ctx.arc(rx, ry - h/2, 6, 0, Math.PI*2); ctx.fillStyle = '#facc15'; ctx.fill();
          ctx.font = '28px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(room.emoji, rx, ry + h*0.1); ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#fff'; ctx.fillText(room.name, rx, ry + h*0.3);
        });

        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        sect.statues.forEach(st => { 
            ctx.beginPath(); ctx.arc(st.x, st.y, 50, 0, Math.PI * 2); ctx.fillStyle = 'rgba(250, 204, 21, 0.1)'; ctx.fill();
            ctx.font = '80px Arial'; ctx.fillText(st.emoji, st.x, st.y); ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#facc15'; ctx.fillText(st.name, st.x, st.y - 60);
        });
        ctx.font = '80px Arial'; ctx.fillText('⛩️', sect.x, sect.y + sect.radius + 80);
        sect.npcs.forEach(npc => { ctx.font = '30px Arial'; ctx.fillText(npc.emoji, npc.x, npc.y); ctx.font = 'bold 12px Arial'; ctx.fillStyle = npc.color; ctx.fillText(npc.title, npc.x, npc.y - 25); });
      });

      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      state.decorations.forEach(d => { 
          if (!isVisible(d.x, d.y, d.radius)) return; 
          
          if (d.type === 'holy_mountain') {
              ctx.beginPath(); ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(51, 65, 85, 0.3)'; ctx.fill();
              ctx.font = `${d.radius * 1.5}px Arial`; ctx.fillText(d.emoji, d.x, d.y);
              ctx.font = 'bold 16px Arial'; ctx.fillStyle = '#facc15'; ctx.fillText(d.name, d.x, d.y - d.radius);
          } else {
              ctx.font = d.type === 'mountain' ? '120px Arial' : `${d.radius * 2}px Arial`; 
              ctx.fillText(d.emoji, d.x, d.y); 
          }
      });

      state.caves.forEach(cave => {
        if (!isVisible(cave.x, cave.y, cave.radius)) return;
        ctx.font = `${cave.radius * 1.5}px Arial`; ctx.fillText(cave.emoji, cave.x, cave.y);
        if (cave.isSealed) {
          ctx.beginPath(); ctx.arc(cave.x, cave.y + 20, cave.radius * 0.8, 0, Math.PI * 2); ctx.fillStyle = 'rgba(192, 132, 252, 0.2)'; ctx.fill(); ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 3; ctx.setLineDash([10, 5]); ctx.stroke(); ctx.setLineDash([]);
          const pct = cave.unlockProgress / cave.requiredProgress; ctx.fillStyle = '#000'; ctx.fillRect(cave.x - 40, cave.y - 60, 80, 8); ctx.fillStyle = '#c084fc'; ctx.fillRect(cave.x - 40, cave.y - 60, 80 * pct, 8);
        } else {
          ctx.beginPath(); ctx.arc(cave.x, cave.y + 20, cave.radius * 0.8, 0, Math.PI * 2); ctx.fillStyle = 'rgba(56, 189, 248, 0.3)'; ctx.fill();
          ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#38bdf8'; ctx.fillText('Linh Mạch Động', cave.x, cave.y - 60);
        }
      });

      state.items.forEach(item => { if (!isVisible(item.x, item.y, item.radius)) return; ctx.font = `${item.radius * 2}px Arial`; ctx.fillText(item.emoji, item.x, item.y); });

      state.monsters.forEach(m => {
        if (!isVisible(m.x, m.y, m.radius)) return;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.radius * 1.5, 0, Math.PI * 2); ctx.fillStyle = m.auraColor; ctx.fill();
        ctx.font = `${m.radius * 2}px Arial`; ctx.fillText(m.emoji, m.x, m.y);
        ctx.font = 'bold 12px Arial'; ctx.fillStyle = m.type === 'demon' ? '#ef4444' : '#4ade80'; ctx.fillText(`Lv.${m.level} ${m.type === 'demon' ? 'Ma Thú' : 'Linh Thú'}`, m.x, m.y - m.radius - 20);
        const hpPct = Math.max(0, m.hp / m.maxHp); ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(m.x - 20, m.y - m.radius - 10, 40, 5); ctx.fillStyle = '#ef4444'; ctx.fillRect(m.x - 20, m.y - m.radius - 10, 40 * hpPct, 5);
      });

      state.projectiles.forEach(proj => { 
        const r = proj.isEnemy ? 8 : 12; const grad = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, r);
        grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.4, proj.isEnemy ? proj.color : '#38bdf8'); grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath(); ctx.arc(proj.x, proj.y, r, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill(); 
      });
      
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const pt = state.particles[i]; pt.x += pt.vx || 0; pt.y += pt.vy || 0; pt.life -= dt * 2;
        if (pt.life <= 0) { state.particles.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(0, pt.life); ctx.beginPath(); ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2); ctx.fillStyle = pt.color; ctx.fill(); ctx.globalAlpha = 1.0;
      }

      ctx.beginPath(); ctx.arc(p.x, p.y, levelData.radius * 1.5, 0, Math.PI * 2); ctx.fillStyle = levelData.aura; ctx.fill(); ctx.strokeStyle = levelData.color; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = `${levelData.radius * 1.8}px Arial`; ctx.shadowColor = levelData.color; ctx.shadowBlur = 20; ctx.fillText('🧘‍♂️', p.x, p.y); ctx.shadowBlur = 0;
      const playerHpPct = Math.max(0, p.hp / p.maxHp); ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(p.x - 20, p.y - levelData.radius * 1.5 - 20, 40, 5); ctx.fillStyle = '#10b981'; ctx.fillRect(p.x - 20, p.y - levelData.radius * 1.5 - 20, 40 * playerHpPct, 5);
      ctx.fillStyle = levelData.color; ctx.font = 'bold 12px sans-serif'; ctx.fillText(`Đạo Hữu`, p.x, p.y - levelData.radius * 1.5 - 25);
      ctx.restore(); animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    const uiInterval = setInterval(() => {
      const p = gameState.current.player;
      setUiState({ 
        qi: Math.floor(p.qi), stones: p.stones, levelIndex: p.levelIndex, subLevel: p.subLevel, hp: p.hp, maxHp: p.maxHp, currentRoom: p.currentRoom,
        x: Math.floor(p.x), y: Math.floor(p.y), logs: [...gameState.current.logs], meat: p.meat, cores: p.cores, pills: p.pills
      });
    }, 100);

    return () => {
      cancelAnimationFrame(animationFrameId); clearInterval(uiInterval);
      window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousedown', handleMouseDown); window.removeEventListener('resize', resize);
    };
  }, []);

  const currentLevel = CULTIVATION_LEVELS[uiState.levelIndex];
  const nextLevel = CULTIVATION_LEVELS[uiState.levelIndex + 1];
  const reqQi = currentLevel ? currentLevel.req * Math.pow(1.5, uiState.subLevel) : 0;
  const progressPercent = nextLevel ? Math.min(100, (uiState.qi / reqQi) * 100) : 100;
  const isRealmBreakthrough = uiState.subLevel === 3;
  const baseProb = Math.max(10, 100 - (uiState.levelIndex * 15));
  const totalProb = Math.min(100, baseProb + (uiState.pills * 10));
  const ownedItems = Object.entries(INVENTORY_DEF).filter(([key]) => uiState[key] > 0);
  const inventorySlots = Array.from({ length: MAX_INVENTORY_SLOTS }).map((_, idx) => ownedItems[idx] || null);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 font-sans select-none text-slate-200">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 cursor-crosshair block"></canvas>

      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between">
        
        <div className="absolute top-4 right-4 pointer-events-none z-20">
          <div className="bg-slate-900/80 backdrop-blur border border-slate-700/50 p-3 rounded-xl w-80 shadow-lg mask-image-b-to-t">
            <div className="space-y-1 font-mono text-[11px] flex flex-col-reverse h-40 overflow-hidden">
              {uiState.logs.map((log) => (
                <div key={log.id} className="animate-fade-in-up text-slate-300 border-b border-slate-800/50 pb-1">
                  <span className="text-slate-500 opacity-70">[{log.time}]</span> <span className={log.type === 'error' ? 'text-red-400' : ''}>{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto w-64">
          <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-2 rounded-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center bg-slate-800" style={{ borderColor: currentLevel.color }}>
                  <Shield className="w-5 h-5" style={{ color: currentLevel.color }} />
              </div>
              <div>
                  <div className="font-bold text-sm" style={{ color: currentLevel.color }}>{currentLevel.name}</div>
                  <div className="text-xs text-slate-400">{SUB_STAGES[uiState.subLevel]}</div>
              </div>
          </div>
          <div className="w-full bg-slate-900/80 border border-slate-700 h-4 rounded-full overflow-hidden relative">
              <div className="bg-red-500 h-full transition-all" style={{ width: `${(uiState.hp / uiState.maxHp) * 100}%` }}></div>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white shadow-black drop-shadow-md">HP: {Math.floor(uiState.hp)} / {Math.floor(uiState.maxHp)}</span>
          </div>
          {nextLevel && (
            <div className="w-full bg-slate-900/80 border border-slate-700 h-4 rounded-full overflow-hidden relative">
                <div className="h-full transition-all" style={{ width: `${progressPercent}%`, backgroundColor: currentLevel.color }}></div>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white shadow-black drop-shadow-md">KHÍ: {Math.floor(uiState.qi)} / {Math.floor(reqQi)}</span>
            </div>
          )}
        </div>

        <div className="absolute top-36 left-4 flex flex-col gap-3 pointer-events-auto">
            <button onClick={() => setInvOpen(true)} className="w-12 h-12 bg-slate-800/90 hover:bg-slate-700 rounded-full border-2 border-slate-600 flex items-center justify-center text-slate-200 shadow-lg transition-transform hover:scale-105 active:scale-95">
                <Package className="w-6 h-6" />
            </button>
            {nextLevel && uiState.qi >= reqQi && (
                <button onClick={handleBreakthrough} className="w-12 h-12 bg-yellow-600/90 hover:bg-yellow-500 rounded-full border-2 border-yellow-400 flex items-center justify-center text-white shadow-[0_0_15px_rgba(234,179,8,0.6)] animate-pulse transition-transform hover:scale-110 active:scale-95">
                    {isRealmBreakthrough ? <Zap className="w-6 h-6" /> : <ArrowUp className="w-6 h-6" />}
                </button>
            )}
        </div>

        {uiState.currentRoom === 'Kitchen' && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900/95 border border-red-500/50 p-4 rounded-xl flex flex-col items-center gap-3 z-30 pointer-events-auto shadow-2xl">
            <div className="flex items-center gap-2 text-red-400 font-bold"><Flame /> Linh Thiện Đường (Nhà Bếp)</div>
            <p className="text-xs text-slate-300">Đổi nguyên liệu lấy thức ăn hồi phục 50% HP</p>
            <div className="flex gap-2">
              <button onClick={() => buyFood('stone')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"><span className="text-lg">💎</span> 10 → Ăn</button>
              <button onClick={() => buyFood('core')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"><span className="text-lg">🔮</span> 1 → Ăn</button>
            </div>
          </div>
        )}

        {uiState.currentRoom === 'Alchemy' && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900/95 border border-blue-500/50 p-4 rounded-xl flex flex-col items-center gap-3 z-30 pointer-events-auto shadow-2xl">
            <div className="flex items-center gap-2 text-blue-400 font-bold"><Beaker /> Phòng Luyện Đan</div>
            <p className="text-xs text-slate-300">Dùng Yêu Đan trong người để kết tinh Đan Dược</p>
            <button onClick={craftPill} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors"><span className="text-xl">🔮</span> 3 → <span className="text-xl">💊</span> 1</button>
          </div>
        )}

        {uiState.currentRoom === 'Library' && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900/95 border border-purple-500/50 p-4 rounded-xl flex flex-col items-center gap-2 z-30 pointer-events-auto shadow-2xl">
            <div className="flex items-center gap-2 text-purple-400 font-bold"><ScrollText /> Tàng Thư Các</div>
            <p className="text-xs text-slate-300">Nơi cất giữ vô vàn công pháp tu tiên</p>
            <button className="px-4 py-2 bg-slate-800 rounded-lg text-xs font-bold text-slate-500 cursor-not-allowed">Chưa đủ cảnh giới để tham ngộ</button>
          </div>
        )}

        {uiState.currentRoom === 'Armory' && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900/95 border border-gray-500/50 p-4 rounded-xl flex flex-col items-center gap-2 z-30 pointer-events-auto shadow-2xl">
            <div className="flex items-center gap-2 text-gray-400 font-bold"><Sword /> Kho Đồ Tông Môn</div>
            <p className="text-xs text-slate-300">Cất giữ Pháp Khí và Bảo Vật ngàn năm</p>
            <button className="px-4 py-2 bg-slate-800 rounded-lg text-xs font-bold text-slate-500 cursor-not-allowed">Chưa có quyền hạn tiếp cận</button>
          </div>
        )}

        {isInvOpen && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 pointer-events-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-80 shadow-[0_0_50px_rgba(0,0,0,1)] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/40">
                <h3 className="font-bold text-slate-200 flex items-center gap-2"><Package className="w-5 h-5"/> Túi Đồ Không Gian</h3>
                <button onClick={() => {setInvOpen(false); setSelectedItem(null);}} className="text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6"/></button>
              </div>
              <div className="p-4 grid grid-cols-4 gap-3 bg-slate-950">
                 {inventorySlots.map((item, index) => {
                    if (item) {
                      const [key, def] = item; const count = uiState[key];
                      return (
                         <button key={key} onClick={() => setSelectedItem(key)} className={`relative p-2 bg-slate-800 border rounded-lg hover:bg-slate-700 flex flex-col items-center justify-center h-14 transition-all ${selectedItem === key ? 'border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'border-slate-700'}`}>
                            <span className="text-2xl filter drop-shadow-md">{def.icon}</span>
                            <span className="absolute -bottom-2 -right-2 bg-slate-900 border border-slate-700 text-[10px] px-1.5 py-0.5 font-mono font-bold rounded-full">{count}</span>
                         </button>
                      )
                    } else {
                      return ( <div key={`empty-${index}`} className="relative bg-slate-800/30 border border-slate-700/50 rounded-lg flex flex-col items-center justify-center h-14 shadow-inner"></div> )
                    }
                 })}
              </div>
              {selectedItem && (
                 <div className="p-4 bg-slate-900 border-t border-slate-800 animate-fade-in-up">
                    <h4 className="font-bold text-cyan-400 text-sm flex items-center gap-2 mb-1">{INVENTORY_DEF[selectedItem].icon} {INVENTORY_DEF[selectedItem].name}</h4>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed h-10">{INVENTORY_DEF[selectedItem].desc}</p>
                    <div className="flex gap-3">
                       <button onClick={() => useItem(selectedItem)} disabled={!INVENTORY_DEF[selectedItem].canUse || uiState[selectedItem] <= 0} className="flex-1 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 rounded-lg hover:bg-emerald-600/40 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Sử Dụng</button>
                       <button onClick={() => discardItem(selectedItem)} disabled={uiState[selectedItem] <= 0} className="flex-1 py-2 bg-red-600/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-600/40 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Vứt Bỏ</button>
                    </div>
                 </div>
              )}
            </div>
          </div>
        )}

        {/* --- JOYSTICK --- */}
        <div className="absolute bottom-8 left-8 w-36 h-36 bg-slate-900/80 backdrop-blur-md rounded-full border-4 border-slate-700 shadow-[0_0_20px_rgba(0,0,0,0.6)] md:hidden pointer-events-auto touch-none flex items-center justify-center z-20">
          <button onPointerDown={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); handleDirDown('w'); }} onPointerUp={() => handleDirUp('w')} onPointerLeave={() => handleDirUp('w')} className="absolute top-1 w-12 h-12 bg-slate-800/80 hover:bg-slate-700 rounded-full flex items-center justify-center text-cyan-400"><ArrowUp className="w-6 h-6" /></button>
          <button onPointerDown={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); handleDirDown('a'); }} onPointerUp={() => handleDirUp('a')} onPointerLeave={() => handleDirUp('a')} className="absolute left-1 w-12 h-12 bg-slate-800/80 hover:bg-slate-700 rounded-full flex items-center justify-center text-cyan-400"><ArrowLeft className="w-6 h-6" /></button>
          <div className="w-10 h-10 bg-slate-800 rounded-full shadow-inner border border-slate-700/50 pointer-events-none"></div>
          <button onPointerDown={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); handleDirDown('d'); }} onPointerUp={() => handleDirUp('d')} onPointerLeave={() => handleDirUp('d')} className="absolute right-1 w-12 h-12 bg-slate-800/80 hover:bg-slate-700 rounded-full flex items-center justify-center text-cyan-400"><ArrowRight className="w-6 h-6" /></button>
          <button onPointerDown={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); handleDirDown('s'); }} onPointerUp={() => handleDirUp('s')} onPointerLeave={() => handleDirUp('s')} className="absolute bottom-1 w-12 h-12 bg-slate-800/80 hover:bg-slate-700 rounded-full flex items-center justify-center text-cyan-400"><ArrowDown className="w-6 h-6" /></button>
        </div>

        {/* --- ATTACK BUTTON --- */}
        <div className="absolute bottom-8 right-8 pointer-events-auto z-20">
           <button onPointerDown={() => { gameState.current.keys.space = true; }} onPointerUp={() => { gameState.current.keys.space = false; }} onPointerLeave={() => { gameState.current.keys.space = false; }} className="w-20 h-20 bg-red-600/80 hover:bg-red-500 rounded-full border-4 border-red-800 flex items-center justify-center text-white shadow-[0_0_30px_rgba(220,38,38,0.5)] touch-none active:scale-95 transition-transform"><span className="text-4xl filter drop-shadow-md">⚔️</span></button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `@keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in-up { animation: fadeInUp 0.3s ease-out forwards; }`}} />
    </div>
  );
}