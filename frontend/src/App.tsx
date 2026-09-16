import { useEffect, useState, FormEvent } from 'react'
import { Thermometer, Database, Power, Sprout, Sun, Moon, Languages, Activity, Droplet, Battery, SignalHigh, Clock, LockKeyhole, LogOut, BarChart3, LayoutDashboard } from 'lucide-react'
import axios from 'axios'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'

axios.defaults.withCredentials = true

const TelemetrySchema = z.object({
  soil_moisture: z.number().default(0),
  temperature: z.number().default(0),
  water_level: z.number().default(0),
  pump_state: z.string().default('IDLE'),
  soak_time_left: z.number().default(0),
  rtt_ms: z.number().default(0),
  mode: z.string().default('AUTO'),
  history: z.array(z.number()).default([]),
  battery_v: z.number().default(0),
  signal_dbm: z.number().default(0),
  uptime_s: z.number().default(0)
})

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
})

type Lang = 'en' | 'vi'
type Role = 'operator' | 'viewer'
type User = { role: Role; username: string }

const i18n: Record<Lang, Record<string, string>> = {
  en: {
    title: 'Smart Irrigation',
    subtitle: 'Zone 1 Controller',
    temp: 'Air Temp',
    moisture: 'Soil Moisture',
    tank: 'Reservoir',
    flow: 'System Flow',
    idle: 'IDLE',
    pumping: 'PUMPING',
    soaking: 'SOAKING',
    pump: 'Pump',
    plant: 'Plant',
    online: 'ONLINE',
    offline: 'OFFLINE',
    mode: 'Mode',
    auto: 'Auto',
    manual: 'Manual',
    empty: 'TANK EMPTY',
    safety: 'SAFETY LOCK',
    login: 'Operator Portal',
    username: 'Username',
    password: 'Password',
    signin: 'Sign In',
    desc: 'Secure access to Zone 1 closed-loop automated irrigation system.',
    dashboard: 'Dashboard',
    statistics: 'Statistics',
    lastHour: 'Last 1 Hour',
    lastDay: 'Last 24 Hours',
    lastWeek: 'Last 7 Days',
    tempChart: 'Temperature History',
    moistureChart: 'Soil Moisture History',
    waterChart: 'Reservoir Level History'
  },
  vi: {
    title: 'Tưới Tiêu Tự Động',
    subtitle: 'Bộ Điều Khiển Khu 1',
    temp: 'Nhiệt Độ',
    moisture: 'Độ Ẩm Đất',
    tank: 'Bể Chứa',
    flow: 'Chu Trình Hệ Thống',
    idle: 'CHỜ',
    pumping: 'ĐANG BƠM',
    soaking: 'THẨM THẤU',
    pump: 'Máy Bơm',
    plant: 'Cây Trồng',
    online: 'KẾT NỐI',
    offline: 'MẤT KẾT NỐI',
    mode: 'Chế Độ',
    auto: 'Tự Động',
    manual: 'Thủ Công',
    empty: 'CẠN NƯỚC',
    safety: 'KHÓA AN TOÀN',
    login: 'Cổng Quản Trị',
    username: 'Tài khoản',
    password: 'Mật khẩu',
    signin: 'Đăng Nhập',
    desc: 'Truy cập an toàn hệ thống tưới tiêu khép kín tự động Khu 1.',
    dashboard: 'Bảng Điều Khiển',
    statistics: 'Thống Kê',
    lastHour: '1 Giờ Qua',
    lastDay: '24 Giờ Qua',
    lastWeek: '7 Ngày Qua',
    tempChart: 'Lịch Sử Nhiệt Độ',
    moistureChart: 'Lịch Sử Độ Ẩm Đất',
    waterChart: 'Lịch Sử Mực Nước'
  }
}

