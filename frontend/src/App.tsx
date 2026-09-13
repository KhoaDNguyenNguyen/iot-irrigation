import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Droplets, Thermometer, Database, Power, Sprout, Sun, Moon, Languages, Activity, Wifi, Droplet, Battery, SignalHigh, Clock } from 'lucide-react'
import axios from 'axios'
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts'

type Lang = 'en' | 'vi'

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
    trend: 'Trend (Last 20 ticks)',
    empty: 'TANK EMPTY',
    safety: 'SAFETY LOCK'
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
    trend: 'Xu Hướng (20 chu kỳ)',
    empty: 'CẠN NƯỚC',
    safety: 'KHÓA AN TOÀN'
  }
}

const queryClient = new QueryClient()

function Dashboard() {
  const [data, setData] = useState({ 
    soil_moisture: 0, 
    temperature: 0, 
    water_level: 0,
    pump_state: 'IDLE',
    rtt_ms: 0,
    mode: 'AUTO',
    history: [] as number[],
    battery_v: 0,
    signal_dbm: 0,
    uptime_s: 0
  })
  const [wsStatus, setWsStatus] = useState('OFFLINE')
  const [lang, setLang] = useState<Lang>('en')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [isManual, setIsManual] = useState(false)

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws')
    ws.onopen = () => setWsStatus('ONLINE')
    ws.onclose = () => setWsStatus('OFFLINE')
    ws.onmessage = (e) => setData(JSON.parse(e.data))
    return () => ws.close()
  }, [])

  const { data: historyData } = useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/telemetry/history?minutes=60')
        return res.data.map((d: any) => ({
          time: new Date(d.bucket).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          moisture: d.moisture,
          temp: d.temp
        }))
      } catch {
        return []
      }
    },
    refetchInterval: 5000
  })

  const sendCommand = async (action: string, mode: string) => {
    await axios.post('http://localhost:8000/api/command', { action, mode })
  }

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}h ${m}m ${s}s`
  }

  const t = i18n[lang]
  const isPumping = data.pump_state === 'PUMPING'
  const isTankEmpty = data.water_level <= 5.0
  const isSafetyLocked = isTankEmpty && isManual
  
  const generateSparkline = (history: number[]) => {
    if (history.length === 0) return ''
    const min = 0
    const max = 100
    const w = 100
    const h = 40
    return history.map((val, i) => {
      const x = (i / (history.length - 1)) * w
      const y = h - ((val - min) / (max - min)) * h
      return `${x},${y}`
    }).join(' ')
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
                <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium">{t.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-100 dark:bg-zinc-950 px-2 py-2 rounded-xl border border-slate-200 dark:border-zinc-800">
              <div className="hidden md:flex items-center gap-4 px-4 border-r border-slate-300 dark:border-zinc-700">
                <div className="flex items-center gap-1.5" title="Battery Voltage (UPS 18650)">
                  <Battery size={14} className="text-slate-400 dark:text-zinc-500" />
                  <span className="text-xs font-mono font-medium text-slate-600 dark:text-zinc-400">{data.battery_v}V</span>
                </div>
                <div className="flex items-center gap-1.5" title="ESP32 Uptime">
                  <Clock size={14} className="text-slate-400 dark:text-zinc-500" />
                  <span className="text-xs font-mono font-medium text-slate-600 dark:text-zinc-400">{formatUptime(data.uptime_s)}</span>
                </div>
                <div className="flex items-center gap-1.5" title="RSSI Signal Strength">
                  <SignalHigh size={14} className="text-slate-400 dark:text-zinc-500" />
                  <span className="text-xs font-mono font-medium text-slate-600 dark:text-zinc-400">{data.signal_dbm}dBm</span>
                </div>
              </div>

              <button 
                onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
                className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Languages size={18} />
                <span className="uppercase">{lang}</span>
              </button>
              <div className="w-px h-6 bg-slate-300 dark:bg-zinc-700" />
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <div className="w-px h-6 bg-slate-300 dark:bg-zinc-700" />
              <div className="px-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${wsStatus === 'ONLINE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                <span className="text-xs font-bold tracking-wide">{wsStatus === 'ONLINE' ? t.online : t.offline}</span>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 mb-4">
                <Thermometer size={18} className="text-rose-500" />
                <span className="font-semibold text-sm">{t.temp}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{data.temperature.toFixed(1)}</span>
                <span className="text-slate-500 dark:text-zinc-400">°C</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm flex flex-col relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
                  <Droplets size={18} className="text-blue-500" />
                  <span className="font-semibold text-sm">{t.moisture}</span>
                </div>
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
                <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
                  <Database size={18} className="text-cyan-500" />
                  <span className="font-semibold text-sm">{t.tank}</span>
                </div>
                <span className={`text-2xl font-bold ${isTankEmpty ? 'text-red-500' : ''}`}>{data.water_level.toFixed(0)}L</span>
              </div>
              
              <div className="w-full h-2 bg-slate-100 dark:bg-zinc-950 rounded-full overflow-hidden mt-auto border border-slate-200 dark:border-zinc-800">
                <div className={`h-full transition-all duration-700 ${isTankEmpty ? 'bg-red-500' : 'bg-cyan-500'}`} style={{ width: `${data.water_level}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-16 gap-6 border-b border-slate-100 dark:border-zinc-800/50 pb-6">
              
              <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
                <Activity size={18} />
                <span className="font-semibold text-sm">{t.flow}</span>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-6">
                
                <div className="flex gap-2 text-[11px] font-bold">
                  {['IDLE', 'PUMPING', 'SOAKING'].map(state => (
                    <div key={state} className={`px-4 py-2 rounded-lg border transition-all ${
                      data.pump_state === state 
                        ? (state === 'PUMPING' 
                            ? 'bg-blue-500 text-white border-blue-500 shadow-sm' 
                            : 'bg-slate-800 text-white border-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100')
                        : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-zinc-950 dark:text-zinc-600 dark:border-zinc-800/50'
                    }`}>
                      {state === 'IDLE' ? t.idle : state === 'PUMPING' ? t.pumping : t.soaking}
                    </div>
                  ))}
                </div>

                <div className="h-6 w-px bg-slate-200 dark:bg-zinc-800 hidden md:block" />

                <div className="flex items-center gap-4">
                  <div className="flex bg-slate-100 dark:bg-zinc-950 p-1 rounded-lg border border-slate-200 dark:border-zinc-800">
                    <button 
                      onClick={() => { setIsManual(false); sendCommand('OFF', 'AUTO') }}
                      className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${!isManual ? 'bg-white dark:bg-zinc-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600'}`}
                    >
                      {t.auto}
                    </button>
                    <button 
                      onClick={() => { setIsManual(true); sendCommand('OFF', 'MANUAL') }}
                      className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${isManual ? 'bg-white dark:bg-zinc-800 shadow-sm text-amber-600 dark:text-amber-500' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600'}`}
                    >
                      {t.manual}
                    </button>
                  </div>
                  
                  {isManual && (
                    <div className="flex gap-2">
                      <button 
                        disabled={isPumping || isTankEmpty}
                        onClick={() => sendCommand('ON', 'MANUAL')}
                        className="px-6 py-2 bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all relative group"
                      >
                        {isTankEmpty ? t.safety : 'FORCE PUMP'}
                      </button>
                      <button 
                        disabled={!isPumping}
                        onClick={() => sendCommand('OFF', 'MANUAL')}
                        className="px-6 py-2 bg-red-500 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                      >
                        STOP
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>

            <div className="relative flex items-center justify-between max-w-4xl mx-auto px-4 pb-8">
              
              <div className="absolute top-1/2 left-16 right-16 -translate-y-1/2 h-2 z-0">
                <svg className="w-full h-full" preserveAspectRatio="none">
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-slate-200 dark:text-zinc-800" />
                  {isPumping && (
                    <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeDasharray="12 12" className="animate-[dash-flow_1s_linear_infinite]" />
                  )}
                </svg>
              </div>
              
              <div className="flex flex-col items-center gap-4 z-10 bg-white dark:bg-zinc-900 p-2">
                <div className={`w-20 h-28 border-2 ${isTankEmpty ? 'border-red-400 dark:border-red-900' : 'border-slate-300 dark:border-zinc-700'} bg-slate-50 dark:bg-zinc-950 rounded-xl overflow-hidden flex flex-col justify-end shadow-inner relative`}>
                  <div className={`w-full transition-all duration-700 ${isTankEmpty ? 'bg-red-400 dark:bg-red-500/80' : 'bg-cyan-400 dark:bg-cyan-500/80'}`} style={{ height: `${data.water_level}%` }} />
                  <div className={`absolute inset-0 flex items-center justify-center font-mono text-xs font-bold mix-blend-overlay ${isTankEmpty ? 'text-red-900' : 'text-slate-700'}`}>
                    {data.water_level.toFixed(0)}L
                  </div>
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-widest flex items-center gap-1 ${isTankEmpty ? 'text-red-500' : 'text-slate-400 dark:text-zinc-500'}`}>
                  <Database size={12}/> {isTankEmpty ? t.empty : t.tank}
                </span>
              </div>

              <div className="flex flex-col items-center gap-4 z-10 bg-white dark:bg-zinc-900 p-2">
                <div className={`p-5 rounded-full border-2 transition-colors ${
                  isPumping 
                    ? 'border-blue-500 text-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                    : (isSafetyLocked ? 'border-red-300 dark:border-red-900 text-red-400 bg-red-50 dark:bg-red-900/10' : 'border-slate-300 dark:border-zinc-700 text-slate-400 dark:text-zinc-600 bg-slate-50 dark:bg-zinc-950')
                }`}>
                  <Power size={28} />
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-widest ${isSafetyLocked ? 'text-red-500' : 'text-slate-400 dark:text-zinc-500'}`}>
                  {isSafetyLocked ? t.safety : t.pump}
                </span>
              </div>

              <div className="flex flex-col items-center gap-4 z-10 bg-white dark:bg-zinc-900 p-2">
                <div className="w-20 h-28 border-2 border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 rounded-b-[2rem] rounded-t-xl overflow-hidden flex flex-col justify-end relative shadow-inner">
                  <div className="w-full bg-amber-800/40 dark:bg-amber-900/40 transition-all duration-700" style={{ height: `${data.soil_moisture}%` }} />
                  <div className="absolute inset-0 flex items-center justify-center pb-4">
                     <Sprout size={32} strokeWidth={1.5} className={isPumping ? 'text-emerald-500' : 'text-emerald-600/50 dark:text-emerald-600/30'} />
                  </div>
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
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  )
}
