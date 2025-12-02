import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc,
  serverTimestamp,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  Heart, 
  Gift, 
  PenTool, 
  Settings, 
  Copy, 
  Share2, 
  LogOut, 
  Image as ImageIcon,
  Sparkles,
  X
} from 'lucide-react';

// --- 类型定义 ---
declare global {
  interface Window {
    __firebase_config?: string;
    __app_id?: string;
    __initial_auth_token?: string;
  }
}

// --- Firebase 初始化 ---
// ⚠️ 请确保这里使用的是你自己的真实 Firebase 配置
// 如果你是本地开发，请替换下面的 JSON.parse(...) 为你的 const firebaseConfig = { ... }
const firebaseConfig = {
  apiKey: "AIzaSyC5t8hp1g1Ci8HYu1zpxkfNHntb78brOzM",
  authDomain: "love-app-c3978.firebaseapp.com",
  projectId: "love-app-c3978",
  storageBucket: "love-app-c3978.firebasestorage.app",
  messagingSenderId: "531336938828",
  appId: "1:531336938828:web:e3c1fc077b95fa22313be9",
  measurementId: "G-7EQFQDGNVC"
};
const appId = window.__app_id || 'love-space-v2';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 接口定义 ---
interface Memorial {
  id: string;
  coupleId: string;
  title: string;
  date: string; 
  createdAt: any;
}

interface DiaryEntry {
  id: string;
  coupleId: string;
  text: string;
  mood: string;
  authorName: string;
  createdAt: any;
}

interface CoupleSettings {
  startDate: string; 
  names: string;
  bgImage?: string; // 新增：背景图 URL
}