function Login({ onLogin, lang }: { onLogin: (u: User) => void, lang: Lang }) {
  const [username, setUsername] = useState('operator')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const t = i18n[lang]

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const data = LoginSchema.parse({ username, password })
      const baseURL = window.location.hostname === 'localhost' ? 'http://localhost:8000' : ''
      const res = await axios.post(`${baseURL}/api/auth/login`, data)
      onLogin(res.data)
    } catch {
      setError('Invalid credentials')
    }
  }

  const handleGoogleLogin = () => {
    const baseURL = window.location.hostname === 'localhost' ? 'http://localhost:8000' : ''
    window.location.href = `${baseURL}/api/auth/google/login`
  }

  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-zinc-950">
      <div className="hidden lg:flex w-1/2 bg-zinc-900 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-400 via-transparent to-transparent"></div>
        <div className="z-10 p-16 text-white max-w-lg">
          <div className="bg-emerald-500/20 p-4 rounded-2xl inline-block mb-8 border border-emerald-500/30">
             <Sprout size={40} className="text-emerald-400" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-6">{t.title}</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">{t.desc}</p>
        </div>
      </div>
      
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center justify-center lg:justify-start gap-3">
              <LockKeyhole className="text-emerald-500" /> {t.login}
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2">{t.username}</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2">{t.password}</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <button type="submit" className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors">
              {t.signin}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="h-px bg-slate-200 dark:bg-zinc-800 flex-1"></div>
            <span className="text-sm text-slate-500">OR</span>
            <div className="h-px bg-slate-200 dark:bg-zinc-800 flex-1"></div>
          </div>

          <button onClick={handleGoogleLogin} className="mt-6 w-full py-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  )
}

