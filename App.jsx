import React, { useState, useEffect, useRef } from 'react';
import { Shield, Sword, Backpack, Flame, X, Utensils, RotateCcw } from 'lucide-react';

// ==========================================
// HỆ THỐNG CẢNH GIỚI "TIÊN NGHỊCH"
// ==========================================
const REALMS = [
  { name: "Ngưng Khí Tầng 1", maxExp: 10 },
  { name: "Ngưng Khí Tầng 2", maxExp: 20 },
  { name: "Ngưng Khí Tầng 3", maxExp: 40 },
  { name: "Ngưng Khí Tầng 4", maxExp: 80 },
  { name: "Ngưng Khí Tầng 5", maxExp: 150 },
  { name: "Trúc Cơ Sơ Kỳ", maxExp: 500 },
  { name: "Trúc Cơ Trung Kỳ", maxExp: 1000 },
  { name: "Trúc Cơ Hậu Kỳ", maxExp: 2000 },
  { name: "Kết Đan Sơ Kỳ", maxExp: 5000 },
  { name: "Kết Đan Trung Kỳ", maxExp: 10000 },
  { name: "Kết Đan Hậu Kỳ", maxExp: 20000 },
  { name: "Nguyên Anh Kỳ", maxExp: 50000 },
  { name: "Hóa Thần Kỳ", maxExp: 150000 }
];

const MAP_SIZE = 5000;
const SECT_CENTER = { x: 2500, y: 2500 };
const SECT_RADIUS = 700;

export default function App() {
  const [inGame, setInGame] = useState(false);
  const [playerName, setPlayerName] = useState('');

  if (!inGame) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-cyan-500/30">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl border border-cyan-700/50 shadow-[0_0_30px_rgba(6,182,212,0.2)] text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">Tiên Nghịch 2D</h1>
          <p className="text-slate-400 text-sm mb-8">Nghịch thiên nhi hành, đạp phá hư không</p>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Nhập tên nhân vật..."
            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-cyan-500 mb-6"
          />
          <button
            onClick={() => playerName.trim() && setInGame(true)}
            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg"
          >
            Vào Thế Giới
          </button>
        </div>
      </div>
    );
  }

  return <GameWorld playerName={playerName} />;
}

