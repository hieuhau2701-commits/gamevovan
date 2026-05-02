import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { 
  LogIn, UserPlus, LogOut, AlertCircle, CheckCircle2, ShieldCheck, 
  Eye, EyeOff, Gamepad2, Headset, Trophy, Ghost, Crosshair, Swords, Cpu, 
  Zap, Radio, Target, ZapOff, Joystick, Mouse, Keyboard, Monitor, Crown, Star, Flame, Rocket, Dices
} from 'lucide-react';

// Khởi tạo Firebase
const firebaseConfig = { 
  apiKey : "AIzaSyDoxdyILuvzgzliK1i4PMqF319ihs186v8" , 
  authDomain : "gamevuive-c91ca.firebaseapp.com" , 
  projectId : "gamevuive-c91ca" , 
  storageBucket : "gamevuive-c91ca.firebasestorage.app" , 
  messagingSenderId : "1065436626458" , 
  appId : "1:1065436626458:web:ce31cb3434189abeba5ba3" , 
  measurementId : "G-1QP447DWSP" 
};

// Danh sách các icon gaming
const GAMING_ICONS = [
  Gamepad2, Joystick, Mouse, Keyboard, Monitor, Headset, Trophy, Swords, 
  Crown, Star, Flame, Rocket, Dices, Ghost, Target, Zap, Cpu
];

// Danh sách các hiệu ứng hover cho các "nút" icon
const HOVER_BUTTON_EFFECTS = [
  "hover:bg-blue-500/40 hover:border-white/60 hover:shadow-[0_0_30px_rgba(59,130,246,0.9)] hover:text-white hover:-translate-y-3",
  "hover:bg-fuchsia-500/40 hover:border-white/60 hover:shadow-[0_0_30px_rgba(217,70,239,0.9)] hover:text-white hover:scale-110",
  "hover:bg-cyan-400/40 hover:border-white/60 hover:shadow-[0_0_30px_rgba(34,211,238,0.9)] hover:text-white hover:rotate-12",
  "hover:bg-yellow-400/40 hover:border-white/60 hover:shadow-[0_0_30px_rgba(250,204,21,0.9)] hover:text-white hover:-rotate-12",
  "hover:bg-purple-500/40 hover:border-white/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.9)] hover:text-white hover:scale-125",
  "hover:bg-pink-500/40 hover:border-white/60 hover:shadow-[0_0_30px_rgba(236,72,153,0.9)] hover:text-white hover:translate-x-3",
];

// Bảng màu cho các vì sao
const STAR_COLORS = ['#ffffff', '#fdf4ff', '#e0e7ff', '#cffafe', '#fae8ff'];

// Component: Biểu tượng có thể kéo thả
const DraggableParticle = ({ particle }) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      className="absolute touch-none cursor-grab active:cursor-grabbing"
      style={{
        top: particle.top,
        left: particle.left,
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        zIndex: isDragging ? 50 : 10,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div 
        className={`flex items-center justify-center 
          bg-white/10 border border-white/20 backdrop-blur-xl rounded-2xl 
          text-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.4)] 
          transition-all duration-300
          ${isDragging ? 'scale-125 shadow-[0_0_50px_rgba(255,255,255,0.6)] border-white bg-white/30 text-white' : particle.hoverEffect} 
          ${!isDragging ? 'animate-float-smooth' : ''} p-3 md:p-4`}
        style={{ 
          animationDelay: particle.delay,
          animationDuration: particle.duration,
        }}
      >
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-2xl pointer-events-none"></div>
        <particle.Icon size={particle.size} strokeWidth={1.5} className="drop-shadow-[0_0_12px_rgba(255,255,255,0.6)] pointer-events-none" />
      </div>
    </div>
  );
};