function Statistics({ lang }: { lang: Lang }) {
  const [minutes, setMinutes] = useState(60)
  const [data, setData] = useState<any[]>([])
  const t = i18n[lang]

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const baseURL = window.location.hostname === 'localhost' ? 'http://localhost:8000' : ''
        const res = await axios.get(`${baseURL}/api/telemetry/history?minutes=${minutes}`)
        setData(res.data.map((d: any) => ({
          ...d,
          time: new Date(d.bucket).toLocaleString([], {
             month: minutes > 1440 ? 'numeric' : undefined,
             day: minutes > 1440 ? 'numeric' : undefined,
             hour: '2-digit', 
             minute:'2-digit'
          })
        })))
      } catch {}
    }
    fetchHistory()
    const interval = setInterval(fetchHistory, 60000)
    return () => clearInterval(interval)
  }, [minutes])

  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-6 bg-white dark:bg-zinc-900 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 w-fit">
        <button onClick={() => setMinutes(60)} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${minutes === 60 ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}>{t.lastHour}</button>
        <button onClick={() => setMinutes(1440)} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${minutes === 1440 ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}>{t.lastDay}</button>
        <button onClick={() => setMinutes(10080)} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${minutes === 10080 ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}>{t.lastWeek}</button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 dark:text-zinc-400 mb-6 uppercase tracking-wider flex items-center gap-2"><Droplet size={18} className="text-blue-500"/> {t.moistureChart}</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-colors-zinc-900)' }} />
                <Area type="monotone" dataKey="moisture" name="Moisture %" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#sM)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 dark:text-zinc-400 mb-6 uppercase tracking-wider flex items-center gap-2"><Thermometer size={18} className="text-rose-500"/> {t.tempChart}</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sT" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="temp" name="Temperature °C" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#sT)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 dark:text-zinc-400 mb-6 uppercase tracking-wider flex items-center gap-2"><Database size={18} className="text-cyan-500"/> {t.waterChart}</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sW" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="water" name="Water Level L" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#sW)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardView({ data, user, lang }: { data: z.infer<typeof TelemetrySchema>, user: User, lang: Lang }) {
  const [historyData, setHistoryData] = useState<any[]>([])
  const t = i18n[lang]
  const isPumping = data.pump_state === 'PUMPING'
  const isTankEmpty = data.water_level <= 5.0
  const isManual = data.mode === 'MANUAL'
  const isSafetyLocked = isTankEmpty && isManual

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const baseURL = window.location.hostname === 'localhost' ? 'http://localhost:8000' : ''
        const res = await axios.get(`${baseURL}/api/telemetry/history?minutes=60`)
        setHistoryData(res.data.map((d: any) => ({
          ...d,
          time: new Date(d.bucket).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        })))
      } catch {}
    }
    fetchHistory()
    const interval = setInterval(fetchHistory, 60000)
    return () => clearInterval(interval)
  }, [])

  const sendCommand = async (action: string, mode: string) => {
    if (user.role !== 'operator') return
    const baseURL = window.location.hostname === 'localhost' ? 'http://localhost:8000' : ''
    await axios.post(`${baseURL}/api/command`, {
      action, mode, command_id: uuidv4(), timestamp: Math.floor(Date.now() / 1000)
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 mb-4"><Thermometer size={18} className="text-rose-500" /><span className="font-semibold text-sm">{t.temp}</span></div>
          <div className="flex items-baseline gap-1"><span className="text-4xl font-bold">{data.temperature.toFixed(1)}</span><span className="text-slate-500 dark:text-zinc-400">°C</span></div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400"><Droplet size={18} className="text-blue-500" /><span className="font-semibold text-sm">{t.moisture}</span></div>
            <span className="text-2xl font-bold">{data.soil_moisture.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-zinc-950 rounded-full overflow-hidden mt-auto border border-slate-200 dark:border-zinc-800">
            <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${data.soil_moisture}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400"><Database size={18} className="text-cyan-500" /><span className="font-semibold text-sm">{t.tank}</span></div>
            <span className={`text-2xl font-bold ${isTankEmpty ? 'text-red-500' : ''}`}>{data.water_level.toFixed(0)}L</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-zinc-950 rounded-full overflow-hidden mt-auto border border-slate-200 dark:border-zinc-800">
            <div className={`h-full transition-all duration-700 ${isTankEmpty ? 'bg-red-500' : 'bg-cyan-500'}`} style={{ width: `${data.water_level}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-16 gap-6 border-b border-slate-100 dark:border-zinc-800/50 pb-6">
          <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400"><Activity size={18} /><span className="font-semibold text-sm">{t.flow}</span></div>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex gap-2 text-[11px] font-bold">
              {['IDLE', 'PUMPING', 'SOAKING'].map(state => {
                const isActive = data.pump_state === state;
                const textDisplay = state === 'IDLE' ? t.idle : state === 'PUMPING' ? t.pumping : (isActive ? `${t.soaking} (${data.soak_time_left}s)` : t.soaking);
                return <div key={state} className={`px-4 py-2 rounded-lg border transition-all ${isActive ? (state === 'PUMPING' ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-slate-800 text-white border-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100') : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-zinc-950 dark:text-zinc-600 dark:border-zinc-800/50'}`}>{textDisplay}</div>
              })}
            </div>
            {user.role === 'operator' && (
              <>
                <div className="h-6 w-px bg-slate-200 dark:bg-zinc-800 hidden md:block" />
                <div className="flex items-center gap-4">
                  <div className="flex bg-slate-100 dark:bg-zinc-950 p-1 rounded-lg border border-slate-200 dark:border-zinc-800">
                    <button onClick={() => sendCommand('OFF', 'AUTO')} className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${!isManual ? 'bg-white dark:bg-zinc-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600'}`}>{t.auto}</button>
                    <button onClick={() => sendCommand('OFF', 'MANUAL')} className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${isManual ? 'bg-white dark:bg-zinc-800 shadow-sm text-amber-600 dark:text-amber-500' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600'}`}>{t.manual}</button>
                  </div>
                  {isManual && (
                    <div className="flex gap-2">
                      <button disabled={isPumping || isTankEmpty} onClick={() => sendCommand('ON', 'MANUAL')} className="px-6 py-2 bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all relative group">{isTankEmpty ? t.safety : 'FORCE PUMP'}</button>
                      <button disabled={!isPumping} onClick={() => sendCommand('OFF', 'MANUAL')} className="px-6 py-2 bg-red-500 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all">STOP</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="relative flex items-center justify-between max-w-3xl mx-auto px-4 pb-8">
          <div className="absolute top-1/2 left-16 right-16 -translate-y-1/2 h-2 z-0">
            <svg className="w-full h-full" preserveAspectRatio="none">
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-slate-200 dark:text-zinc-800" />
              {isPumping && <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeDasharray="12 12" className="animate-[dash-flow_1s_linear_infinite]" />}
            </svg>
          </div>
          
          <div className="flex flex-col items-center gap-4 z-10 bg-white dark:bg-zinc-900 p-2">
            <div className={`w-20 h-28 border-2 ${isTankEmpty ? 'border-red-400 dark:border-red-900' : 'border-slate-300 dark:border-zinc-700'} bg-slate-50 dark:bg-zinc-950 rounded-xl overflow-hidden flex flex-col justify-end shadow-inner relative`}>
              <div className={`w-full transition-all duration-700 ${isTankEmpty ? 'bg-red-400 dark:bg-red-500/80' : 'bg-cyan-400 dark:bg-cyan-500/80'}`} style={{ height: `${data.water_level}%` }} />
              <div className={`absolute inset-0 flex items-center justify-center font-mono text-xs font-bold mix-blend-overlay ${isTankEmpty ? 'text-red-900' : 'text-slate-700'}`}>{data.water_level.toFixed(0)}L</div>
            </div>
            <span className={`text-[11px] font-bold uppercase tracking-widest flex items-center gap-1 ${isTankEmpty ? 'text-red-500' : 'text-slate-400 dark:text-zinc-500'}`}><Database size={12}/> {isTankEmpty ? t.empty : t.tank}</span>
          </div>

          <div className="flex flex-col items-center gap-4 z-10 bg-white dark:bg-zinc-900 p-2">
            <div className={`p-5 rounded-full border-2 transition-colors ${isPumping ? 'border-blue-500 text-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : (isSafetyLocked ? 'border-red-300 dark:border-red-900 text-red-400 bg-red-50 dark:bg-red-900/10' : 'border-slate-300 dark:border-zinc-700 text-slate-400 dark:text-zinc-600 bg-slate-50 dark:bg-zinc-950')}`}><Power size={28} /></div>
            <span className={`text-[11px] font-bold uppercase tracking-widest ${isSafetyLocked ? 'text-red-500' : 'text-slate-400 dark:text-zinc-500'}`}>{isSafetyLocked ? t.safety : t.pump}</span>
          </div>

          <div className="flex flex-col items-center gap-4 z-10 bg-white dark:bg-zinc-900 p-2">
            <div className="w-20 h-28 border-2 border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 rounded-b-[2rem] rounded-t-xl overflow-hidden flex flex-col justify-end relative shadow-inner">
              <div className="w-full bg-amber-800/40 dark:bg-amber-900/40 transition-all duration-700" style={{ height: `${data.soil_moisture}%` }} />
              <div className="absolute inset-0 flex items-center justify-center pb-4"><Sprout size={32} strokeWidth={1.5} className={isPumping ? 'text-emerald-500' : 'text-emerald-600/50 dark:text-emerald-600/30'} /></div>
            </div>
            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1"><Droplet size={12}/> {t.plant}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 dark:text-zinc-400 mb-6 uppercase tracking-wider">{t.moisture} & {t.tank}</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" />
                <Area type="monotone" dataKey="moisture" name="Moisture %" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorMoisture)" />
                <Area type="monotone" dataKey="water" name="Water L" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorWater)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 dark:text-zinc-400 mb-6 uppercase tracking-wider">{t.temp}</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="temp" name="Temp °C" stroke="#f43f5e" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

function MainApp({ user, onLogout, lang, setLang }: { user: User, onLogout: () => void, lang: Lang, setLang: (l: Lang) => void }) {
  const [view, setView] = useState<'dashboard' | 'stats'>('dashboard')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [time, setTime] = useState(new Date())
  const t = i18n[lang]
  const [data, setData] = useState(TelemetrySchema.parse({}))
  const [wsStatus, setWsStatus] = useState('OFFLINE')

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    let ws: WebSocket
    let retryCount = 0

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host
      ws = new WebSocket(`${protocol}//${host}/ws`)
      
      ws.onopen = () => { setWsStatus('ONLINE'); retryCount = 0 }
      ws.onclose = () => {
        setWsStatus('OFFLINE')
        timeoutId = setTimeout(connect, Math.min(1000 * Math.pow(2, retryCount++), 8000))
      }
      ws.onmessage = (e) => {
        try { setData(TelemetrySchema.parse(JSON.parse(e.data))) } catch { }
      }
    }
    connect()
    return () => { clearTimeout(timeoutId); if (ws) { ws.onclose = null; ws.close() } }
  }, [])

  return (
    <div className={theme}>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100 p-4 md:p-8 font-sans transition-colors duration-300">
        <div className="max-w-6xl mx-auto space-y-6">
          <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 md:p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xl shadow-md border-2 border-emerald-200 dark:border-emerald-800">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold">Hi, {user.username}</h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                  {time.toLocaleDateString()} {time.toLocaleTimeString()}
                  <span className="px-2 py-0.5 bg-slate-200 dark:bg-zinc-800 rounded-md text-[10px] uppercase font-bold text-slate-700 dark:text-zinc-300">
                    {user.role}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-100 dark:bg-zinc-950 px-2 py-2 rounded-xl border border-slate-200 dark:border-zinc-800">
              <div className="hidden md:flex items-center gap-4 px-4 border-r border-slate-300 dark:border-zinc-700">
                <div className="flex items-center gap-1.5"><Battery size={14} className="text-slate-400 dark:text-zinc-500"/><span className="text-xs font-mono font-medium text-slate-600 dark:text-zinc-400">{data.battery_v}V</span></div>
                <div className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400 dark:text-zinc-500"/><span className="text-xs font-mono font-medium text-slate-600 dark:text-zinc-400">{Math.floor(data.uptime_s/3600)}h {Math.floor((data.uptime_s%3600)/60)}m {data.uptime_s%60}s</span></div>
                <div className="flex items-center gap-1.5"><SignalHigh size={14} className="text-slate-400 dark:text-zinc-500"/><span className="text-xs font-mono font-medium text-slate-600 dark:text-zinc-400">{data.signal_dbm}dBm</span></div>
              </div>
              <button onClick={() => setLang(lang === 'en' ? 'vi' : 'en')} className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"><Languages size={18} /><span className="uppercase">{lang}</span></button>
              <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-colors">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
              <button onClick={async () => { await axios.post(window.location.hostname === 'localhost' ? 'http://localhost:8000/api/auth/logout' : '/api/auth/logout'); onLogout() }} className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg text-red-500 transition-colors flex items-center gap-1 font-bold text-sm">
                <LogOut size={18}/>
                <span className="hidden sm:inline">Logout</span>
              </button>
              <div className="w-px h-6 bg-slate-300 dark:bg-zinc-700" />
              <div className="px-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${wsStatus === 'ONLINE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                <span className="text-xs font-bold tracking-wide">{wsStatus === 'ONLINE' ? t.online : t.offline}</span>
              </div>
            </div>
          </header>

          <div className="flex gap-2 p-1 bg-slate-200/50 dark:bg-zinc-900/50 w-fit rounded-xl">
             <button onClick={() => setView('dashboard')} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${view === 'dashboard' ? 'bg-white dark:bg-zinc-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'}`}><LayoutDashboard size={18}/> {t.dashboard}</button>
             <button onClick={() => setView('stats')} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${view === 'stats' ? 'bg-white dark:bg-zinc-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'}`}><BarChart3 size={18}/> {t.statistics}</button>
          </div>

          {view === 'dashboard' ? <DashboardView data={data} user={user} lang={lang} /> : <Statistics lang={lang} />}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [lang, setLang] = useState<Lang>('en')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const baseURL = window.location.hostname === 'localhost' ? 'http://localhost:8000' : ''
        const res = await axios.get(`${baseURL}/api/auth/me`)
        setUser(res.data)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  if (loading) return null

  return !user ? (
    <Login onLogin={setUser} lang={lang} />
  ) : (
    <MainApp user={user} onLogout={() => setUser(null)} lang={lang} setLang={setLang} />
  )
}
