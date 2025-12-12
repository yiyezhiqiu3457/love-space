import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Heart, Gift, PenTool, Settings, Copy, LogOut, Image as ImageIcon, Sparkles, X, RefreshCw, MessageCircle, CheckCircle2, Flame, ListTodo, CheckSquare, Trash2, Droplet, Thermometer, Smartphone, Share, Camera, Calendar, ChevronLeft, ChevronRight, Clock
} from 'lucide-react';

// ======================================================================
// ⚠️ 发布必读 / DEPLOYMENT GUIDE
// ======================================================================
// 1. 安装依赖: npm install leancloud-storage
// 2. 取消下方 import 的注释 (已添加 @ts-ignore 防止类型报错):
// @ts-ignore
import AV from 'leancloud-storage';
// 3. 删除或注释掉下方的 "PREVIEW MOCK SDK" 整个区域
// ======================================================================

// --- 配置区域 (请确保这些 Key 是您自己的 LeanCloud 应用 Key) ---
const LC_APP_ID = "3z3uky7oBaOs2hFDXqXcxJbF-MdYXbMMI";
const LC_APP_KEY = "9pGRzGBqLM5ihqXGhHdSrjY5";
// ⚠️ 核心修改：使用 Vercel 代理绕过跨域限制
const LC_SERVER_URL = "/api"; 




// --- 初始化 LeanCloud ---
if (typeof window !== 'undefined' && !AV.applicationId) {
  AV.init({
    appId: LC_APP_ID,
    appKey: LC_APP_KEY,
    serverURL: LC_SERVER_URL
  });
}

// --- 类型定义 ---
interface Memorial { id: string; coupleId: string; title: string; date: string; }
interface DiaryEntry { id: string; coupleId: string; text: string; mood: string; authorName: string; createdAt: Date; }
interface WishItem { id: string; coupleId: string; text: string; completed: boolean; createdAt: Date; }
interface PhotoItem { id: string; coupleId: string; url: string; caption: string; createdAt: Date; }
interface ScheduleItem { id: string; coupleId: string; title: string; date: string; time?: string; type?: string; creator: string; } 
interface CoupleSettings { startDate: string; names: string; bgImage?: string; }
interface CycleData { lastDate: string; cycleDays: number; periodDays: number; }