export default function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Tạo dữ liệu cho các Vì sao (Stars) đa sắc
  const stars = useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.8 + 0.2,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 4 + 2}s`,
    }));
  }, []);

  // Tạo dữ liệu các nút icon ngẫu nhiên trôi nổi TOÀN MÀN HÌNH
  const particles = useMemo(() => {
    const cols = 6;
    const rows = 5;
    const items = [];
    
    for (let i = 0; i < cols * rows; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cellWidth = 100 / cols;
      const cellHeight = 100 / rows;

      const left = (col * cellWidth) + (Math.random() * (cellWidth * 0.8));
      const top = (row * cellHeight) + (Math.random() * (cellHeight * 0.8));

      items.push({
        id: i,
        Icon: GAMING_ICONS[Math.floor(Math.random() * GAMING_ICONS.length)],
        top: `${top}%`,
        left: `${left}%`,
        size: Math.floor(Math.random() * (36 - 22 + 1)) + 22,
        delay: `${Math.random() * 5}s`,
        duration: `${10 + Math.random() * 12}s`,
        hoverEffect: HOVER_BUTTON_EFFECTS[Math.floor(Math.random() * HOVER_BUTTON_EFFECTS.length)]
      });
    }
    return items;
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ thông tin.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        setSuccess('Đăng ký thành công! Vui lòng kiểm tra Gmail.');
        await signOut(auth);
        setIsLogin(true);
      }
    } catch (err) {
      setError('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!isFirebaseConfigured) { setUser(null); return; }
    await signOut(auth);
  };

  // MÀN HÌNH SAU KHI ĐĂNG NHẬP
  if (user) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,#030014,#140529,#09122c,#1a0b2e)] bg-[length:400%_400%] animate-gradient-bg pointer-events-none"></div>
        <div className="bg-white p-10 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] max-w-md w-full text-center space-y-6 relative z-10 border border-gray-100">
          <div className="mx-auto bg-green-100 text-green-600 w-20 h-20 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck size={44} />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase italic">HỆ THỐNG MỞ</h2>
          <div className="bg-gray-50 p-5 rounded-2xl text-left border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">User Identity</p>
            <p className="font-bold text-gray-800 break-all">{user.email}</p>
          </div>
          <button onClick={handleSignOut} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95">
            THOÁT RA
          </button>
        </div>
      </div>
    );
  }

  // MÀN HÌNH ĐĂNG NHẬP (GALAXY BACKGROUND NHIỀU MÀU PHÁT SÁNG & CENTERED FORM)
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030014] relative overflow-hidden font-sans p-4">
      
      {/* --- HIỆU ỨNG DẢI NGÂN HÀ (MULTI-COLOR GALAXY BACKGROUND) --- */}
      {/* Nền Gradient Động Phức Hợp */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,#030014,#1a0b2e,#0a1930,#1e0b24)] bg-[length:400%_400%] animate-gradient-bg pointer-events-none"></div>

      {/* Các Vì Sao Lấp Lánh Đa Sắc */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((star) => (
          <div 
            key={`star-${star.id}`}
            className="absolute rounded-full animate-twinkle"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              backgroundColor: star.color,
              boxShadow: `0 0 ${star.size * 3}px ${star.color}`,
              animationDelay: star.delay,
              animationDuration: star.duration
            }}
          />
        ))}
      </div>

      {/* --- TINH VÂN (GLOW ORBS) PHÁT SÁNG NHIỀU MÀU --- */}
      {/* Góc trên trái: Màu Fuchsia (Hồng Tím) kết hợp Blue */}
      <div className="absolute top-[-10%] left-[-10%] w-[55vw] h-[55vw] bg-fuchsia-600/30 blur-[130px] rounded-full pointer-events-none animate-pulse mix-blend-screen" style={{ animationDuration: '8s' }}></div>
      <div className="absolute top-[5%] left-[5%] w-[35vw] h-[35vw] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none mix-blend-screen"></div>

      {/* Góc dưới phải: Màu Cyan (Xanh Lục Lam) & Purple */}
      <div className="absolute bottom-[-15%] right-[-10%] w-[65vw] h-[65vw] bg-cyan-600/20 blur-[140px] rounded-full pointer-events-none animate-pulse mix-blend-screen" style={{ animationDuration: '12s', animationDelay: '1s' }}></div>
      <div className="absolute bottom-[10%] right-[5%] w-[45vw] h-[45vw] bg-purple-600/30 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>

      {/* Trung tâm lan toả: Màu Pink (Hồng Nhạt) & Deep Blue */}
      <div className="absolute top-[30%] left-[30%] w-[40vw] h-[40vw] bg-pink-500/15 blur-[150px] rounded-full pointer-events-none animate-pulse mix-blend-screen" style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
      <div className="absolute top-[20%] right-[20%] w-[30vw] h-[30vw] bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none animate-spin-extremely-slow origin-bottom-left mix-blend-screen"></div>
      
      {/* --- ICONS KÉO THẢ TRÔI NỔI KHẮP GALAXY --- */}
      <div className="absolute inset-0 z-10 overflow-hidden">
        {particles.map((particle) => (
          <DraggableParticle key={particle.id} particle={particle} />
        ))}
      </div>

      {/* --- Ô ĐĂNG NHẬP Ở TRUNG TÂM (TRẮNG ĐẶC, KHÔNG BỊ ÁM MÀU NỀN) --- */}
      <div className="w-full max-w-md relative z-20">
        <div className="bg-white rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.9),0_0_40px_rgba(192,132,252,0.3)] w-full flex flex-col justify-center transition-all border border-gray-100 py-12 relative overflow-hidden">
          
          <div className="px-8 lg:px-14 pb-6 relative z-10">
            {error && (
              <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl text-xs flex items-center gap-3 border border-red-100 shadow-sm animate-shake font-bold">
                <ZapOff size={20} className="shrink-0" />
                <span className="uppercase tracking-tight">{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-8 p-4 bg-green-50 text-green-700 rounded-2xl text-xs flex items-center gap-3 border border-green-100 shadow-sm font-bold">
                <CheckCircle2 size={20} className="shrink-0" />
                <span className="uppercase tracking-tight">{success}</span>
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-10 mt-4">
              {/* GMAIL Input */}
              <div className="relative group/input">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  className="peer w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-purple-500 outline-none transition-all text-sm font-bold shadow-inner"
                  required
                />
                <label
                  htmlFor="email"
                  className="absolute left-6 top-4 text-gray-400 pointer-events-none transition-all duration-300 text-sm
                  peer-focus:-translate-y-[28px] peer-focus:scale-90 peer-focus:text-purple-600 peer-focus:font-black peer-focus:px-2 peer-focus:bg-white
                  peer-[:not(:placeholder-shown)]:-translate-y-[28px] peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:text-purple-600 peer-[:not(:placeholder-shown)]:font-black peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:bg-white"
                >
                  GMAIL
                </label>
              </div>

              {/* PASS Input */}
              <div className="relative group/input">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  className="peer w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-purple-500 outline-none transition-all text-sm font-bold shadow-inner pr-16"
                  required
                />
                <label
                  htmlFor="password"
                  className="absolute left-6 top-4 text-gray-400 pointer-events-none transition-all duration-300 text-sm
                  peer-focus:-translate-y-[28px] peer-focus:scale-90 peer-focus:text-purple-600 peer-focus:font-black peer-focus:px-2 peer-focus:font-black peer-focus:bg-white
                  peer-[:not(:placeholder-shown)]:-translate-y-[28px] peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:text-purple-600 peer-[:not(:placeholder-shown)]:font-black peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:bg-white"
                >
                  PASS
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-6 flex items-center text-gray-400 hover:text-purple-600 transition-colors z-10"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white rounded-[1.5rem] font-black text-xl shadow-[0_15px_40px_rgba(147,51,234,0.4)] hover:shadow-[0_20px_50px_rgba(147,51,234,0.6)] hover:-translate-y-1 transition-all active:translate-y-0 disabled:opacity-70 overflow-hidden relative group/btn bg-[length:200%_auto] hover:bg-right"
              >
                {loading ? (
                  <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : isLogin ? (
                  <><LogIn size={24} /> ĐĂNG NHẬP</>
                ) : (
                  <><UserPlus size={24} /> TẠO TÀI KHOẢN</>
                )}
              </button>
            </form>

            <div className="mt-12 text-center">
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
                className="text-purple-600 hover:text-purple-700 border-b-2 border-purple-600/30 hover:border-purple-600 transition-all pb-1 tracking-widest font-black text-[11px] uppercase"
              >
                {isLogin ? 'BẮT ĐẦU ĐĂNG KÝ' : 'QUAY LẠI ĐĂNG NHẬP'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- CUSTOM ANIMATIONS --- */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-smooth {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -20px) rotate(3deg); }
          66% { transform: translate(-10px, -45px) rotate(-3deg); }
        }
        .animate-float-smooth {
          animation: float-smooth 15s ease-in-out infinite;
        }
        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-bg {
          animation: gradientBG 20s ease infinite;
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .animate-twinkle {
          animation: twinkle ease-in-out infinite;
        }
        @keyframes spin-extremely-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-extremely-slow {
          animation: spin-extremely-slow 40s linear infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}} />
    </div>
  );
}