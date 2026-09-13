import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Thermometer, Database, Power, Sprout, Sun, Moon, Languages, Activity, Droplet, Battery, SignalHigh, Clock, LockKeyhole, LogOut } from 'lucide-react'
import axios from 'axios'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

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
    desc: 'Secure access to Zone 1 closed-loop automated irrigation system.'
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
    desc: 'Truy cập an toàn hệ thống tưới tiêu khép kín tự động Khu 1.'
  }
}

function Login({ onLogin, lang }: { onLogin: (role: Role) => void, lang: Lang }) {
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
      onLogin(res.data.role)
    } catch {
      setError('Invalid credentials')
    }
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
            <p className="text-slate-500 dark:text-zinc-400 mt-3">Authenticate to access telemetry and commands</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2">{t.username}</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2">{t.password}</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
              />
            </div>
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <button type="submit" className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors shadow-md">
              {t.signin}
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-center gap-4 text-xs text-slate-500 dark:text-zinc-500">
             <span>Test Operator: operator / admin123</span>
             <span>Test Viewer: viewer / view123</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Dashboard({ role, onLogout, lang, setLang }: { role: Role, onLogout: () => void, lang: Lang, setLang: (l: Lang) => void }) {
  const [data, setData] = useState(TelemetrySchema.parse({}))
  const [wsStatus, setWsStatus] = useState('OFFLINE')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [isManual, setIsManual] = useState(false)

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

  const sendCommand = async (action: string, mode: string) => {
    if (role !== 'operator') return
    const baseURL = window.location.hostname === 'localhost' ? 'http://localhost:8000' : ''
    await axios.post(`${baseURL}/api/command`, {
      action, mode, command_id: uuidv4(), timestamp: Math.floor(Date.now() / 1000)
    })
  }

  const t = i18n[lang]
  const isPumping = data.pump_state === 'PUMPING'
  const isTankEmpty = data.water_level <= 5.0
  const isSafetyLocked = isTankEmpty && isManual
  
  const generateSparkline = (history: number[]) => {
    if (history.length === 0) return ''
    const min = 0, max = 100, w = 100, h = 40
    return history.map((val, i) => `${(i / (history.length - 1)) * w},${h - ((val - min) / (max - min)) * h}`).join(' ')
  }

  return (
    <div className={theme}>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100 p-4 md:p-8 font-sans transition-colors duration-300">
        <div className="max-w-5xl mx-auto space-y-6">
          <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 md:p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                <Sprout className="text-emerald-600 dark:text-emerald-500" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t.title}</h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                  {t.subtitle} 
                  <span className="px-2 py-0.5 bg-slate-200 dark:bg-zinc-800 rounded-md text-[10px] uppercase font-bold">{role}</span>
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
              <button onClick={async () => { await axios.post(window.location.hostname === 'localhost' ? 'http://localhost:8000/api/auth/logout' : '/api/auth/logout'); onLogout() }} className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg text-red-500 transition-colors"><LogOut size={18}/></button>
              <div className="w-px h-6 bg-slate-300 dark:bg-zinc-700" />
              <div className="px-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${wsStatus === 'ONLINE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                <span className="text-xs font-bold tracking-wide">{wsStatus === 'ONLINE' ? t.online : t.offline}</span>
              </div>
            </div>
          </header>

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
              <div className="flex-1 min-h-[40px] w-full mt-2 opacity-30 dark:opacity-50 pointer-events-none">
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                  <polyline points={generateSparkline(data.history)} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-zinc-950 rounded-full overflow-hidden mt-4 border border-slate-200 dark:border-zinc-800">
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
                {role === 'operator' && (
                  <>
                    <div className="h-6 w-px bg-slate-200 dark:bg-zinc-800 hidden md:block" />
                    <div className="flex items-center gap-4">
                      <div className="flex bg-slate-100 dark:bg-zinc-950 p-1 rounded-lg border border-slate-200 dark:border-zinc-800">
                        <button onClick={() => { setIsManual(false); sendCommand('OFF', 'AUTO') }} className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${!isManual ? 'bg-white dark:bg-zinc-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600'}`}>{t.auto}</button>
                        <button onClick={() => { setIsManual(true); sendCommand('OFF', 'MANUAL') }} className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${isManual ? 'bg-white dark:bg-zinc-800 shadow-sm text-amber-600 dark:text-amber-500' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600'}`}>{t.manual}</button>
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

            <div className="relative flex items-center justify-between max-w-4xl mx-auto px-4 pb-8">
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
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [role, setRole] = useState<Role | null>(null)
  const [lang, setLang] = useState<Lang>('en')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const baseURL = window.location.hostname === 'localhost' ? 'http://localhost:8000' : ''
        const res = await axios.get(`${baseURL}/api/auth/me`)
        setRole(res.data.role)
      } catch {
        setRole(null)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  if (loading) return null

  return !role ? (
    <Login onLogin={setRole} lang={lang} />
  ) : (
    <Dashboard role={role} onLogout={() => setRole(null)} lang={lang} setLang={setLang} />
  )
}