// --- 组件: 登录/配对界面 ---
const LoginScreen = ({ onJoin, onCreate }: { onJoin: (id: string, name: string) => void, onCreate: (name: string) => void }) => {
  const [mode, setMode] = useState<'welcome' | 'join' | 'create'>('welcome');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  if (mode === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-rose-50 to-white flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-white/80 backdrop-blur-xl rounded-full flex items-center justify-center mb-8 shadow-xl shadow-pink-200/50 animate-bounce-slow">
          <Heart className="w-12 h-12 text-pink-500 fill-pink-500 drop-shadow-md" />
        </div>
        <h1 className="text-4xl font-black text-gray-800 mb-3 tracking-tight">Love Space</h1>
        <p className="text-gray-500 mb-12 font-medium">记录爱的每一种形状</p>
        
        <div className="space-y-4 w-full max-w-xs">
          <button onClick={() => setMode('create')} className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all duration-200">
            创建新空间
          </button>
          <button onClick={() => setMode('join')} className="w-full bg-white text-gray-800 font-bold py-4 rounded-2xl shadow-md border border-gray-100 active:scale-95 transition-all duration-200">
            我有邀请码
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8 flex flex-col">
      <button onClick={() => setMode('welcome')} className="text-gray-400 mb-8 self-start hover:text-gray-600 transition-colors">← 返回</button>
      <h2 className="text-3xl font-bold mb-2 text-gray-800">{mode === 'create' ? '创建爱的小屋' : '加入另一半'}</h2>
      <p className="text-gray-400 text-sm mb-10">{mode === 'create' ? '设置一个昵称，开启旅程' : '输入对方分享给你的配对码'}</p>
      
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">你的昵称</label>
          <input 
            type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:ring-2 focus:ring-pink-300 outline-none transition-all text-lg"
            placeholder="例如: 猪猪"
          />
        </div>

        {mode === 'join' && (
           <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">配对码</label>
            <input 
              type="text" value={code} onChange={e => setCode(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:ring-2 focus:ring-pink-300 outline-none font-mono tracking-widest text-lg"
              placeholder="CODE"
            />
          </div>
        )}

        <button 
          onClick={() => mode === 'create' ? onCreate(name) : onJoin(code, name)}
          disabled={!name || (mode === 'join' && !code)}
          className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-pink-200 mt-4 disabled:opacity-50 active:scale-95 transition-all"
        >
          {mode === 'create' ? '✨ 开始创建' : '🚀 立即加入'}
        </button>
      </div>
    </div>
  );
};

// --- 主应用 ---
export default function CoupleApp() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'home' | 'memorials' | 'diary' | 'settings'>('home');
  
  // 核心数据
  const [coupleId, setCoupleId] = useState<string>('');
  const [userName, setUserName] = useState('');
  const [isEntered, setIsEntered] = useState(false);
  
  // 数据列表
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [settings, setSettings] = useState<CoupleSettings>({ startDate: new Date().toISOString().split('T')[0], names: '我们' });
  // 设置文档的 ID，用于更新
  const [settingsDocId, setSettingsDocId] = useState<string>('');

  // 弹窗
  const [showAddMem, setShowAddMem] = useState(false);
  const [newMemTitle, setNewMemTitle] = useState('');
  const [newMemDate, setNewMemDate] = useState('');

  // 1. 认证初始化
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) {
           await signInWithCustomToken(auth, window.__initial_auth_token);
        } else {
           await signInAnonymously(auth);
        }
      } catch (error) { console.error(error); }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // 2. 自动登录检查
  useEffect(() => {
    const savedId = localStorage.getItem('ls_couple_id');
    const savedName = localStorage.getItem('ls_user_name');
    if (savedId && savedName) {
      setCoupleId(savedId);
      setUserName(savedName);
      setIsEntered(true);
    }
  }, []);

  // 3. 数据同步监听
  useEffect(() => {
    if (!user || !isEntered || !coupleId) return;

    // 监听纪念日
    const unsubMem = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'love_memorials'), (snap) => {
      const list: Memorial[] = [];
      snap.forEach(d => { if (d.data().coupleId === coupleId) list.push({ id: d.id, ...d.data() } as Memorial); });
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setMemorials(list);
    });

    // 监听日记
    const unsubDiary = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'love_diaries'), (snap) => {
      const list: DiaryEntry[] = [];
      snap.forEach(d => { if (d.data().coupleId === coupleId) list.push({ id: d.id, ...d.data() } as DiaryEntry); });
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setDiaries(list);
    });

    // 监听设置
    const unsubSet = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'love_settings'), (snap) => {
        snap.forEach(d => { 
          if (d.data().coupleId === coupleId) {
            setSettings(d.data() as CoupleSettings);
            setSettingsDocId(d.id);
          }
        });
    });

    return () => { unsubMem(); unsubDiary(); unsubSet(); };
  }, [user, isEntered, coupleId]);

  // --- 逻辑处理 ---
  
  const handleCreate = (name: string) => {
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    enterSpace(newId, name);
    addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'love_settings'), {
      coupleId: newId, startDate: new Date().toISOString().split('T')[0], names: '我们'
    });
  };

  const handleJoin = (id: string, name: string) => {
    enterSpace(id.toUpperCase(), name);
  };

  const enterSpace = (id: string, name: string) => {
    setCoupleId(id);
    setUserName(name);
    setIsEntered(true);
    localStorage.setItem('ls_couple_id', id);
    localStorage.setItem('ls_user_name', name);
  };

  const handleLogout = () => {
    if(confirm("确定退出登录吗？")) {
      localStorage.removeItem('ls_couple_id');
      setIsEntered(false);
      setCoupleId('');
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(coupleId);
    alert(`配对码 ${coupleId} 已复制！快发给你的另一半吧 ❤️`);
  };

  const addMemorial = async () => {
    if (!newMemTitle || !newMemDate) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'love_memorials'), {
      coupleId, title: newMemTitle, date: newMemDate, createdAt: serverTimestamp()
    });
    setShowAddMem(false); setNewMemTitle(''); setNewMemDate('');
  };

  const deleteMemorial = async (id: string) => {
    if(confirm("确认删除？")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'love_memorials', id));
    }
  };

  const addDiary = async () => {
    const text = prompt("今天发生了什么有趣的事？");
    if(text) {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'love_diaries'), {
        coupleId, text, mood: '🥰', authorName: userName, createdAt: serverTimestamp()
      });
    }
  };

  const updateSettings = async (newNames: string, newDate: string, newBg: string) => {
    if (!settingsDocId) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'love_settings', settingsDocId), {
      names: newNames,
      startDate: newDate,
      bgImage: newBg
    });
    alert("设置已更新！");
  };

  const daysTogether = useMemo(() => {
    const start = new Date(settings.startDate);
    const now = new Date();
    return Math.floor(Math.abs(now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [settings.startDate]);

  // --- 渲染 ---

  if (!isEntered) return <LoginScreen onJoin={handleJoin} onCreate={handleCreate} />;

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative shadow-2xl font-sans text-gray-800 overflow-hidden flex flex-col">
      
      {/* 背景图层 */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700"
        style={{ 
          backgroundImage: settings.bgImage ? `url(${settings.bgImage})` : 'linear-gradient(to bottom right, #fce7f3, #ffffff)',
          filter: 'brightness(0.95)'
        }}
      />
      {/* 毛玻璃遮罩 (让背景不干扰文字) */}
      <div className={`absolute inset-0 z-0 ${settings.bgImage ? 'bg-white/60 backdrop-blur-md' : ''}`}></div>

      {/* 顶部导航 */}
      <div className="relative z-10 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <div className="bg-white/80 p-2 rounded-full shadow-sm backdrop-blur-sm"><Heart size={16} className="text-pink-500 fill-pink-500" /></div>
            <span className="font-bold text-gray-800 text-lg drop-shadow-sm">{settings.names}</span>
        </div>
        <div className="flex gap-2">
            <button onClick={copyInviteCode} className="p-2 bg-white/50 backdrop-blur-md rounded-full text-gray-700 hover:bg-white transition"><Share2 size={18} /></button>
            <button onClick={() => setView('settings')} className="p-2 bg-white/50 backdrop-blur-md rounded-full text-gray-700 hover:bg-white transition"><Settings size={18} /></button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-6 pb-24 scrollbar-hide">
        
        {view === 'home' && (
          <div className="animate-fade-in">
            {/* 计数大卡片 */}
            <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-8 text-center shadow-xl border border-white/50 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <p className="text-gray-600 text-xs font-bold mb-2 uppercase tracking-[0.2em]">Being In Love</p>
                <h1 className="text-7xl font-black tracking-tighter text-gray-800 mb-1 drop-shadow-sm">{daysTogether}</h1>
                <p className="text-gray-500 text-sm font-medium">Days</p>
                <div className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 bg-white/60 rounded-full text-xs font-bold text-gray-500 shadow-sm">
                   <Sparkles size={12} className="text-yellow-500" /> 
                   Since {settings.startDate}
                </div>
            </div>

            {/* 功能入口 */}
            <div className="grid grid-cols-2 gap-4 mt-6">
               <button onClick={() => setView('memorials')} className="bg-white/60 backdrop-blur-lg p-6 rounded-3xl shadow-sm border border-white/40 flex flex-col items-center gap-3 hover:scale-[1.02] transition-transform active:scale-95">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-500 shadow-inner">
                    <Gift size={24} />
                  </div>
                  <span className="font-bold text-gray-700">纪念日</span>
               </button>
               <button onClick={() => setView('diary')} className="bg-white/60 backdrop-blur-lg p-6 rounded-3xl shadow-sm border border-white/40 flex flex-col items-center gap-3 hover:scale-[1.02] transition-transform active:scale-95">
                  <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-500 shadow-inner">
                    <PenTool size={24} />
                  </div>
                  <span className="font-bold text-gray-700">日记本</span>
               </button>
            </div>
            
            {/* 邀请码小条 */}
            <div onClick={copyInviteCode} className="mt-6 bg-gray-900/5 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between cursor-pointer active:bg-gray-900/10 transition">
              <div className="flex items-center gap-3">
                 <div className="bg-white p-2 rounded-lg shadow-sm"><Copy size={14} /></div>
                 <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">配对码</p>
                    <p className="font-mono font-bold text-gray-800">{coupleId}</p>
                 </div>
              </div>
              <span className="text-xs font-bold text-pink-500">点击复制</span>
            </div>
          </div>
        )}

        {view === 'memorials' && (
           <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center mb-2">
                  <h2 className="text-2xl font-bold text-gray-800">重要日子</h2>
                  <button onClick={() => setShowAddMem(true)} className="text-sm bg-gray-800 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-gray-300/50 active:scale-95 transition">+ 新建</button>
              </div>
              {memorials.length === 0 && <div className="text-center py-10 text-gray-400 font-medium">还没有纪念日，去添加一个吧~</div>}
              {memorials.map(m => {
                  const days = Math.ceil((new Date(m.date).getTime() - new Date().setHours(0,0,0,0)) / 86400000);
                  const isFuture = days > 0;
                  return (
                    <div key={m.id} className="group relative bg-white/70 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-white/50 flex justify-between items-center overflow-hidden">
                        <div className={`absolute left-0 top-0 bottom-0 w-2 ${isFuture ? 'bg-blue-400' : 'bg-pink-400'}`}></div>
                        <div className="pl-3">
                            <h3 className="font-bold text-gray-800 text-lg">{m.title}</h3>
                            <p className="text-xs font-medium text-gray-400 mt-1">{m.date}</p>
                        </div>
                        <div className="text-right">
                            <span className={`text-3xl font-black ${isFuture ? 'text-blue-500' : 'text-pink-500'}`}>{Math.abs(days)}</span>
                            <span className="text-xs font-bold text-gray-400 ml-1 block">{isFuture ? '天后' : '天已过'}</span>
                        </div>
                        <button onClick={() => deleteMemorial(m.id)} className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                    </div>
                  );
              })}
           </div>
        )}

        {view === 'diary' && (
            <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-2xl font-bold text-gray-800">交换日记</h2>
                  <button onClick={addDiary} className="text-sm bg-pink-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-pink-200 active:scale-95 transition">写日记</button>
              </div>
              {diaries.length === 0 && <div className="text-center py-10 text-gray-400 font-medium">这里空空的，记录下今天的心情吧</div>}
              {diaries.map(d => (
                  <div key={d.id} className="bg-white/80 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-white/50">
                      <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">{d.mood}</span>
                          <span className="font-bold text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">{d.authorName}</span>
                          <span className="text-xs font-medium text-gray-300 ml-auto">{d.createdAt?.toDate().toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed font-medium">{d.text}</p>
                  </div>
              ))}
            </div>
        )}

        {view === 'settings' && (
          <div className="space-y-6 animate-fade-in">
             <h2 className="text-2xl font-bold text-gray-800">设置</h2>
             <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/50 space-y-4">
                <div>
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-2">我们的称呼</label>
                   <input className="w-full bg-white/50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-pink-300" 
                          defaultValue={settings.names} id="set-names" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-2">在一起的日子</label>
                   <input className="w-full bg-white/50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-pink-300" 
                          type="date" defaultValue={settings.startDate} id="set-date" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                     <ImageIcon size={12}/> 背景图片链接 (URL)
                   </label>
                   <input className="w-full bg-white/50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-pink-300 text-xs" 
                          placeholder="粘贴图片地址，如 https://..." defaultValue={settings.bgImage} id="set-bg" />
                   <p className="text-[10px] text-gray-400 mt-1">提示：可以在网上找张图复制链接，或者用图床</p>
                </div>
                <button 
                  onClick={() => {
                    const n = (document.getElementById('set-names') as HTMLInputElement).value;
                    const d = (document.getElementById('set-date') as HTMLInputElement).value;
                    const b = (document.getElementById('set-bg') as HTMLInputElement).value;
                    updateSettings(n, d, b);
                  }}
                  className="w-full bg-gray-800 text-white font-bold py-3 rounded-xl mt-2 active:scale-95 transition"
                >
                  保存设置
                </button>
             </div>
             
             <button onClick={handleLogout} className="w-full py-4 text-red-400 font-bold text-sm hover:bg-red-50 rounded-2xl transition">
                <LogOut size={16} className="inline mr-1" /> 退出登录
             </button>
          </div>
        )}

      </div>

      {/* 底部导航 (Dock) */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-white/40 p-1.5 rounded-full flex shadow-2xl shadow-gray-200/50 z-50">
          <NavButton active={view === 'home'} onClick={() => setView('home')} icon={<Heart />} />
          <NavButton active={view === 'memorials'} onClick={() => setView('memorials')} icon={<Gift />} />
          <NavButton active={view === 'diary'} onClick={() => setView('diary')} icon={<PenTool />} />
      </div>
      
      {/* 新建纪念日弹窗 */}
      {showAddMem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl scale-100 animate-pop-in">
                <h3 className="font-bold text-xl mb-6 text-gray-800 text-center">新纪念日</h3>
                <input className="w-full bg-gray-50 rounded-2xl p-4 mb-3 outline-none focus:ring-2 focus:ring-pink-200 transition" placeholder="例如: 第一次约会" value={newMemTitle} onChange={e=>setNewMemTitle(e.target.value)} />
                <input className="w-full bg-gray-50 rounded-2xl p-4 mb-6 outline-none focus:ring-2 focus:ring-pink-200 transition" type="date" value={newMemDate} onChange={e=>setNewMemDate(e.target.value)} />
                <div className="flex gap-3">
                    <button onClick={() => setShowAddMem(false)} className="flex-1 py-3.5 bg-gray-100 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition">取消</button>
                    <button onClick={addMemorial} className="flex-1 py-3.5 bg-gray-900 rounded-xl font-bold text-white hover:bg-black transition shadow-lg shadow-gray-400/50">保存</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

// 优化的导航按钮
const NavButton = ({ active, onClick, icon }: any) => (
  <button onClick={onClick} className={`p-4 rounded-full transition-all duration-300 ${active ? 'bg-white text-pink-500 shadow-md scale-110' : 'text-gray-400 hover:text-gray-600'}`}>
     {React.cloneElement(icon, { size: 22, className: active ? 'fill-current' : '' })}
  </button>
);