// --- 工具函数：图片压缩 ---
const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxWidth = 1200; // 限制最大宽度
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        }, 'image/jpeg', 0.7); // 压缩质量 0.7
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// --- 组件: 登录/配对 ---
const LoginScreen = ({ onJoin, onCreate }: { onJoin: (id: string, name: string) => void, onCreate: (name: string) => void }) => {
  const [mode, setMode] = useState<'welcome' | 'join' | 'create'>('welcome');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  if (mode === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-rose-50 to-white flex flex-col items-center justify-center p-8 text-center relative">
        <div className="w-24 h-24 bg-white/80 backdrop-blur-xl rounded-full flex items-center justify-center mb-8 shadow-xl shadow-pink-200/50 animate-bounce-slow">
          <Heart className="w-12 h-12 text-pink-500 fill-pink-500" />
        </div>
        <h1 className="text-3xl font-black text-gray-800 mb-2">Love Space</h1>
        <p className="text-gray-500 mb-10 text-sm font-medium">记录我们的点滴——小🐟️干</p>
        <div className="w-full max-w-xs space-y-4">
            <button onClick={() => setMode('create')} className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all">创建新空间</button>
            <button onClick={() => setMode('join')} className="w-full bg-white text-gray-800 font-bold py-4 rounded-2xl shadow-md border border-gray-100 active:scale-95 transition-all">我有邀请码</button>
        </div>
        <div className="absolute bottom-6 w-full text-center">
          <p className="text-[10px] text-gray-400 font-light tracking-widest opacity-80">
            莹光伴轩出品
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-white p-8 flex flex-col">
      <button onClick={() => setMode('welcome')} className="text-gray-400 mb-8 self-start hover:text-gray-600">← 返回</button>
      <h2 className="text-3xl font-bold mb-2 text-gray-800">{mode === 'create' ? '创建爱的小屋' : '加入另一半'}</h2>
      <div className="space-y-6 mt-2">
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">你的昵称</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-pink-300 transition-all" placeholder="例如: 猪猪" />
        </div>
        {mode === 'join' && (
           <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">配对码</label>
            <input type="text" value={code} onChange={e => setCode(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-pink-300 font-mono tracking-widest" placeholder="CODE" />
          </div>
        )}
        <button onClick={() => mode === 'create' ? onCreate(name) : onJoin(code, name)} disabled={!name || (mode === 'join' && !code)} className="w-full bg-pink-500 text-white font-bold py-4 rounded-2xl shadow-lg mt-4 disabled:opacity-50 active:scale-95 transition-all hover:bg-pink-600">
          {mode === 'create' ? '✨ 开始创建' : '🚀 立即加入'}
        </button>
      </div>
    </div>
  );
};

// --- 主应用 ---
export default function CoupleApp() {
  const [view, setView] = useState<'home' | 'memorials' | 'album' | 'diary' | 'wishlist' | 'cycle' | 'settings' | 'schedule' | 'shredder'>('home'); 
  const [coupleId, setCoupleId] = useState<string>('');
  const [userName, setUserName] = useState('');
  const [isEntered, setIsEntered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // 数据状态
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [wishes, setWishes] = useState<WishItem[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [settings, setSettings] = useState<CoupleSettings>({ startDate: new Date().toISOString().split('T')[0], names: '我们' });
  const [settingsObjId, setSettingsObjId] = useState<string>(''); 
  const [cycle, setCycle] = useState<CycleData>({ lastDate: '', cycleDays: 28, periodDays: 5 });
  const [cycleObjId, setCycleObjId] = useState<string>('');

  // UI 控制状态
  const [showAddMem, setShowAddMem] = useState(false);
  const [newMemTitle, setNewMemTitle] = useState('');
  const [newMemDate, setNewMemDate] = useState('');
  
  const [showAddDiary, setShowAddDiary] = useState(false);
  const [newDiaryContent, setNewDiaryContent] = useState('');
  
  const [newWishText, setNewWishText] = useState('');
  
  const [hasSaidLove, setHasSaidLove] = useState(false);
  const [loveStreak, setLoveStreak] = useState(0); 
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // 日程相关状态
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [newScheduleTitle, setNewScheduleTitle] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('');

  // 相册上传相关状态
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const [shredText, setShredText] = useState('');
  const [isShredding, setIsShredding] = useState(false);
  const [shredPhase, setShredPhase] = useState<'idle' | 'prep' | 'in' | 'fall'>('idle');
  const [strips] = useState<number>(24);
  const paperRef = useRef<HTMLDivElement>(null);
  const [paperSize, setPaperSize] = useState<{width: number; height: number}>({ width: 192, height: 80 });
  const [shredProgress, setShredProgress] = useState(0); // 0~1 进度
  const shredRaf = useRef<number | null>(null);
  const prepRaf = useRef<number | null>(null);
  const [preOffset, setPreOffset] = useState(0);
  const shredderRef = useRef<HTMLDivElement>(null);
  const bladeRef = useRef<HTMLDivElement>(null);
  const [bladeOffset, setBladeOffset] = useState<number>(56);
  const [stripParams, setStripParams] = useState<Array<{ rot: number; x: number; delay: number }>>([]);
  // 根据当前布局动态计算进纸总位移，使进纸结束时整纸下缘刚好到达刀口
  const feedDistance = useMemo(() => {
    const base = 20; // 与样式中的初始 translateY(+20) 保持一致
    const paperH = paperSize.height || 96;
    return Math.max(0, bladeOffset - (base + paperH));
  }, [bladeOffset, paperSize.height]);

  useEffect(() => {
    if (paperRef.current) {
      const el = paperRef.current as HTMLDivElement;
      setPaperSize({ width: el.offsetWidth, height: el.offsetHeight });
    }
  }, [shredText, strips]);

  // 确保进入页面或窗口尺寸变化时能正确测量纸张尺寸
  useEffect(() => {
    const measure = () => {
      if (paperRef.current) {
        const el = paperRef.current as HTMLDivElement;
        const w = el.offsetWidth || 192;
        const h = el.offsetHeight || 96;
        setPaperSize({ width: w, height: h });
      }
      if (shredderRef.current && bladeRef.current) {
        const cont = shredderRef.current.getBoundingClientRect();
        const blade = bladeRef.current.getBoundingClientRect();
        const offset = Math.max(0, Math.round((blade.top + blade.height - cont.top) + 8));
        setBladeOffset(offset);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    return () => {
      if (shredRaf.current) cancelAnimationFrame(shredRaf.current);
      if (prepRaf.current) cancelAnimationFrame(prepRaf.current as number);
    };
  }, []);

  // 错误提示辅助函数
  const showErrorAlert = (action: string, error: any) => {
      console.error(error);
      let msg = "未知错误";
      if (error.code === 403) {
          msg = "权限不足 (403)。请去 LeanCloud 控制台检查该 Class 的权限是否对所有用户开放 (create/write)。";
      } else if (error.message && error.message.includes("Network")) {
          msg = "网络连接失败。请检查 LeanCloud 安全域名白名单配置是否正确 (不带末尾斜杠)。";
      } else {
          msg = error.message || JSON.stringify(error);
      }
      alert(`${action}失败: ${msg}`);
  };

  useEffect(() => {
    const savedId = localStorage.getItem('lc_couple_id');
    const savedName = localStorage.getItem('lc_user_name');
    if (savedId && savedName) {
      setCoupleId(savedId);
      setUserName(savedName);
      setIsEntered(true);
    }
  }, []);

  const fetchData = async () => {
    if (!isEntered || !coupleId) return;
    setIsLoading(true);
    try {
      // 1. 获取设置
      // @ts-ignore
      const settingsQuery = new AV.Query('Settings');
      settingsQuery.equalTo('coupleId', coupleId);
      const settingsRes = await settingsQuery.first();
      if (settingsRes) {
        setSettings({
          startDate: settingsRes.get('startDate'),
          names: settingsRes.get('names'),
          bgImage: settingsRes.get('bgImage'),
        });
        setSettingsObjId(settingsRes.id || '');
      }

      // 2. 获取生理期
      // @ts-ignore
      const cycleQuery = new AV.Query('Cycle');
      cycleQuery.equalTo('coupleId', coupleId);
      const cycleRes = await cycleQuery.first();
      if (cycleRes) {
        setCycle({
          lastDate: cycleRes.get('lastDate') || '',
          cycleDays: cycleRes.get('cycleDays') || 28,
          periodDays: cycleRes.get('periodDays') || 5,
        });
        setCycleObjId(cycleRes.id || '');
      }

      // 3. 获取纪念日
      // @ts-ignore
      const memQuery = new AV.Query('Memorial');
      memQuery.equalTo('coupleId', coupleId);
      const memRes = await memQuery.find();
      const memList = memRes.map((m: any) => ({
        id: m.id || '',
        coupleId: m.get('coupleId'),
        title: m.get('title'),
        date: m.get('date')
      }));
      // 修复：添加类型定义以解决 'implicit any' 错误
      memList.sort((a: Memorial, b: Memorial) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setMemorials(memList);

      // 4. 获取日记
      // @ts-ignore
      const diaryQuery = new AV.Query('Diary');
      diaryQuery.equalTo('coupleId', coupleId);
      diaryQuery.descending('createdAt'); 
      diaryQuery.limit(20); 
      const diaryRes = await diaryQuery.find();
      const diaryList = diaryRes.map((d: any) => ({
        id: d.id || '',
        coupleId: d.get('coupleId'),
        text: d.get('text'),
        mood: d.get('mood'),
        authorName: d.get('authorName'),
        createdAt: d.createdAt || new Date()
      }));
      setDiaries(diaryList);

      // 5. 获取愿望清单
      // @ts-ignore
      const wishQuery = new AV.Query('Wish');
      wishQuery.equalTo('coupleId', coupleId);
      wishQuery.ascending('createdAt'); 
      const wishRes = await wishQuery.find();
      const wishList = wishRes.map((w: any) => ({
        id: w.id || '',
        coupleId: w.get('coupleId'),
        text: w.get('text'),
        completed: w.get('completed'),
        createdAt: w.createdAt
      }));
      wishList.sort((a: WishItem, b: WishItem) => Number(a.completed) - Number(b.completed));
      setWishes(wishList);

      // 6. 获取相册
      // @ts-ignore
      const photoQuery = new AV.Query('Photo');
      photoQuery.equalTo('coupleId', coupleId);
      photoQuery.descending('createdAt');
      const photoRes = await photoQuery.find();
      const photoList = photoRes.map((p: any) => ({
        id: p.id || '',
        coupleId: p.get('coupleId'),
        url: p.get('url'),
        caption: p.get('caption') || '', 
        createdAt: p.createdAt || new Date()
      }));
      setPhotos(photoList);

      // 7. 获取日程
      // @ts-ignore
      const scheduleQuery = new AV.Query('Schedule');
      scheduleQuery.equalTo('coupleId', coupleId);
      scheduleQuery.ascending('date');
      const scheduleRes = await scheduleQuery.find();
      const scheduleList = scheduleRes.map((s: any) => ({
        id: s.id || '',
        coupleId: s.get('coupleId'),
        title: s.get('title'),
        date: s.get('date'),
        time: s.get('time'),
        type: s.get('type'),
        creator: s.get('creator') || '未知' 
      }));
      setSchedules(scheduleList);

      // 8. 获取打卡
      const todayStr = new Date().toISOString().split('T')[0];
      // @ts-ignore
      const checkQuery = new AV.Query('LoveCheckIn');
      checkQuery.equalTo('coupleId', coupleId);
      checkQuery.equalTo('userName', userName);
      checkQuery.descending('date');
      checkQuery.limit(100); 
      const checks = await checkQuery.find();
      
      const hasToday = checks.some((c: any) => c.get('date') === todayStr);
      setHasSaidLove(hasToday);

      const checkDates = checks.map((c: any) => c.get('date'));
      let streak = 0;
      let checkDate = new Date(); 
      if (!hasToday) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (checkDates.includes(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1); 
        } else {
          break; 
        }
      }
      setLoveStreak(streak);

    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [isEntered, coupleId]);

  // --- 业务逻辑 ---

  const enterSpace = (id: string, name: string) => {
    setCoupleId(id);
    setUserName(name);
    setIsEntered(true);
    localStorage.setItem('lc_couple_id', id);
    localStorage.setItem('lc_user_name', name);
  };

  const handleCreate = async (name: string) => {
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
        // @ts-ignore
        const SettingsClass = AV.Object.extend('Settings');
        const settingsObj = new SettingsClass();
        settingsObj.set('coupleId', newId);
        settingsObj.set('names', '我们');
        settingsObj.set('startDate', new Date().toISOString().split('T')[0]);
        await settingsObj.save();
        
        // @ts-ignore
        const CycleClass = AV.Object.extend('Cycle');
        const cycleObj = new CycleClass();
        cycleObj.set('coupleId', newId);
        cycleObj.set('lastDate', '');
        cycleObj.set('cycleDays', 28);
        cycleObj.set('periodDays', 5);
        await cycleObj.save();

        enterSpace(newId, name);
    } catch(e) {
        showErrorAlert("创建空间", e);
    }
  };

  const handleJoin = (id: string, name: string) => {
    enterSpace(id.toUpperCase(), name);
  };

  const handleLogout = () => {
    if(confirm("确定退出登录吗？")) {
      localStorage.removeItem('lc_couple_id');
      setIsEntered(false);
      setCoupleId('');
    }
  };

  const handleSayLove = async () => {
    setHasSaidLove(true);
    setLoveStreak(s => s + 1); 
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      // @ts-ignore
      const CheckInClass = AV.Object.extend('LoveCheckIn');
      const check = new CheckInClass();
      check.set('coupleId', coupleId);
      check.set('userName', userName); 
      check.set('date', todayStr);
      await check.save();
      alert("太棒了！已连续打卡记录到云端 ❤️");
      fetchData();
    } catch (e) {
      console.error("Check-in failed", e);
      // 打卡失败不弹窗干扰用户，只在控制台记录
    }
  };

  // --- 日程逻辑 ---
  const addSchedule = async () => {
    if (!newScheduleTitle) return;
    try {
        // @ts-ignore
        const ScheduleClass = AV.Object.extend('Schedule');
        const s = new ScheduleClass();
        s.set('coupleId', coupleId);
        s.set('title', newScheduleTitle);
        s.set('date', selectedDate);
        s.set('time', newScheduleTime); 
        s.set('creator', userName); 
        await s.save();
        setShowAddSchedule(false);
        setNewScheduleTitle('');
        setNewScheduleTime('');
        fetchData();
    } catch (e) {
        showErrorAlert("添加日程", e);
    }
  };

  const deleteSchedule = async (id: string) => {
      if(confirm("确认删除该日程？")) {
          try {
              const s = AV.Object.createWithoutData('Schedule', id);
              await s.destroy();
              fetchData();
          } catch(e) {
              showErrorAlert("删除日程", e);
          }
      }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); 
    return { daysInMonth, firstDay, year, month };
  };

  const changeMonth = (delta: number) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + delta);
      setCurrentDate(newDate);
  };

  // --- 纪念日逻辑 ---
  const addMemorial = async () => {
    if (!newMemTitle || !newMemDate) return;
    try {
        // @ts-ignore
        const MemorialClass = AV.Object.extend('Memorial');
        const m = new MemorialClass();
        m.set('coupleId', coupleId);
        m.set('title', newMemTitle);
        m.set('date', newMemDate);
        await m.save();
        setShowAddMem(false); setNewMemTitle(''); setNewMemDate('');
        fetchData(); 
    } catch (e) {
        showErrorAlert("添加纪念日", e);
    }
  };

  const deleteMemorial = async (id: string) => {
    if(confirm("确认删除？")) {
      try {
          const todo = AV.Object.createWithoutData('Memorial', id);
          await todo.destroy();
          fetchData();
      } catch (e) {
          showErrorAlert("删除纪念日", e);
      }
    }
  };

  // --- 日记逻辑 ---
  const openDiaryModal = () => {
    setShowAddDiary(true);
  };

  const saveDiary = async () => {
    if (!newDiaryContent.trim()) {
      alert("日记内容不能为空哦");
      return;
    }
    try {
      // @ts-ignore
      const DiaryClass = AV.Object.extend('Diary');
      const d = new DiaryClass();
      d.set('coupleId', coupleId);
      d.set('text', newDiaryContent);
      d.set('mood', '🥰'); 
      d.set('authorName', userName);
      await d.save();
      setShowAddDiary(false);
      setNewDiaryContent('');
      fetchData();
      alert("日记发布成功！");
    } catch (e) {
      showErrorAlert("发布日记", e);
    }
  };

  // --- 愿望清单逻辑 ---
  const addWish = async () => {
    if (!newWishText.trim()) return;
    try {
      // @ts-ignore
      const WishClass = AV.Object.extend('Wish');
      const w = new WishClass();
      w.set('coupleId', coupleId);
      w.set('text', newWishText);
      w.set('completed', false);
      await w.save();
      setNewWishText('');
      fetchData();
    } catch (e) { showErrorAlert("添加愿望", e); }
  };

  const toggleWish = async (id: string, currentStatus: boolean) => {
    try {
      const w = AV.Object.createWithoutData('Wish', id);
      w.set('completed', !currentStatus);
      await w.save();
      fetchData();
    } catch (e) { showErrorAlert("更新愿望", e); }
  };

  const deleteWish = async (id: string) => {
    if(!confirm("确定要删除这个愿望吗？")) return;
    try {
      const w = AV.Object.createWithoutData('Wish', id);
      await w.destroy();
      fetchData();
    } catch (e) { showErrorAlert("删除愿望", e); }
  };

  // --- 相册逻辑 ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    
    setSelectedFile(file);
    setShowUploadModal(true);
    
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const cancelUpload = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadCaption('');
    setPreviewUrl('');
  };

  const confirmUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
        // 使用压缩后的图片
        const compressedBlob = await compressImage(selectedFile);
        const compressedFile = new File([compressedBlob], selectedFile.name, { type: 'image/jpeg' });

        // @ts-ignore
        const avFile = new AV.File(compressedFile.name, compressedFile);
        await avFile.save();
        
        // @ts-ignore
        const PhotoClass = AV.Object.extend('Photo');
        const p = new PhotoClass();
        p.set('coupleId', coupleId);
        p.set('url', avFile.url());
        p.set('caption', uploadCaption.trim() || '美好时刻'); 
        await p.save();
        
        alert("上传成功！");
        fetchData();
        cancelUpload(); 
    } catch (error) {
        showErrorAlert("上传照片", error);
    } finally {
        setIsUploading(false);
    }
  };

  const deletePhoto = async (id: string) => {
      if(confirm("删除这张照片？")) {
          setPhotos(currentPhotos => currentPhotos.filter(p => p.id !== id));
          try {
              const p = AV.Object.createWithoutData('Photo', id);
              await p.destroy();
              fetchData();
          } catch (error) {
              showErrorAlert("删除照片", error);
              fetchData(); // 失败回滚
          }
      }
  };

  // --- 生理期更新 ---
  const updateCycle = async (date: string, days: number) => {
    if(!date) return;
    try {
        let c;
        if(cycleObjId) {
            c = AV.Object.createWithoutData('Cycle', cycleObjId);
        } else {
            // @ts-ignore
            const CycleClass = AV.Object.extend('Cycle');
            c = new CycleClass();
            c.set('coupleId', coupleId);
        }
        c.set('lastDate', date);
        c.set('cycleDays', Number(days));
        await c.save();
        alert("生理期信息已更新 ❤️");
        fetchData();
    } catch(e) {
        showErrorAlert("保存生理期", e);
    }
  };

  // --- 设置更新 ---
  const updateSettings = async (newNames: string, newDate: string, newBg: string) => {
    if (!settingsObjId) return;
    try {
        const s = AV.Object.createWithoutData('Settings', settingsObjId);
        s.set('names', newNames);
        s.set('startDate', newDate);
        s.set('bgImage', newBg);
        await s.save();
        fetchData();
        alert("设置已更新！");
    } catch (e) {
        showErrorAlert("更新设置", e);
    }
  };

  const daysTogether = useMemo(() => {
    const start = new Date(settings.startDate);
    const now = new Date();
    return Math.floor(Math.abs(now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [settings.startDate]);

  const cycleStatus = useMemo(() => {
    if (!cycle.lastDate) return { status: 'unknown', text: '未设置', tip: '请设置上次经期' };
    const last = new Date(cycle.lastDate);
    const now = new Date();
    last.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    const diffTime = now.getTime() - last.getTime();
    const dayIndex = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const nextPeriodDate = new Date(last);
    nextPeriodDate.setDate(last.getDate() + cycle.cycleDays);
    const daysUntilNext = Math.ceil((nextPeriodDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (dayIndex >= 0 && dayIndex < cycle.periodDays) return { status: 'period', text: `经期第 ${dayIndex + 1} 天`, tip: '多喝热水，不许惹她生气！🍵' };
    else if (daysUntilNext > 0 && daysUntilNext <= 7) return { status: 'soon', text: `还有 ${daysUntilNext} 天`, tip: '生理期快到了，注意保暖。🧣' };
    else return { status: 'normal', text: `距离下次 ${daysUntilNext} 天`, tip: '平淡的日子也要记得说我爱你。❤️' };
  }, [cycle]);

  const copyInviteCode = () => {
    navigator.clipboard.writeText(coupleId);
    alert(`配对码 ${coupleId} 已复制！`);
  };

  if (!isEntered) return <LoginScreen onJoin={handleJoin} onCreate={handleCreate} />;

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative shadow-2xl font-sans text-gray-800 overflow-hidden flex flex-col">
      {/* 背景图层 */}
      <div className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: settings.bgImage ? `url(${settings.bgImage})` : 'linear-gradient(to bottom right, #fce7f3, #ffffff)', filter: 'brightness(0.95)' }} />
      <div className={`absolute inset-0 z-0 ${settings.bgImage ? 'bg-white/60 backdrop-blur-md' : ''}`}></div>

      {/* 顶部 */}
      <div className="relative z-10 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <div className="bg-white/80 p-2 rounded-full shadow-sm backdrop-blur-sm"><Heart size={16} className="text-pink-500 fill-pink-500" /></div>
            <span className="font-bold text-gray-800 text-lg drop-shadow-sm">{settings.names}</span>
        </div>
        <div className="flex gap-2">
            <button onClick={fetchData} className={`p-2 bg-white/50 backdrop-blur-md rounded-full text-gray-700 hover:bg-white transition ${isLoading ? 'animate-spin' : ''}`}><RefreshCw size={18} /></button>
            <button onClick={() => setView('settings')} className="p-2 bg-white/50 backdrop-blur-md rounded-full text-gray-700 hover:bg-white transition"><Settings size={18} /></button>
        </div>
      </div>

      {/* 内容 */}
      <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-6 pb-24 scrollbar-hide">
        {view === 'home' && (
          <div className="animate-fade-in">
            {/* 计时卡片 */}
            <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-8 text-center shadow-xl border border-white/50 relative overflow-hidden">
                <p className="text-gray-600 text-xs font-bold mb-2 uppercase tracking-[0.2em]">Being In Love</p>
                <h1 className="text-7xl font-black tracking-tighter text-gray-800 mb-1 drop-shadow-sm">{daysTogether}</h1>
                <p className="text-gray-500 text-sm font-medium">Days</p>
                <div className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 bg-white/60 rounded-full text-xs font-bold text-gray-500 shadow-sm">
                   <Sparkles size={12} className="text-yellow-500" /> Since {settings.startDate}
                </div>
            </div>

            {/* 微信打卡确认 */}
            <div className="mt-4 bg-white/60 backdrop-blur-lg rounded-2xl p-4 shadow-sm border border-white/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-full transition-colors ${hasSaidLove ? 'bg-green-100 text-green-600' : 'bg-pink-100 text-pink-500'}`}>
                  {hasSaidLove ? <CheckCircle2 size={20} /> : <MessageCircle size={20} />}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-700 text-sm">{hasSaidLove ? '今天爱意已送达' : '今天发“我爱你”了吗？'}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                     <span className="text-[10px] text-gray-500">{hasSaidLove ? '真棒！' : '记得去说一声'}</span>
                     {loveStreak > 0 && (
                       <span className="flex items-center gap-0.5 text-[10px] font-bold text-orange-500 bg-orange-100 px-1.5 py-0.5 rounded-full">
                         <Flame size={10} className="fill-orange-500" /> 连续 {loveStreak} 天
                       </span>
                     )}
                  </div>
                </div>
              </div>
              {!hasSaidLove && (
                <button onClick={handleSayLove} className="bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-green-200 hover:bg-green-600 active:scale-95 transition">确认已发</button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
               <button onClick={() => setView('schedule')} className="col-span-2 bg-gradient-to-r from-blue-100 to-cyan-100 backdrop-blur-lg p-6 rounded-3xl shadow-sm border border-white/40 flex flex-row items-center justify-center gap-3 active:scale-95 transition-transform hover:scale-[1.01]">
                  <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-600"><Calendar size={20} /></div>
                  <span className="font-bold text-gray-700">共享日程</span>
               </button>

               <button onClick={() => setView('memorials')} className="bg-white/60 backdrop-blur-lg p-6 rounded-3xl shadow-sm border border-white/40 flex flex-col items-center gap-3 active:scale-95 transition-transform hover:scale-[1.02]">
                  <Gift size={24} className="text-red-400" /><span className="font-bold text-gray-700">纪念日</span>
               </button>
               <button onClick={() => setView('album')} className="bg-white/60 backdrop-blur-lg p-6 rounded-3xl shadow-sm border border-white/40 flex flex-col items-center gap-3 active:scale-95 transition-transform hover:scale-[1.02]">
                  <ImageIcon size={24} className="text-pink-500" /><span className="font-bold text-gray-700">恋爱相册</span>
               </button>
               <button onClick={() => setView('diary')} className="bg-white/60 backdrop-blur-lg p-6 rounded-3xl shadow-sm border border-white/40 flex flex-col items-center gap-3 active:scale-95 transition-transform hover:scale-[1.02]">
                  <PenTool size={24} className="text-orange-500" /><span className="font-bold text-gray-700">日记本</span>
               </button>
               <button onClick={() => setView('wishlist')} className="bg-white/60 backdrop-blur-lg p-6 rounded-3xl shadow-sm border border-white/40 flex flex-col items-center gap-3 active:scale-95 transition-transform hover:scale-[1.02]">
                  <ListTodo size={24} className="text-purple-600" /><span className="font-bold text-gray-700">愿望清单</span>
               </button>
               <button onClick={() => setView('shredder')} className="bg-white/60 backdrop-blur-lg p-6 rounded-3xl shadow-sm border border-white/40 flex flex-col items-center gap-3 active:scale-95 transition-transform hover:scale-[1.02]">
                  <Trash2 size={24} className="text-gray-700" /><span className="font-bold text-gray-700">坏情绪粉碎机</span>
               </button>
            </div>
            
            <div onClick={copyInviteCode} className="mt-6 bg-gray-900/5 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between cursor-pointer active:bg-gray-900/10 transition">
              <div className="flex items-center gap-3"><Copy size={14} /><span className="font-mono font-bold text-gray-800">{coupleId}</span></div>
              <span className="text-xs font-bold text-pink-500">点击复制配对码</span>
            </div>
          </div>
        )}

        {/* 共享日程页面 - 更新：显示创建者 */}
        {view === 'schedule' && (
            <div className="space-y-4 animate-fade-in pb-20">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="text-blue-500" /> 共享日程
                    </h2>
                </div>

                {/* 日历卡片 */}
                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-4 shadow-sm border border-white/50">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full transition"><ChevronLeft size={20}/></button>
                        <h3 className="font-bold text-lg text-gray-800">
                            {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
                        </h3>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full transition"><ChevronRight size={20}/></button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['日','一','二','三','四','五','六'].map(d => (
                            <div key={d} className="text-xs font-bold text-gray-400">{d}</div>
                        ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({length: getDaysInMonth(currentDate).firstDay}).map((_, i) => <div key={`empty-${i}`} />)}
                        {Array.from({length: getDaysInMonth(currentDate).daysInMonth}).map((_, i) => {
                            const day = i + 1;
                            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isSelected = dateStr === selectedDate;
                            const hasEvent = schedules.some(s => s.date === dateStr);
                            
                            return (
                                <div 
                                    key={day} 
                                    onClick={() => setSelectedDate(dateStr)}
                                    className={`aspect-square flex flex-col items-center justify-center rounded-xl cursor-pointer transition text-sm relative
                                        ${isSelected ? 'bg-blue-500 text-white shadow-md' : 'hover:bg-blue-50 text-gray-700'}`}
                                >
                                    <span className="font-bold">{day}</span>
                                    {hasEvent && !isSelected && <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-0.5"></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 选中日期的日程列表 */}
                <div className="bg-white/60 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white/40 min-h-[200px]">
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-gray-700">{selectedDate} 的安排</span>
                        <button onClick={() => setShowAddSchedule(true)} className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm active:scale-95 transition">+ 添加</button>
                    </div>
                    
                    <div className="space-y-3">
                        {schedules.filter(s => s.date === selectedDate).length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">今天暂无安排，去享受二人世界吧~</div>
                        )}
                        {schedules.filter(s => s.date === selectedDate).map(s => {
                            const isMe = s.creator === userName;
                            return (
                                <div key={s.id} className="flex items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm transition-transform active:scale-[0.99]">
                                    {/* 颜色区分条：蓝色代表自己，粉色代表对方 */}
                                    <div className={`w-1 h-8 rounded-full mr-3 ${isMe ? 'bg-blue-400' : 'bg-pink-400'}`}></div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-gray-800 text-sm">{s.title}</span>
                                            {/* 创建者标签 */}
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isMe ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'}`}>
                                                {isMe ? '我' : s.creator}
                                            </span>
                                        </div>
                                        {s.time && <div className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10}/> {s.time}</div>}
                                    </div>
                                    <button onClick={() => deleteSchedule(s.id)} className="text-gray-300 hover:text-red-400 p-2"><Trash2 size={14}/></button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        )}

        {view === 'memorials' && (
           <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center mb-2">
                  <h2 className="text-2xl font-bold text-gray-800">重要日子</h2>
                  <button onClick={() => setShowAddMem(true)} className="text-sm bg-gray-800 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-gray-300/50 active:scale-95 transition">+ 新建</button>
              </div>
              {memorials.length === 0 && <div className="text-center py-10 text-gray-400">暂无纪念日</div>}
              {memorials.map(m => {
                  const days = Math.ceil((new Date(m.date).getTime() - new Date().setHours(0,0,0,0)) / 86400000);
                  const isFuture = days > 0;
                  return (
                    <div key={m.id} className="group relative bg-white/70 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-white/50 flex justify-between items-center overflow-hidden">
                        <div className={`absolute left-0 top-0 bottom-0 w-2 ${isFuture ? 'bg-blue-400' : 'bg-pink-400'}`}></div>
                        <div className="pl-3"><h3 className="font-bold text-gray-800 text-lg">{m.title}</h3><p className="text-xs font-medium text-gray-400 mt-1">{m.date}</p></div>
                        <div className="text-right"><span className={`text-3xl font-black ${isFuture ? 'text-blue-500' : 'text-pink-500'}`}>{Math.abs(days)}</span><span className="text-xs font-bold text-gray-400 ml-1 block">{isFuture ? '天后' : '天已过'}</span></div>
                        <button onClick={() => deleteMemorial(m.id)} className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><X size={14}/></button>
                    </div>
                  );
              })}
           </div>
        )}

        {/* 恋爱相册页面 */}
        {view === 'album' && (
           <div className="space-y-4 animate-fade-in pb-20">
              <div className="flex justify-between items-center mb-2">
                  <h2 className="text-2xl font-bold text-gray-800">甜蜜瞬间</h2>
                  <label className={`text-sm bg-blue-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition flex items-center gap-1 cursor-pointer ${isUploading ? 'opacity-50' : ''}`}>
                     <Camera size={16} /> 
                     上传
                     <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} disabled={isUploading} />
                  </label>
              </div>
              
              <div className="columns-2 gap-3 space-y-3">
                 {photos.map(p => (
                    <div key={p.id} className="break-inside-avoid bg-white p-2 rounded-2xl shadow-sm border border-gray-100 relative group mb-3">
                       <img src={p.url} alt="love" className="w-full rounded-xl object-cover" />
                       <div className="px-1 mt-2">
                          <p className="text-xs font-medium text-gray-700 mb-1 break-words">{p.caption}</p>
                          <div className="flex justify-between items-center mt-2">
                             <span className="text-[10px] text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</span>
                             
                             {/* 修复：增大点击区域和图标大小 */}
                             <button onClick={() => deletePhoto(p.id)} className="p-2 -mr-2 text-gray-300 hover:text-red-400 active:scale-95 transition">
                                <Trash2 size={16}/>
                             </button>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
              {photos.length === 0 && <div className="text-center py-20 text-gray-400">还没有照片，快传一张吧~</div>}
           </div>
        )}

        {view === 'diary' && (
            <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-2xl font-bold text-gray-800">交换日记</h2>
                  <button onClick={openDiaryModal} className="text-sm bg-pink-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-pink-200 active:scale-95 transition">写日记</button>
              </div>
              {diaries.length === 0 && <div className="text-center py-10 text-gray-400">日记本空空的</div>}
              {diaries.map(d => (
                  <div key={d.id} className="bg-white/80 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-white/50">
                      <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">{d.mood}</span>
                          <span className="font-bold text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">{d.authorName}</span>
                          <span className="text-xs font-medium text-gray-300 ml-auto">{new Date(d.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed font-medium">{d.text}</p>
                  </div>
              ))}
            </div>
        )}

        {view === 'wishlist' && (
          <div className="space-y-6 animate-fade-in">
             <h2 className="text-2xl font-bold text-gray-800">愿望清单</h2>
             
             {/* 输入框 */}
             <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-2 pl-4 shadow-sm border border-white/50 flex items-center gap-2">
               <input 
                 className="flex-1 bg-transparent outline-none text-gray-700 py-2" 
                 placeholder="例如：一起去迪士尼..." 
                 value={newWishText}
                 onChange={e => setNewWishText(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && addWish()}
               />
               <button onClick={addWish} className="bg-purple-500 text-white p-3 rounded-xl font-bold shadow-md hover:bg-purple-600 transition active:scale-95">添加</button>
             </div>

             <div className="space-y-3">
               {wishes.length === 0 && <div className="text-center py-10 text-gray-400">添加你们的第一个共同愿望吧</div>}
               {wishes.map(w => (
                 <div key={w.id} className={`group flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300 ${w.completed ? 'bg-gray-100/50 border-transparent opacity-60' : 'bg-white/80 backdrop-blur-md border-white/50 shadow-sm'}`}>
                    <button 
                      onClick={() => toggleWish(w.id, w.completed)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${w.completed ? 'bg-purple-400 border-purple-400 text-white' : 'border-gray-300 text-transparent hover:border-purple-300'}`}
                    >
                      <CheckSquare size={14} />
                    </button>
                    <span className={`flex-1 font-medium transition-all ${w.completed ? 'text-gray-400 line-through decoration-2 decoration-purple-300' : 'text-gray-700'}`}>
                      {w.text}
                    </span>
                    <button onClick={() => deleteWish(w.id)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16} /></button>
                 </div>
               ))}
             </div>
          </div>
        )}

        {view === 'shredder' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-bold text-gray-800">坏情绪粉碎机</h2>
              <button onClick={() => setView('home')} className="text-sm bg-gray-900 text-white px-4 py-2 rounded-xl font-bold shadow-sm active:scale-95 transition">返回</button>
            </div>
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/50 space-y-4">
              <textarea 
                className="w-full bg-gray-50 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-pink-200 min-h-[120px] resize-none"
                placeholder="把坏情绪写下来，让我来帮你粉碎它..."
                value={shredText}
                onChange={e => setShredText(e.target.value)}
              />
              <button 
                disabled={!shredText.trim() || isShredding}
                onClick={() => {
                  if (!shredText.trim()) return;
                  if (isShredding) return;
                  setIsShredding(true);
                  // 预备：先略微后退再进入
                  setShredPhase('prep');
                  setPreOffset(-32);
                  const prepDuration = 1100;
                  const prepStart = performance.now();
                  const prepStep = (now: number) => {
                    const t = Math.min(1, (now - prepStart) / prepDuration);
                    const eased = 1 - Math.pow(1 - t, 2); // ease-out
                    setPreOffset(-32 + 32 * eased); // -32 -> 0
                    if (t < 1) {
                      prepRaf.current = requestAnimationFrame(prepStep);
                    } else {
                      // 进入进纸阶段前，增加短暂停顿以增强仪式感
                      const hold = 150; // ms
                      setTimeout(() => {
                        setShredPhase('in');
                        setShredProgress(0);
                      // 初始化每条纸片的随机落下参数（旋转、水平漂移、延迟）
                      const params = Array.from({ length: strips }).map((_, idx) => {
                        const edge = Math.abs((idx / Math.max(1, strips - 1)) * 2 - 1);
                        const rot = (Math.random() - 0.5) * 40 + edge * 4;
                        const x = (Math.random() - 0.5) * 30 * (1 + edge * 0.3);
                        const delay = Math.random() * 0.5;
                        return { rot, x, delay };
                      });
                      setStripParams(params);
                      const duration = 2200;
                      const start = performance.now();
                      const step = (now2: number) => {
                        const p = Math.min(1, (now2 - start) / duration);
                        setShredProgress(p);
                        if (p < 1) {
                          shredRaf.current = requestAnimationFrame(step);
                        } else {
                          // 进入落条阶段
                          setShredPhase('fall');
                          // 落条动画结束后复位
                          setTimeout(() => {
                            setIsShredding(false);
                            setShredPhase('idle');
                            setShredProgress(0);
                            setPreOffset(0);
                            setShredText('');
                          }, 1800);
                        }
                      };
                      shredRaf.current = requestAnimationFrame(step);
                      }, hold);
                    }
                  };
                  prepRaf.current = requestAnimationFrame(prepStep);
                }}
                className={`w-full ${(!shredText.trim() || isShredding) ? 'bg-gray-200 text-gray-500' : 'bg-pink-500 text-white'} font-bold py-3 rounded-xl shadow-md active:scale-95 transition`}
              >开始粉碎</button>
            </div>

            {/* 向下移动碎纸机位置 */}
            <div className="relative h-80 mt-[45vh] bg-gradient-to-b from-violet-50 to-purple-100 backdrop-blur-xl rounded-3xl border border-white/50 shadow-inner overflow-hidden flex items-start justify-center">
              {/* 向下移动刀口位置 */}
              <div
                className="absolute top-[2.75rem] w-[448px] h-5 rounded-sm shadow-md"
                style={{
                  background: 'linear-gradient(180deg,#c4b5fd,#a78bfa)',
                  boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.7), inset 0 -1px 2px rgba(167,139,250,0.45)',
                  zIndex: 30,
                }}
              />
              <div className="absolute top-0 w-full h-10"
                   style={{
                     background: 'linear-gradient(180deg, rgba(139,92,246,0.12), rgba(139,92,246,0.04))',
                     zIndex: 25,
                   }}></div>
              {/* 向下移动阴影过渡位置 */}
              <div
                className="absolute top-[3.1rem] w-[448px] h-2 rounded-sm"
                style={{
                  background: 'linear-gradient(180deg, rgba(139,92,246,0.22), rgba(139,92,246,0))',
                  zIndex: 26,
                }}
              />

              {/* 优化整纸显示容器 */}
              <div className="absolute w-[448px]" style={{ top: 0, height: (shredPhase === 'in' || shredPhase === 'prep') ? bladeOffset : '100%', overflow: (shredPhase === 'in' || shredPhase === 'prep') ? 'hidden' : 'visible', zIndex: (shredPhase === 'idle') ? 40 : 5 }}>
                <div 
                  ref={paperRef}
                  className="mx-auto bg-rose-50 shadow-[0_6px_14px_rgba(236,72,153,0.18)] rounded-md border border-rose-200 text-rose-700 text-sm p-3 text-center"
                  style={{
                    width: '15rem',
                    backgroundImage: 'linear-gradient(180deg,rgba(255,240,245,1),rgba(255,228,235,1))',
                    transform: `translateY(${Math.round(20 + preOffset + shredProgress * feedDistance)}px)`,
                    // 增加平滑过渡动画
                    transition: 'transform 0.1s ease-out',
                    // in 阶段显示整纸，但被刀口裁剪；fall 阶段隐藏整纸
                    opacity: shredPhase === 'fall' ? 0 : 1,
                    position: 'relative',
                    zIndex: shredPhase === 'idle' ? 40 : 5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    maxWidth: '34ch',
                    margin: '0 auto',
                  }}
                >
                  {shredText || ' '}
                </div>
              </div>

              {/* 优化纸片条容器，确保动画衔接流畅 */}
              {(shredPhase === 'in' || shredPhase === 'fall') && (
                <div className="absolute w-[448px]" style={{ pointerEvents: 'none', zIndex: 10, top: bladeOffset, height: `calc(100% - ${bladeOffset}px)`, overflow: 'hidden' }}>
                  {Array.from({ length: strips }).map((_, i) => {
                    const sliceW = paperSize.width / strips;
                    const containerW = 448; // w-[448px]
                    const gutter = Math.max(0, (containerW - paperSize.width) / 2);
                    const leftOffset = gutter + sliceW * i;
                    const param = stripParams[i] || { rot: (i % 2 === 0 ? 10 : -10), x: 0, delay: (i % 5) * 0.05 };
                    const delay = param.delay;
                    const rotate = param.rot;
                    const baseH = paperSize.height || 96;
                    // 修复：确保进纸阶段穿过碎纸机的长度随shredProgress逐渐增加
                    // 所有阶段都让高度随shredProgress逐渐增加，确保穿过碎纸机的长度动态变化
                    const cutHeight = Math.max(6, Math.min(baseH * shredProgress, 220));
                    return (
                      <div
                        key={i}
                        className="absolute overflow-hidden rounded-[2px] border border-rose-300 bg-rose-50"
                        style={{
                          top: 0,
                          left: `${leftOffset}px`,
                          width: `${Math.max(1, sliceW - 1)}px`,
                          height: `${cutHeight}px`,
                          // 优化动画过渡，增加弹性效果
                          transform: shredPhase === 'fall'
                            ? `translateY(260px) rotate(${rotate}deg) translateX(${(param.x * 1.2).toFixed(2)}px)`
                            : `translateY(${(Math.sin((shredProgress * 6.283 * 0.5 + i) * 0.8) * 2.0).toFixed(2)}px) translateX(${(Math.sin((shredProgress * 6.283 + i) * 1.0) * 3 + param.x * Math.min(1, shredProgress * 1.2) * 0.4).toFixed(2)}px) skewY(${((i % 2 === 0 ? 1 : -1) * 1.5).toFixed(2)}deg)`,
                          // 优化过渡效果，使动画更流畅
                          transition: shredPhase === 'fall'
                            ? `transform 1.8s ease-in ${delay}s, opacity 1.8s ease-in ${delay}s`
                            : 'height 0.05s ease, transform 0.1s ease-out, opacity 0.1s ease-out',
                          // 优化透明度过渡，使纸片条逐渐出现
                          opacity: shredPhase === 'fall' ? 0 : Math.min(1, Math.max(0.5, shredProgress * 1.5)),
                          borderTop: '1px solid rgba(236,72,153,0.35)',
                          boxShadow: `${cutHeight > 0 ? '0 8px 18px rgba(0,0,0,0.22)' : 'none'}, inset 0 1px 0 rgba(255,255,255,0.6)`,

                          background: 'linear-gradient(180deg,rgba(255,240,245,1),rgba(255,228,235,1))'
                        }}
                      >
                        <div
                          className="text-rose-800 text-sm p-3 text-center"
                          style={{
                            width: `${paperSize.width}px`,
                            transform: `translateX(-${sliceW * i}px)`,
                            height: `${baseH}px`,
                            // 修复：统一位置调整逻辑，确保显示正确的纸张部分
                            marginTop: `-${baseH - cutHeight}px`,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            maxWidth: '34ch',
                            margin: '0 auto',
                          }}
                        >
                          {shredText || ' '}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 生理期助手页面 */}
        {view === 'cycle' && (
          <div className="space-y-6 animate-fade-in">
             <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
               <Droplet className="fill-rose-400 text-rose-400" /> 生理期助手
             </h2>
             
             {/* 状态大圆环 */}
             <div className="flex flex-col items-center justify-center py-8">
                <div className={`w-64 h-64 rounded-full flex flex-col items-center justify-center border-8 shadow-2xl relative transition-all duration-500
                  ${cycleStatus.status === 'period' ? 'border-rose-300 bg-rose-50' : 
                    cycleStatus.status === 'soon' ? 'border-orange-200 bg-orange-50' : 
                    'border-green-100 bg-green-50'}`}>
                    
                    <span className="text-4xl font-black text-gray-800 mb-2">{cycleStatus.text}</span>
                    <span className="text-sm font-medium text-gray-500 px-8 text-center">{cycleStatus.tip}</span>
                    
                    {cycleStatus.status === 'period' && (
                      <div className="absolute -bottom-4 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-bounce">
                        特殊时期
                      </div>
                    )}
                </div>
             </div>

             {/* 设置卡片 */}
             <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/50 space-y-4">
                <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                  <Thermometer size={16} /> 记录与设置
                </h3>
                
                <div>
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-2">上次经期开始日</label>
                   <input 
                     className="w-full bg-white/50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-rose-300" 
                     type="date" 
                     defaultValue={cycle.lastDate}
                     onChange={(e) => updateCycle(e.target.value, cycle.cycleDays)}
                   />
                </div>
                
                <div>
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-2">平均周期 (天)</label>
                   <input 
                     className="w-full bg-white/50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-rose-300" 
                     type="number" 
                     defaultValue={cycle.cycleDays}
                     onBlur={(e) => updateCycle(cycle.lastDate, Number(e.target.value))}
                   />
                </div>
                <p className="text-xs text-gray-400 mt-2">* 记录后，系统会自动推算下次日期并提示。</p>
             </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="space-y-6 animate-fade-in">
             <h2 className="text-2xl font-bold text-gray-800">设置</h2>
             
             {/* 手机安装入口 */}
             <button 
                onClick={() => setShowInstallGuide(true)}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
             >
                <Smartphone size={20} />
                安装到手机桌面 (推荐)
             </button>

             <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/50 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">我们的称呼</label>
                    {/* 修复：添加 key 属性以确保从数据库同步最新值 */}
                    <input className="w-full bg-white/50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-pink-300" 
                           defaultValue={settings.names} 
                           key={settings.names} 
                           id="set-names" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">在一起的日子</label>
                    <input className="w-full bg-white/50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-pink-300" 
                           type="date" 
                           defaultValue={settings.startDate} 
                           key={settings.startDate} 
                           id="set-date" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><ImageIcon size={12}/> 背景图片链接</label>
                    <input className="w-full bg-white/50 border border-gray-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-pink-300" 
                           defaultValue={settings.bgImage} 
                           key={settings.bgImage} 
                           id="set-bg" 
                           placeholder="https://..." />
                </div>
                <button onClick={() => updateSettings((document.getElementById('set-names') as any).value, (document.getElementById('set-date') as any).value, (document.getElementById('set-bg') as any).value)} className="w-full bg-gray-800 text-white font-bold py-3 rounded-xl mt-2 active:scale-95 transition">保存设置</button>
             </div>
             <button onClick={handleLogout} className="w-full py-4 text-red-400 font-bold text-sm hover:bg-red-50 rounded-2xl transition"><LogOut size={16} className="inline mr-1" /> 退出登录</button>
          </div>
        )}
      </div>

      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-white/40 p-1.5 rounded-full flex shadow-2xl shadow-gray-200/50 z-50">
          <NavButton active={view === 'home'} onClick={() => setView('home')} icon={<Heart />} />
          <NavButton active={view === 'album'} onClick={() => setView('album')} icon={<ImageIcon />} />
          <NavButton active={view === 'diary'} onClick={() => setView('diary')} icon={<PenTool />} />
          <NavButton active={view === 'wishlist'} onClick={() => setView('wishlist')} icon={<ListTodo />} />
          <NavButton active={view === 'cycle'} onClick={() => setView('cycle')} icon={<Droplet />} />
      </div>

      {/* 安装指南弹窗 */}
      {showInstallGuide && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in" onClick={() => setShowInstallGuide(false)}>
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-xl mb-4 text-gray-800 flex items-center gap-2"><Smartphone size={24} className="text-blue-500"/> 安装教程</h3>
                <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                   <p className="font-bold text-gray-800">📱 iPhone (Safari):</p>
                   <p>1. 点击底部中间的 <span className="font-bold text-blue-500"><Share size={12} className="inline"/> 分享按钮</span>。</p>
                   <p>2. 下滑找到并点击 <span className="font-bold">"添加到主屏幕"</span>。</p>
                   <div className="h-px bg-gray-100 my-2"></div>
                   <p className="font-bold text-gray-800">🤖 Android (Chrome):</p>
                   <p>1. 点击右上角的 <span className="font-bold">... 菜单</span>。</p>
                   <p>2. 点击 <span className="font-bold">"安装应用"</span> 或 <span className="font-bold">"添加到主屏幕"</span>。</p>
                </div>
                <button onClick={() => setShowInstallGuide(false)} className="w-full mt-6 py-3.5 bg-gray-900 rounded-xl font-bold text-white hover:bg-black transition">知道了</button>
            </div>
        </div>
      )}

      {showAddMem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-pop-in">
                <h3 className="font-bold text-xl mb-6 text-gray-800 text-center">新纪念日</h3>
                <input className="w-full bg-gray-50 rounded-2xl p-4 mb-3 outline-none focus:ring-2 focus:ring-pink-200" placeholder="例如: 第一次约会" value={newMemTitle} onChange={e=>setNewMemTitle(e.target.value)} />
                <input className="w-full bg-gray-50 rounded-2xl p-4 mb-6 outline-none focus:ring-2 focus:ring-pink-200" type="date" value={newMemDate} onChange={e=>setNewMemDate(e.target.value)} />
                <div className="flex gap-3"><button onClick={() => setShowAddMem(false)} className="flex-1 py-3.5 bg-gray-100 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition">取消</button><button onClick={addMemorial} className="flex-1 py-3.5 bg-gray-900 rounded-xl font-bold text-white hover:bg-black transition">保存</button></div>
            </div>
        </div>
      )}

      {/* 新增：写日记弹窗 */}
      {showAddDiary && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-pop-in">
                <h3 className="font-bold text-xl mb-4 text-gray-800 text-center">记录此刻</h3>
                <textarea 
                  className="w-full bg-gray-50 rounded-2xl p-4 mb-6 outline-none focus:ring-2 focus:ring-pink-200 min-h-[120px] resize-none" 
                  placeholder="今天发生了什么有趣的事？" 
                  value={newDiaryContent} 
                  onChange={e=>setNewDiaryContent(e.target.value)} 
                />
                <div className="flex gap-3">
                    <button onClick={() => setShowAddDiary(false)} className="flex-1 py-3.5 bg-gray-100 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition">取消</button>
                    <button onClick={saveDiary} className="flex-1 py-3.5 bg-pink-500 rounded-xl font-bold text-white hover:bg-pink-600 transition shadow-lg shadow-pink-200">发布</button>
                </div>
            </div>
        </div>
      )}

      {/* 新增：添加日程弹窗 */}
      {showAddSchedule && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-pop-in">
                <h3 className="font-bold text-xl mb-2 text-gray-800 text-center">添加日程</h3>
                <p className="text-center text-sm text-gray-400 mb-6">{selectedDate}</p>
                
                <div className="space-y-3 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">标题</label>
                        <input className="w-full bg-gray-50 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-200" placeholder="例如: 看电影" value={newScheduleTitle} onChange={e=>setNewScheduleTitle(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">时间 (选填)</label>
                        <input type="time" className="w-full bg-gray-50 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-200" value={newScheduleTime} onChange={e=>setNewScheduleTime(e.target.value)} />
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={() => setShowAddSchedule(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition">取消</button>
                    <button onClick={addSchedule} className="flex-1 py-3 bg-blue-500 rounded-xl font-bold text-white hover:bg-blue-600 transition shadow-lg shadow-blue-200">保存</button>
                </div>
            </div>
        </div>
      )}

      {/* 新增：照片上传弹窗 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-pop-in">
                <h3 className="font-bold text-lg mb-4 text-gray-800">上传照片</h3>
                
                <div className="aspect-square w-full bg-gray-100 rounded-xl mb-4 overflow-hidden shadow-inner">
                    {previewUrl && <img src={previewUrl} className="w-full h-full object-cover" />}
                </div>

                <input 
                  className="w-full bg-gray-50 rounded-xl p-3 mb-4 outline-none focus:ring-2 focus:ring-pink-200 text-sm"
                  placeholder="写一句描述吧... (可选)"
                  value={uploadCaption}
                  onChange={e => setUploadCaption(e.target.value)}
                />

                <div className="flex gap-3">
                    <button onClick={cancelUpload} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition text-sm">取消</button>
                    <button onClick={confirmUpload} disabled={isUploading} className="flex-1 py-3 bg-pink-500 rounded-xl font-bold text-white hover:bg-pink-600 transition shadow-lg shadow-pink-200 text-sm flex items-center justify-center gap-2">
                        {isUploading ? <RefreshCw className="animate-spin" size={16}/> : '发布'}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
const NavButton = ({ active, onClick, icon }: any) => (
  <button onClick={onClick} className={`p-4 rounded-full transition-all duration-300 ${active ? 'bg-white text-pink-500 shadow-md scale-110' : 'text-gray-400 hover:text-gray-600'}`}>{React.cloneElement(icon, { size: 22, className: active ? 'fill-current' : '' })}</button>
);