// ==========================================
// MÀN HÌNH CHƠI GAME CHÍNH (2D CANVAS)
// ==========================================
function GameWorld({ playerName }) {
  const canvasRef = useRef(null);
  const [hud, setHud] = useState({ hp: 100, maxHp: 100, exp: 0, realm: 0 });
  const [showInventory, setShowInventory] = useState(false);
  const [inventory, setInventory] = useState({ meat: 0, pills: [] });
  const [canCook, setCanCook] = useState(false);
  
  // State nhận diện thiết bị & Xoay màn hình
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  // Joystick State
  const [knobPos, setKnobPosition] = useState({ x: 0, y: 0 });
  const joystickRef = useRef(null);
  const isDraggingJoystick = useRef(false);
  const joystick = useRef({ dx: 0, dy: 0 });
  
  // Game State nội bộ 
  const gameState = useRef({
    player: { 
      x: 2500, y: 2600, 
      speed: 6, 
      dir: 0, 
      isAttacking: false, 
      attackTimer: 0,
      target: null, // Tọa độ click chuột {x, y}
      targetMonsterId: null // ID quái vật đang đuổi theo
    },
    stats: { hp: 100, maxHp: 100, exp: 0, realm: 0, attack: 25 },
    inv: { meat: 0, pills: [] },
    monsters: [],
    drops: [],
    camera: { x: 2500, y: 2600 },
    lastCultivateTime: Date.now(),
    clickMarker: null // Hiệu ứng vòng tròn khi click chuột
  });

  // Kiểm tra thiết bị & Sinh quái
  useEffect(() => {
    const isTouch = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    setIsTouchDevice(isTouch);

    const handleOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    handleOrientation();
    window.addEventListener('resize', handleOrientation);

    const spawnMonsters = () => {
      const mobs = [];
      for (let i = 0; i < 80; i++) {
        let mx, my;
        do {
          mx = Math.random() * MAP_SIZE;
          my = Math.random() * MAP_SIZE;
        } while (Math.hypot(mx - SECT_CENTER.x, my - SECT_CENTER.y) < SECT_RADIUS + 100);
        
        const level = Math.floor(Math.random() * 5) + 1;
        mobs.push({
          id: i, x: mx, y: my,
          level: level, hp: 50 * level, maxHp: 50 * level,
          speed: 1 + Math.random() * 1.5,
          vx: Math.random() > 0.5 ? 1 : -1, vy: Math.random() > 0.5 ? 1 : -1
        });
      }
      gameState.current.monsters = mobs;
    };
    spawnMonsters();

    return () => window.removeEventListener('resize', handleOrientation);
  }, []);

  // VÒNG LẶP GAME CHÍNH (GAME LOOP)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const gameLoop = () => {
      const state = gameState.current;
      const p = state.player;
      const s = state.stats;

      // 1. DI CHUYỂN NHÂN VẬT
      let isMoving = false;

      // Ưu tiên Joystick (Mobile)
      if (joystick.current.dx !== 0 || joystick.current.dy !== 0) {
        p.x += joystick.current.dx * p.speed;
        p.y += joystick.current.dy * p.speed;
        p.dir = Math.atan2(joystick.current.dy, joystick.current.dx);
        p.target = null; 
        p.targetMonsterId = null;
        isMoving = true;
      } 
      // Click để di chuyển / Tấn công (PC)
      else {
        // Đuổi theo quái vật
        if (p.targetMonsterId !== null) {
          const targetMob = state.monsters.find(m => m.id === p.targetMonsterId);
          if (targetMob) {
            const dx = targetMob.x - p.x;
            const dy = targetMob.y - p.y;
            const dist = Math.hypot(dx, dy);
            
            // Xoay mặt về phía quái
            p.dir = Math.atan2(dy, dx);

            if (dist > 70) { // Nếu ở xa, chạy lại gần
              p.x += Math.cos(p.dir) * p.speed;
              p.y += Math.sin(p.dir) * p.speed;
              isMoving = true;
            } else { // Nếu đủ gần, Tự động chém
              if (!p.isAttacking && p.attackTimer === 0) {
                p.isAttacking = true;
              }
            }
          } else {
            p.targetMonsterId = null; // Quái chết hoặc mất tích
          }
        } 
        // Đi tới tọa độ chỉ định
        else if (p.target) {
          const dx = p.target.x - p.x;
          const dy = p.target.y - p.y;
          const dist = Math.hypot(dx, dy);

          if (dist > p.speed) {
            p.dir = Math.atan2(dy, dx);
            p.x += Math.cos(p.dir) * p.speed;
            p.y += Math.sin(p.dir) * p.speed;
            isMoving = true;
          } else {
            p.x = p.target.x;
            p.y = p.target.y;
            p.target = null; // Đến nơi
          }
        }
      }

      // Khóa nhân vật trong bản đồ
      p.x = Math.max(20, Math.min(MAP_SIZE - 20, p.x));
      p.y = Math.max(20, Math.min(MAP_SIZE - 20, p.y));

      // Camera bám theo mượt mà (Lerp)
      state.camera.x += (p.x - state.camera.x) * 0.1;
      state.camera.y += (p.y - state.camera.y) * 0.1;

      // 2. KHU VỰC TÔNG MÔN (Kiểm tra tương tác)
      const inCultivateZone = (p.x > 2200 && p.x < 2400 && p.y > 2300 && p.y < 2500);
      if (inCultivateZone) {
        if (Date.now() - state.lastCultivateTime > 10000) { 
          s.exp += 1;
          state.lastCultivateTime = Date.now();
          checkLevelUp();
        }
      } else {
        state.lastCultivateTime = Date.now(); 
      }

      const inKitchenZone = (p.x > 2600 && p.x < 2800 && p.y > 2600 && p.y < 2800);
      setCanCook(inKitchenZone && state.inv.meat > 0);

      // 3. XỬ LÝ QUÁI VẬT (AI)
      state.monsters.forEach(m => {
        if (Math.random() < 0.02) { m.vx = (Math.random() - 0.5) * 2; m.vy = (Math.random() - 0.5) * 2; }
        m.x += m.vx * m.speed; m.y += m.vy * m.speed;

        // Tránh Đại Trận Tông Môn
        const distToSect = Math.hypot(m.x - SECT_CENTER.x, m.y - SECT_CENTER.y);
        if (distToSect < SECT_RADIUS + 20) {
          m.vx = (m.x - SECT_CENTER.x) / distToSect;
          m.vy = (m.y - SECT_CENTER.y) / distToSect;
        }

        if (m.x < 0 || m.x > MAP_SIZE) m.vx *= -1;
        if (m.y < 0 || m.y > MAP_SIZE) m.vy *= -1;
      });

      // 4. XỬ LÝ ĐÁNH NHAU (Combat)
      if (p.isAttacking) {
        p.attackTimer++;
        if (p.attackTimer > 15) { p.isAttacking = false; p.attackTimer = 0; }
        
        // Gây sát thương
        if (p.attackTimer === 5) {
          state.monsters.forEach((m, idx) => {
            const dx = m.x - p.x; const dy = m.y - p.y;
            const dist = Math.hypot(dx, dy);
            
            // Góc chém (Hình quạt trước mặt)
            const angleToMob = Math.atan2(dy, dx);
            let angleDiff = angleToMob - p.dir;
            while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            if (dist < 85 && Math.abs(angleDiff) < Math.PI / 2.5) {
              m.hp -= s.attack;
              
              // Giật lùi quái
              m.x += Math.cos(angleToMob) * 15;
              m.y += Math.sin(angleToMob) * 15;

              if (m.hp <= 0) {
                // Rớt đồ
                state.drops.push({ id: Date.now()+idx, type: 'meat', x: m.x, y: m.y });
                if (Math.random() > 0.3) {
                  state.drops.push({ id: Date.now()+idx+1, type: 'pill', level: m.level, x: m.x + 20, y: m.y + 10 });
                }
                
                // Nếu quái này đang bị focus thì bỏ target
                if (p.targetMonsterId === m.id) p.targetMonsterId = null;

                // Hồi sinh quái
                m.hp = m.maxHp; m.level = Math.floor(Math.random()*5)+1;
                m.x = Math.random()*MAP_SIZE; m.y = Math.random()*MAP_SIZE;
                if (Math.hypot(m.x-SECT_CENTER.x, m.y-SECT_CENTER.y) < SECT_RADIUS) m.x += 1000;
              }
            }
          });
        }
      }

      // 5. NHẶT ĐỒ
      for (let i = state.drops.length - 1; i >= 0; i--) {
        const drop = state.drops[i];
        if (Math.hypot(p.x - drop.x, p.y - drop.y) < 40) {
          if (drop.type === 'meat') state.inv.meat += 1;
          if (drop.type === 'pill') state.inv.pills.push({ id: Date.now(), level: drop.level });
          state.drops.splice(i, 1);
        }
      }

      // Cập nhật UI 
      if (Math.random() < 0.1) {
        setHud({ hp: s.hp, maxHp: s.maxHp, exp: s.exp, realm: s.realm });
        setInventory({ ...state.inv });
      }

      // ==========================================
      // VẼ LÊN CANVAS (RENDERING)
      // ==========================================
      const w = canvas.width; const h = canvas.height;
      const camX = state.camera.x - w / 2;
      const camY = state.camera.y - h / 2;

      ctx.fillStyle = '#064e3b'; 
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(-camX, -camY);

      // Lưới mặt đất 
      ctx.strokeStyle = '#022c22'; ctx.lineWidth = 2;
      for (let x = 0; x <= MAP_SIZE; x += 200) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_SIZE); ctx.stroke(); }
      for (let y = 0; y <= MAP_SIZE; y += 200) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_SIZE, y); ctx.stroke(); }

      // VẼ TÔNG MÔN
      ctx.beginPath(); ctx.arc(SECT_CENTER.x, SECT_CENTER.y, SECT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.1)'; ctx.fill();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)'; ctx.lineWidth = 10; ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.fillRect(SECT_CENTER.x - 400, SECT_CENTER.y - 400, 800, 800);

      const drawBuilding = (bx, by, bw, bh, color, name, npcName = null) => {
        ctx.fillStyle = color; ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 4; ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = 'white'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
        ctx.fillText(name, bx + bw/2, by + bh/2);
        if (npcName) {
          ctx.fillStyle = '#fde047'; ctx.font = '16px Arial';
          ctx.fillText(`(NPC: ${npcName})`, bx + bw/2, by + bh/2 + 25);
        }
      };

      drawBuilding(2300, 2000, 400, 200, '#0f766e', 'CHÍNH ĐIỆN', 'Chưởng Môn Hoàng Long');
      drawBuilding(2200, 2300, 200, 200, '#8b5cf6', 'PHÒNG TU LUYỆN', null); 
      drawBuilding(2600, 2300, 200, 200, '#3b82f6', 'TÀNG KINH CÁC', 'Trưởng Lão Vô Danh');
      drawBuilding(2600, 2600, 200, 200, '#b45309', 'PHÒNG BẾP', 'Trương Hổ (Đầu Bếp)');
      drawBuilding(2200, 2600, 200, 200, '#4d7c0f', 'KHO ĐỒ', 'Đệ tử canh gác');

      // Vẽ hiệu ứng click chuột (Tròn nhấp nháy)
      if (state.clickMarker) {
        ctx.beginPath();
        ctx.arc(state.clickMarker.x, state.clickMarker.y, 15 - state.clickMarker.life * 10, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(6, 182, 212, ${state.clickMarker.life})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        state.clickMarker.life -= 0.05;
        if (state.clickMarker.life <= 0) state.clickMarker = null;
      }

      // VẼ VẬT PHẨM RỚT RA
      state.drops.forEach(d => {
        ctx.beginPath(); ctx.arc(d.x, d.y, 8, 0, Math.PI*2);
        ctx.fillStyle = d.type === 'meat' ? '#991b1b' : '#38bdf8'; 
        ctx.fill(); ctx.stroke();
      });

      // VẼ QUÁI VẬT
      state.monsters.forEach(m => {
        ctx.fillStyle = '#9f1239'; ctx.beginPath(); ctx.arc(m.x, m.y, 20, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = (p.targetMonsterId === m.id) ? '#fde047' : 'black'; // Viền vàng nếu đang bị focus
        ctx.lineWidth = (p.targetMonsterId === m.id) ? 4 : 2; 
        ctx.stroke();
        
        ctx.fillStyle = 'yellow';
        ctx.beginPath(); ctx.arc(m.x - 8, m.y - 5, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(m.x + 8, m.y - 5, 4, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = 'black'; ctx.fillRect(m.x - 20, m.y - 35, 40, 6);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(m.x - 20, m.y - 35, 40 * (m.hp/m.maxHp), 6);
        ctx.fillStyle = 'white'; ctx.font = '14px Arial'; ctx.textAlign = 'center';
        ctx.fillText(`Lv.${m.level}`, m.x, m.y - 40);
      });

      // VẼ NHÂN VẬT (MẶT NẠ)
      ctx.translate(p.x, p.y);
      ctx.rotate(p.dir);
      
      if (p.isAttacking) {
        ctx.beginPath(); ctx.arc(0, 0, 70, -Math.PI/3, Math.PI/3);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = 15; ctx.stroke();
      }

      ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(5, 0, 15, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(5, -15); ctx.lineTo(5, 15); ctx.stroke(); 
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(10, -5); ctx.stroke(); 
      ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(10, 5); ctx.stroke(); 
      
      ctx.rotate(-p.dir);
      ctx.translate(-p.x, -p.y);

      ctx.restore();
      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // XỬ LÝ SỰ KIỆN CLICK CHUỘT PHẢI (PC)
  const handleRightClick = (e) => {
    e.preventDefault(); // Chặn menu chuột phải mặc định của trình duyệt
    if (isTouchDevice || showInventory) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Tọa độ click trên màn hình
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const state = gameState.current;
    // Chuyển đổi thành tọa độ thế giới ảo
    const worldX = clickX + (state.camera.x - canvas.width / 2);
    const worldY = clickY + (state.camera.y - canvas.height / 2);

    let clickedMonster = null;
    
    // Kiểm tra xem có click trúng quái không
    for (const m of state.monsters) {
      if (Math.hypot(m.x - worldX, m.y - worldY) < 30) {
        clickedMonster = m;
        break;
      }
    }

    if (clickedMonster) {
      state.player.targetMonsterId = clickedMonster.id;
      state.player.target = null;
      // Hiệu ứng click vào quái (Màu đỏ)
      state.clickMarker = { x: clickedMonster.x, y: clickedMonster.y, life: 1, color: 'red' };
    } else {
      state.player.target = { x: worldX, y: worldY };
      state.player.targetMonsterId = null;
      // Hiệu ứng click xuống đất (Màu xanh)
      state.clickMarker = { x: worldX, y: worldY, life: 1, color: 'cyan' };
    }
  };

  // Logic hệ thống khác
  const checkLevelUp = () => {
    const s = gameState.current.stats;
    const currentRealmMaxExp = REALMS[s.realm].maxExp;
    if (s.exp >= currentRealmMaxExp && s.realm < REALMS.length - 1) {
      s.exp -= currentRealmMaxExp;
      s.realm++;
      s.maxHp += 50; s.hp = s.maxHp;
      s.attack += 10;
      setHud({ hp: s.hp, maxHp: s.maxHp, exp: s.exp, realm: s.realm });
    }
  };

  const attack = () => {
    if (!gameState.current.player.isAttacking) {
      gameState.current.player.isAttacking = true;
    }
  };

  const usePill = (index) => {
    const s = gameState.current.stats;
    const inv = gameState.current.inv;
    const pill = inv.pills[index];
    s.exp += pill.level * 10; 
    inv.pills.splice(index, 1);
    checkLevelUp();
    setInventory({ ...inv });
    setHud({ hp: s.hp, maxHp: s.maxHp, exp: s.exp, realm: s.realm });
  };

  const cookMeat = () => {
    const s = gameState.current.stats;
    const inv = gameState.current.inv;
    if (inv.meat > 0) {
      inv.meat -= 1;
      s.hp = Math.min(s.maxHp, s.hp + 30); 
      setInventory({ ...inv });
      setHud({ hp: s.hp, maxHp: s.maxHp, exp: s.exp, realm: s.realm });
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Joystick Events (Chỉ trên Mobile)
  const handleJoystickStart = (e) => {
    isDraggingJoystick.current = true;
    updateJoystick(e);
  };
  const handleJoystickMoveEvent = (e) => {
    if (!isDraggingJoystick.current) return;
    updateJoystick(e);
  };
  const handleJoystickEnd = () => {
    isDraggingJoystick.current = false;
    setKnobPosition({ x: 0, y: 0 }); 
    joystick.current = { dx: 0, dy: 0 };
  };

  const updateJoystick = (e) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const dist = Math.hypot(dx, dy);
    
    const maxRadius = (rect.width / 2) - 20;
    let knobX = dx; let knobY = dy;
    if (dist > maxRadius) {
      knobX = (dx / dist) * maxRadius;
      knobY = (dy / dist) * maxRadius;
    }

    setKnobPosition({ x: knobX, y: knobY });

    if (dist > 5) {
      joystick.current = { dx: dx / dist, dy: dy / dist };
    } else {
      joystick.current = { dx: 0, dy: 0 };
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-black relative select-none touch-none">
      
      {/* CẢNH BÁO YÊU CẦU XOAY NGANG (MOBILE) */}
      {isTouchDevice && isPortrait && (
        <div className="absolute inset-0 bg-slate-900 z-[100] flex flex-col items-center justify-center p-6 text-center">
          <RotateCcw size={64} className="text-cyan-400 mb-6 animate-[spin_3s_linear_infinite]" />
          <h2 className="text-2xl font-bold text-white mb-2">Vui Lòng Xoay Ngang</h2>
          <p className="text-slate-400">Hãy xoay ngang điện thoại của bạn để trải nghiệm thế giới Tiên Nghịch tốt nhất!</p>
        </div>
      )}

      {/* Gắn sự kiện Chuột Phải vào Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 block cursor-crosshair" 
        onContextMenu={handleRightClick}
      />

      {/* TÚI ĐỒ (Inventory Modal) */}
      {showInventory && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowInventory(false)}>
          <div className="bg-slate-800 border-2 border-amber-600/50 p-6 rounded-xl w-full max-w-2xl shadow-[0_0_40px_rgba(245,158,11,0.15)]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-4">
              <h2 className="text-2xl font-bold text-amber-400 flex items-center gap-2"><Backpack /> Túi Trữ Vật</h2>
              <button onClick={() => setShowInventory(false)} className="text-slate-400 hover:text-red-400 transition-colors"><X size={28} /></button>
            </div>
            
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 h-[400px] overflow-y-auto">
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-3 content-start">
                {Array.from({ length: 48 }).map((_, index) => {
                  let item = null;
                  let isMeatSlot = false;
                  let pillIndex = -1;
                  const hasMeat = inventory.meat > 0;
                  
                  if (hasMeat && index === 0) isMeatSlot = true;
                  else {
                    pillIndex = hasMeat ? index - 1 : index;
                    if (pillIndex < inventory.pills.length) item = inventory.pills[pillIndex];
                  }

                  if (isMeatSlot) {
                    return (
                      <div key={`slot-${index}`} className="aspect-square bg-slate-800/80 border-2 border-slate-600 rounded-lg flex flex-col items-center justify-center relative group hover:border-red-500 transition-colors shadow-inner cursor-help">
                        <Utensils className="text-red-500 w-8 h-8 group-hover:scale-110 transition-transform" />
                        <span className="absolute bottom-1 right-1 bg-red-900 text-white text-[10px] font-bold px-1.5 rounded-sm">x{inventory.meat}</span>
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">Thịt Yêu Thú</div>
                      </div>
                    );
                  }

                  if (item) {
                    return (
                      <button 
                        key={`slot-${index}`} 
                        onClick={() => usePill(pillIndex)} 
                        className="aspect-square bg-slate-800/80 border-2 border-slate-600 hover:border-cyan-400 rounded-lg flex flex-col items-center justify-center relative group transition-colors shadow-inner"
                      >
                        <div className="w-6 h-6 rounded-full bg-cyan-400 mb-1 shadow-[0_0_12px_cyan] group-hover:scale-110 transition-transform"></div>
                        <span className="text-[10px] text-cyan-200 font-bold">Lv.{item.level}</span>
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">Bấm để dùng</div>
                      </button>
                    );
                  }

                  return <div key={`slot-${index}`} className="aspect-square bg-slate-800/40 border-2 border-slate-700/50 rounded-lg shadow-inner"></div>;
                })}
              </div>
            </div>
            
            <div className="mt-4 text-sm text-slate-400 flex justify-between">
              <span>* Bấm vào Đan dược để sử dụng.</span>
              <span>* Mang thịt đến Phòng Bếp để nấu.</span>
            </div>
          </div>
        </div>
      )}

      {/* HUD GÓC TRÁI TRÊN (Thông tin nhân vật) */}
      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur border border-slate-600 p-3 rounded-xl pointer-events-none z-10 flex gap-3">
        <div className="w-12 h-12 bg-slate-800 rounded-full border-2 border-amber-500 flex items-center justify-center overflow-hidden">
           <div className="w-8 h-8 bg-white rounded-full relative">
             <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-red-600 -translate-x-1/2"></div>
             <div className="absolute left-1 top-2 w-2 h-1 bg-black rotate-45"></div>
             <div className="absolute right-1 top-2 w-2 h-1 bg-black -rotate-45"></div>
           </div>
        </div>
        <div className="flex flex-col justify-center">
          <div className="text-amber-400 font-bold leading-tight">{playerName}</div>
          <div className="text-cyan-300 text-xs font-bold mb-1">{REALMS[hud.realm]?.name}</div>
          
          <div className="w-32 h-2 bg-slate-950 rounded-full overflow-hidden mb-1 border border-slate-700">
            <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(hud.hp/hud.maxHp)*100}%` }}></div>
          </div>
          
          <div className="w-32 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-700 relative">
            <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${(hud.exp/REALMS[hud.realm]?.maxExp)*100}%` }}></div>
            <span className="absolute inset-0 text-[8px] text-center font-mono font-bold leading-[8px] mix-blend-difference text-white">{hud.exp}/{REALMS[hud.realm]?.maxExp}</span>
          </div>
        </div>
      </div>

      {/* NÚT TÚI ĐỒ */}
      <button 
        onClick={() => setShowInventory(true)}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-800/80 p-3 rounded-xl border border-amber-600/50 shadow-lg text-amber-500 active:scale-95 z-20"
      >
        <Backpack size={28} />
      </button>

      {/* CẢNH BÁO NẤU ẨN */}
      {canCook && (
        <button 
          onClick={cookMeat}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-8 rounded-full border-2 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)] z-20 animate-bounce flex gap-2 items-center"
        >
          <Utensils /> Nấu Thịt (+30 Máu)
        </button>
      )}

      {/* JOYSTICK ĐIỀU KHIỂN (Chỉ hiện trên thiết bị cảm ứng khi xoay ngang) */}
      {isTouchDevice && !isPortrait && (
        <div 
          ref={joystickRef}
          className="absolute bottom-8 left-8 w-32 h-32 bg-slate-800/50 rounded-full border-2 border-cyan-500/40 z-20 flex items-center justify-center touch-none shadow-[0_0_20px_rgba(0,0,0,0.5)]"
          onPointerDown={handleJoystickStart}
          onPointerMove={handleJoystickMoveEvent}
          onPointerUp={handleJoystickEnd}
          onPointerCancel={handleJoystickEnd}
          onPointerLeave={handleJoystickEnd}
        >
          <div 
            className="w-12 h-12 bg-cyan-400/90 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.8)] pointer-events-none transition-transform duration-75"
            style={{ transform: `translate(${knobPos.x}px, ${knobPos.y}px)` }}
          ></div>
        </div>
      )}

      {/* NÚT ĐÁNH (Chỉ hiện trên thiết bị cảm ứng khi xoay ngang) */}
      {isTouchDevice && !isPortrait && (
        <button 
          className="absolute bottom-8 right-8 w-24 h-24 bg-red-900/80 rounded-full border-4 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center justify-center z-20 active:scale-90 active:bg-red-600 transition-transform touch-none"
          onPointerDown={(e) => { e.preventDefault(); attack(); }}
        >
          <Sword size={40} className="text-white pointer-events-none" />
        </button>
      )}

    </div>
  );
}