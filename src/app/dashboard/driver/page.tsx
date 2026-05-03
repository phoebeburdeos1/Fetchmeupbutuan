"use client"

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  LogOut, 
  MapPin, 
  Navigation, 
  Power, 
  Wallet, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  Loader2, 
  Star, 
  ChevronRight, 
  Activity,
  X,
  Zap,
  ArrowRight,
  PhoneCall,
  ShieldAlert,
  UserCheck,
  RefreshCcw,
  List,
  Bell,
  Home,
  User,
  LayoutDashboard,
  History as HistoryIcon,
  Car,
  ChevronLeft,
  Settings,
  HelpCircle,
  ShieldCheck,
  Mail,
  Phone,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  History,
  Filter,
  Receipt,
  Calendar,
  Tag,
  User as UserIcon,
  Camera,
  Edit2,
  Key,
  Lock
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import nextDynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export const dynamic = 'force-dynamic'

const MapComponent = nextDynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-50 animate-pulse flex items-center justify-center text-slate-400">Loading Map...</div>
})

interface Ride {
  id: string;
  status: string;
  pickup_location: string;
  destination: string;
  fare_estimate: number;
  driver_id: string | null;
  user_id: string;
  vehicle_type: string;
  created_at: string;
}

export default function DriverDashboard() {
  const [isOnline, setIsOnline] = useState(false)
  const [earnings, setEarnings] = useState(1450.00)
  const [pendingRides, setPendingRides] = useState<Ride[]>([])
  const [activeRide, setActiveRide] = useState<Ride | null>(null)
  const [passengerProfile, setPassengerProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dash')
  const [profileTab, setProfileTab] = useState<'menu' | 'settings' | 'history' | 'support' | 'password'>('menu')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [allTrips, setAllTrips] = useState<Ride[]>([])
  const [filter, setFilter] = useState('All')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [selectedWallet, setSelectedWallet] = useState('GCash')
  const [selectedHistoryTrip, setSelectedHistoryTrip] = useState<Ride | null>(null)
  const [historyPassenger, setHistoryPassenger] = useState<any>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const fetchRides = async () => {
    if (!isOnline) { setPendingRides([]); return; }
    const { data, error } = await supabase.from('rides').select('*').eq('status', 'pending').order('created_at', { ascending: false })
    if (!error && data) {
      setPendingRides(data as Ride[])
    }
  }

  const fetchAllTrips = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('rides').select('*').eq('driver_id', user.id).order('created_at', { ascending: false })
    if (data) setAllTrips(data as Ride[])
  }

  const checkActiveRide = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (profile) setUserProfile(profile)

    const { data: active } = await supabase.from('rides').select('*').eq('driver_id', user.id).in('status', ['accepted', 'arrived', 'ongoing']).maybeSingle()
    if (active) { 
      setActiveRide(active as Ride); 
      setIsOnline(true);
      const { data: psg } = await supabase.from('profiles').select('*').eq('id', active.user_id).single()
      setPassengerProfile(psg)
    } else {
      setActiveRide(null)
      setPassengerProfile(null)
    }
  }

  useEffect(() => {
    checkActiveRide()
    fetchRides()
    fetchAllTrips()
    const channel = supabase.channel('driver_realtime_v21')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => {
        fetchRides(); checkActiveRide(); fetchAllTrips();
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isOnline])

  const handleOpenHistoryDetail = async (ride: Ride) => {
    setSelectedHistoryTrip(ride)
    setHistoryPassenger(null)
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', ride.user_id)
      .maybeSingle()
    
    if (error) {
      console.error("Fetch error:", error)
      return
    }
    
    if (data) {
      setHistoryPassenger(data)
    } else {
      setHistoryPassenger({ full_name: 'Unknown Passenger' })
    }
  }

  const handleLogout = async () => {
    document.cookie = "admin_access=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;"
    await supabase.auth.signOut()
    router.push('/login')
  }

  const acceptRide = async (ride: Ride) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('rides').update({ status: 'accepted', driver_id: user.id }).eq('id', ride.id).select().single()
    if (error) { toast.error("Ride expired"); } 
    else { setActiveRide(data as Ride); fetchRides(); }
  }

  const updateRideStatus = async (status: string) => {
    if (!activeRide) return
    const targetStatus = status === 'arrived' ? 'ongoing' : status;
    const { error } = await supabase.from('rides').update({ status: targetStatus }).eq('id', activeRide.id)
    if (!error) {
      if (status === 'completed') { setEarnings(prev => prev + Number(activeRide.fare_estimate)); setActiveRide(null); }
      else { checkActiveRide() }
    }
  }

  const filteredTrips = useMemo(() => {
    if (filter === 'All') return allTrips;
    if (filter === 'Completed') return allTrips.filter(r => r.status === 'completed');
    if (filter === 'Cancelled') return allTrips.filter(r => r.status === 'cancelled');
    return allTrips;
  }, [allTrips, filter])

  useEffect(() => { setTimeout(() => setLoading(false), 500) }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-10 h-10 animate-spin text-emerald-600" /></div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col pb-28 overflow-hidden">
      <AnimatePresence mode="wait">
        {activeTab === 'dash' ? (
          <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
            <header className="bg-white px-6 pt-12 pb-4 flex justify-between items-center sticky top-0 z-50 border-b border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100/50"><Car className="w-6 h-6" /></div>
                <div><h1 className="text-base font-black text-slate-900 uppercase tracking-tight italic">Driver Dashboard</h1><p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] leading-none">Fetch Me Up Partner</p></div>
              </div>
              <div className="flex items-center gap-3">
                <button className="w-11 h-11 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 relative hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-100"><Bell className="w-5 h-5" /><span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" /></button>
                <button onClick={() => { setActiveTab('profile'); setProfileTab('menu'); }} className="w-11 h-11 rounded-full bg-emerald-100 border-4 border-white shadow-xl flex items-center justify-center text-emerald-600 font-black text-base transition-transform active:scale-95">{userProfile?.full_name?.charAt(0) || 'D'}</button>
              </div>
            </header>

            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-8 shadow-2xl relative overflow-hidden">
              <div className="max-w-md mx-auto flex items-center justify-between gap-6 relative z-10">
                 <div className="space-y-1">
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-white w-fit"><Star className="w-4 h-4 fill-amber-400 text-amber-400" /> <span className="text-xs font-black">4.9</span></div>
                    <p className="text-[9px] font-black text-emerald-100 uppercase tracking-widest opacity-80 mt-2">Today's Earnings</p>
                    <p className="text-3xl font-black text-white italic tracking-tighter">₱{earnings.toFixed(2)}</p>
                 </div>
                 <div className="flex flex-col items-end gap-3">
                    <div className="text-right text-white"><p className="text-[9px] font-black uppercase opacity-60 tracking-widest">Completed</p><p className="text-xl font-black italic">{allTrips.filter(t => t.status === 'completed').length} Rides</p></div>
                    <button onClick={() => setIsOnline(!isOnline)} className={`px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl ${isOnline ? 'bg-white text-emerald-600 shadow-emerald-900/20' : 'bg-emerald-800 text-emerald-200 shadow-inner'}`}><Power className="w-4 h-4" /> {isOnline ? 'Online' : 'Offline'}</button>
                 </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            </div>

            <main className="p-6 space-y-6 max-w-md mx-auto flex-1 w-full relative z-20 -mt-6">
              <AnimatePresence mode="wait">
                {activeRide ? (
                  <motion.div key="active_ride" initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 space-y-8 relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500" />
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-5">
                           <div className="w-16 h-16 bg-slate-50 rounded-[1.75rem] flex items-center justify-center text-3xl font-black text-emerald-600 border-2 border-white shadow-xl shadow-inner">{passengerProfile?.full_name?.charAt(0) || 'P'}</div>
                           <div><h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">{passengerProfile?.full_name || 'Passenger'}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-1"><MapPin className="w-3 h-3" /> {activeRide.pickup_location}</p></div>
                        </div>
                        <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse border border-emerald-100">{activeRide.status.toUpperCase()}</div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <a href={`tel:${passengerProfile?.phone_number || '09123456789'}`} className="bg-emerald-500 text-white p-6 rounded-[2.25rem] flex flex-col items-center justify-center gap-3 shadow-xl shadow-emerald-100 active:scale-95 transition-all"><PhoneCall className="w-8 h-8" /><span className="text-[10px] font-black uppercase tracking-widest">Call User</span></a>
                        <button onClick={() => toast.error("SOS Alert Triggered!")} className="bg-red-500 text-white p-6 rounded-[2.25rem] flex flex-col items-center justify-center gap-3 shadow-xl shadow-red-100 active:scale-95 transition-all"><ShieldAlert className="w-8 h-8" /><span className="text-[10px] font-black uppercase tracking-widest">Driver SOS</span></button>
                     </div>
                     <div className="space-y-3 pt-2">
                        <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] ml-1">Ride Lifecycle</h4>
                        <div className="grid grid-cols-1 gap-4">
                           {activeRide.status === 'accepted' && <button onClick={() => updateRideStatus('arrived')} className="w-full py-5 bg-blue-600 text-white rounded-[1.75rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-100 active:scale-95 transition-all">I HAVE ARRIVED</button>}
                           {activeRide.status === 'ongoing' && <button onClick={() => updateRideStatus('completed')} className="w-full py-5 bg-slate-900 text-white rounded-[1.75rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 active:scale-95 transition-all flex items-center justify-center gap-3">COMPLETE TRIP <ChevronRight className="w-5 h-5" /></button>}
                        </div>
                     </div>
                  </motion.div>
                ) : (
                  <motion.div key="no_active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                    <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white h-96 relative group">
                       <MapComponent center={[8.9475, 125.5406]} />
                       {!isOnline && <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md z-30 flex items-center justify-center text-white p-10 text-center flex-col gap-6"><div className="p-6 bg-white/10 rounded-full"><Power className="w-16 h-16 opacity-30" /></div><p className="font-black uppercase text-base tracking-[0.2em] italic">Go Online to receive requests</p></div>}
                    </div>
                    {isOnline && (
                      <div className="space-y-5">
                        <div className="flex items-center justify-between px-2"><h3 className="font-black text-[11px] text-slate-400 uppercase tracking-[0.3em]">Live Requests</h3><div className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase">{pendingRides.length} Active</div></div>
                        {pendingRides.map(ride => (
                          <div key={ride.id} className="bg-white rounded-[2.5rem] p-7 shadow-xl border border-slate-100 flex flex-col gap-5 hover:border-emerald-200 transition-all group">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-4"><div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner"><Zap className="w-7 h-7" /></div><div><p className="text-sm font-black text-slate-900 uppercase italic tracking-tight">{ride.vehicle_type}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pickup: {ride.pickup_location}</p></div></div>
                              <p className="text-2xl font-black text-emerald-600 italic">₱{ride.fare_estimate}</p>
                            </div>
                            <button onClick={() => acceptRide(ride)} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">Accept Trip Request</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </motion.div>
        ) : activeTab === 'activity' ? (
          <motion.div key="activity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col bg-white">
            <header className="px-6 pt-16 pb-6 flex items-center justify-between sticky top-0 bg-white z-50">
              <button onClick={() => setActiveTab('dash')} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 transition-all active:scale-90 shadow-sm border border-slate-100"><ChevronLeft className="w-7 h-7" /></button>
              <h2 className="text-xl font-black uppercase tracking-[0.2em] italic">Trip History</h2>
              <div className="w-12" />
            </header>
            
            <div className="px-6 flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
              {['All', 'Completed', 'Cancelled'].map(c => (
                <button key={c} onClick={() => setFilter(c)} className={`px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${filter === c ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{c}</button>
              ))}
            </div>

            <div className="flex-1 px-6 pb-20 overflow-y-auto space-y-4">
              {filteredTrips.map((ride: Ride, i: number) => (
                <div key={i} onClick={() => handleOpenHistoryDetail(ride)} className="p-6 bg-slate-50 rounded-[2.25rem] border border-slate-100 flex items-center justify-between group transition-all hover:bg-white hover:shadow-xl hover:border-emerald-50 cursor-pointer">
                   <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-emerald-500 transition-all shadow-sm"><Clock className="w-6 h-6" /></div>
                      <div>
                         <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none mb-2 truncate max-w-[150px]">{ride.pickup_location} <ArrowRight className="inline w-3 h-3 mx-1 text-emerald-500" /> {ride.destination}</p>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(ride.created_at).toLocaleDateString()} • {new Date(ride.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                   </div>
                   <p className={`text-base font-black italic ${ride.status === 'completed' ? 'text-emerald-600' : 'text-red-400'}`}>₱{ride.fare_estimate}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ) : activeTab === 'wallet' ? (
          <motion.div key="wallet" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col bg-white">
             <header className="px-6 pt-16 pb-6 flex items-center justify-between sticky top-0 bg-white z-50">
                <button onClick={() => setActiveTab('dash')} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 transition-all active:scale-90 shadow-sm border border-slate-100"><ChevronLeft className="w-7 h-7" /></button>
                <h2 className="text-xl font-black uppercase tracking-[0.2em] italic">E-Wallet</h2>
                <div className="w-12" />
             </header>

             <div className="px-6 space-y-8 pb-32">
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
                   <div className="relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">Available for Withdrawal</p>
                      <h3 className="text-5xl font-black italic tracking-tighter mb-8">₱{earnings.toFixed(2)}</h3>
                      <div className="flex justify-between items-center bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                         <div className="flex items-center gap-3"><ArrowDownLeft className="text-emerald-300 w-5 h-5" /> <span className="text-[10px] font-black uppercase">Earned Today</span></div>
                         <span className="text-sm font-black italic">₱{allTrips.filter(t => t.status === 'completed' && new Date(t.created_at).toDateString() === new Date().toDateString()).reduce((acc, r) => acc + r.fare_estimate, 0).toFixed(2)}</span>
                      </div>
                   </div>
                   <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                </div>

                <div className="space-y-5">
                   <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Transfer to Digital Wallet</h3>
                   <div className="grid grid-cols-2 gap-4">
                      {['GCash', 'Maya'].map(w => (
                        <button key={w} onClick={() => setSelectedWallet(w)} className={`p-6 rounded-[2.25rem] border-2 flex flex-col items-center gap-3 transition-all ${selectedWallet === w ? 'border-emerald-500 bg-emerald-50 shadow-xl' : 'border-slate-50 bg-slate-50/50'}`}>
                           <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-blue-600 italic shadow-sm border border-slate-100">{w === 'GCash' ? 'G' : 'M'}</div>
                           <span className="text-[10px] font-black uppercase tracking-widest">{w}</span>
                           <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedWallet === w ? 'border-emerald-500 bg-emerald-500' : 'border-slate-200'}`}>{selectedWallet === w && <CheckCircle className="w-3 h-3 text-white" />}</div>
                        </button>
                      ))}
                   </div>
                   <div className="relative"><span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">₱</span><input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="0.00" className="w-full pl-10 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] outline-none focus:border-emerald-500 font-black text-slate-700 shadow-inner" /></div>
                   <button onClick={() => { toast.success("Cash out successful!"); setEarnings(prev => prev - (Number(withdrawAmount) || 0)); setWithdrawAmount(''); }} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-emerald-200 active:scale-95 transition-all">Confirm Cash Out</button>
                </div>

                <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-100 space-y-6">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Revenue Performance</h3>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center"><div className="flex items-center gap-3 text-slate-600"><div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"><Car className="w-5 h-5" /></div><span className="text-xs font-black uppercase">Total Trips</span></div><span className="text-sm font-black italic">{allTrips.filter(t => t.status === 'completed').length}</span></div>
                      <div className="flex justify-between items-center"><div className="flex items-center gap-3 text-slate-600"><div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"><Zap className="w-5 h-5 text-amber-500" /></div><span className="text-xs font-black uppercase">Platform Fees (15%)</span></div><span className="text-sm font-black italic text-red-400">₱{(allTrips.filter(t => t.status === 'completed').reduce((acc, r) => acc + r.fare_estimate, 0) * 0.15).toFixed(2)}</span></div>
                   </div>
                </div>
             </div>
          </motion.div>
        ) : (
          <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 bg-slate-50 flex flex-col min-h-screen">
               {profileTab !== 'settings' && profileTab !== 'password' ? (
                 <div className="bg-gradient-to-b from-emerald-600 via-emerald-600 to-emerald-700 pt-16 pb-32 px-6 text-center text-white relative rounded-b-[4rem] shadow-2xl">
                    <button onClick={() => { if (profileTab === 'menu') setActiveTab('dash'); else setProfileTab('menu'); }} className="absolute left-6 top-16 w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center transition-transform active:scale-90 border border-white/20 backdrop-blur-sm"><ChevronLeft className="w-7 h-7" /></button>
                    <h2 className="text-xl font-black uppercase tracking-[0.3em] mb-10 italic drop-shadow-lg">
                      {profileTab === 'menu' ? 'Driver Profile' : 'Support Center'}
                    </h2>
                    <div className="relative inline-block">
                      <div className="w-32 h-32 bg-white rounded-[3.5rem] relative z-10 mx-auto flex items-center justify-center text-5xl font-black shadow-2xl text-emerald-600 border-4 border-emerald-400/30 overflow-hidden">
                          {userProfile?.avatar_url ? (
                            <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            userProfile?.full_name?.charAt(0) || 'D'
                          )}
                      </div>
                    </div>
                    <h3 className="text-3xl font-black mt-6 uppercase truncate max-w-xs mx-auto tracking-tighter italic">{userProfile?.full_name || 'Partner'}</h3>
                    <p className="text-[11px] font-black text-emerald-100 uppercase tracking-[0.4em] mt-1 italic opacity-80">Certified Driver</p>
                 </div>
               ) : (
                 <header className="px-6 pt-16 pb-6 flex items-center bg-white sticky top-0 z-50">
                    <button onClick={() => setProfileTab('menu')} className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center transition-transform active:scale-90 text-slate-400"><ChevronLeft className="w-7 h-7" /></button>
                    <h2 className="flex-1 text-center text-sm font-black uppercase tracking-[0.2em] italic mr-11">
                      {profileTab === 'settings' ? 'Account Settings' : 'Security'}
                    </h2>
                 </header>
               )}

               <div className={`px-8 ${profileTab !== 'settings' && profileTab !== 'password' ? '-mt-20' : 'mt-4'} max-w-2xl mx-auto w-full relative z-20 pb-40`}>
                <AnimatePresence mode="wait">
                  {profileTab === 'menu' ? (
                    <motion.div key="menu" className="space-y-5">
                      <button onClick={() => setProfileTab('settings')} className="w-full bg-white rounded-[2.5rem] p-8 shadow-xl flex items-center justify-between group transition-all border border-slate-100 hover:shadow-2xl hover:translate-x-2"><div className="flex items-center gap-6"><div className="w-16 h-16 bg-slate-50 rounded-[1.75rem] flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all shadow-inner"><Settings className="w-7 h-7" /></div><span className="text-base font-black text-slate-800 uppercase tracking-tight">Account Settings</span></div><ChevronRight className="w-6 h-6 text-slate-300" /></button>
                      <button onClick={() => { setActiveTab('activity'); setFilter('All'); }} className="w-full bg-white rounded-[2.5rem] p-8 shadow-xl flex items-center justify-between group transition-all border border-slate-100 hover:shadow-2xl hover:translate-x-2"><div className="flex items-center gap-6"><div className="w-16 h-16 bg-slate-50 rounded-[1.75rem] flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all shadow-inner"><HistoryIcon className="w-7 h-7" /></div><span className="text-base font-black text-slate-800 uppercase tracking-tight">Trip History</span></div><ChevronRight className="w-6 h-6 text-slate-300" /></button>
                      <button onClick={() => setProfileTab('support')} className="w-full bg-white rounded-[2.5rem] p-8 shadow-xl flex items-center justify-between group transition-all border border-slate-100 hover:shadow-2xl hover:translate-x-2"><div className="flex items-center gap-6"><div className="w-16 h-16 bg-slate-50 rounded-[1.75rem] flex items-center justify-center text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-500 transition-all shadow-inner"><HelpCircle className="w-7 h-7" /></div><span className="text-base font-black text-slate-800 uppercase tracking-tight">Support Center</span></div><ChevronRight className="w-6 h-6 text-slate-300" /></button>
                      <button onClick={handleLogout} className="w-full bg-white rounded-[2.5rem] p-8 shadow-xl flex items-center justify-between group transition-all border border-red-50 mt-6"><div className="flex items-center gap-6 text-red-500"><div className="w-16 h-16 bg-red-50 rounded-[1.75rem] flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all shadow-inner"><LogOut className="w-7 h-7" /></div><span className="text-base font-black uppercase tracking-tight">Sign Out Partner</span></div><ChevronRight className="w-6 h-6 text-red-200" /></button>
                    </motion.div>
                  ) : profileTab === 'settings' ? (
                     <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="bg-white rounded-[3rem] p-10 shadow-2xl space-y-8 border border-slate-100">
                           {/* PROFILE PICTURE SECTION */}
                           <div className="flex flex-col items-center gap-4 pb-8 border-b border-slate-50">
                              <div className="relative group cursor-pointer">
                                 <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center text-3xl font-black text-emerald-600 border-4 border-white shadow-xl overflow-hidden">
                                    {userProfile?.avatar_url ? (
                                      <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                      userProfile?.full_name?.charAt(0) || 'D'
                                    )}
                                 </div>
                                 <label className="absolute -bottom-1 -right-1 w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg border-4 border-white cursor-pointer hover:bg-emerald-700 transition-all scale-90 group-hover:scale-100">
                                    <Camera className="w-5 h-5" />
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="image/*"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          try {
                                            const fileExt = file.name.split('.').pop();
                                            const fileName = `${userProfile.id}-${Math.random()}.${fileExt}`;
                                            const filePath = `${fileName}`;

                                            const { error: uploadError } = await supabase.storage
                                              .from('Avatars')
                                              .upload(filePath, file);

                                            if (uploadError) throw uploadError;

                                            const { data: { publicUrl } } = supabase.storage
                                              .from('Avatars')
                                              .getPublicUrl(filePath);

                                            const { error: updateError } = await supabase
                                              .from('profiles')
                                              .update({ avatar_url: publicUrl })
                                              .eq('id', userProfile.id);

                                            if (updateError) throw updateError;
                                            
                                            setUserProfile({ ...userProfile, avatar_url: publicUrl });
                                            toast.success("Avatar updated!");
                                          } catch (error) {
                                            toast.error("Upload failed");
                                          }
                                        }
                                      }}
                                    />
                                 </label>
                              </div>
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Tap to change photo</p>
                           </div>

                           <div className="space-y-5">
                              <div className="flex items-center gap-5 p-6 bg-slate-50 rounded-[2.25rem] border border-transparent focus-within:border-emerald-200 transition-all focus-within:bg-white focus-within:shadow-xl"><div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm"><UserIcon className="w-7 h-7" /></div><div className="flex-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</p><input defaultValue={userProfile?.full_name} className="bg-transparent font-bold text-slate-700 w-full outline-none text-sm" /></div><Edit2 className="w-4 h-4 text-slate-300" /></div>
                              <div className="flex items-center gap-5 p-6 bg-slate-50 rounded-[2.25rem] border border-transparent focus-within:border-emerald-200 transition-all focus-within:bg-white focus-within:shadow-xl"><div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm"><Mail className="w-7 h-7" /></div><div className="flex-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</p><input defaultValue={userProfile?.email} className="bg-transparent font-bold text-slate-700 w-full outline-none text-sm" /></div><Edit2 className="w-4 h-4 text-slate-300" /></div>
                              <div onClick={() => setProfileTab('password')} className="flex items-center gap-5 p-6 bg-slate-50 rounded-[2.25rem] group cursor-pointer hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-slate-100"><div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm group-hover:text-emerald-500"><Lock className="w-7 h-7" /></div><div className="flex-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Security</p><p className="text-sm font-bold text-slate-700">Change Password</p></div><ChevronRight className="w-5 h-5 text-slate-300" /></div>
                           </div>

                           <div className="pt-8 border-t border-slate-50">
                              <button onClick={() => toast.error("Confirm deletion in your email")} className="w-full py-6 bg-red-50 text-red-500 rounded-[2.25rem] font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-red-600 hover:text-white transition-all border-2 border-transparent hover:border-red-100 shadow-sm"><ShieldAlert className="w-5 h-5" /> DELETE MY ACCOUNT</button>
                           </div>
                        </div>
                      </motion.div>
                    ) : profileTab === 'password' ? (
                      <motion.div key="password" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="bg-white rounded-[3rem] p-10 shadow-2xl space-y-8 border border-slate-100">
                           <div className="flex items-center gap-4 pb-6 border-b border-slate-50">
                              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500"><Key className="w-6 h-6" /></div>
                              <h3 className="text-sm font-black uppercase tracking-widest">Partner Security</h3>
                           </div>
                           <div className="space-y-5">
                              <div className="space-y-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Current Password</p>
                                <input type="password" placeholder="••••••••" className="w-full p-6 bg-slate-50 rounded-[2.25rem] font-bold text-slate-700 outline-none border-2 border-transparent focus:border-emerald-100 focus:bg-white transition-all text-sm" />
                              </div>
                              <div className="space-y-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">New Password</p>
                                <input type="password" placeholder="••••••••" className="w-full p-6 bg-slate-50 rounded-[2.25rem] font-bold text-slate-700 outline-none border-2 border-transparent focus:border-emerald-100 focus:bg-white transition-all text-sm" />
                              </div>
                              <div className="space-y-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Confirm New Password</p>
                                <input type="password" placeholder="••••••••" className="w-full p-6 bg-slate-50 rounded-[2.25rem] font-bold text-slate-700 outline-none border-2 border-transparent focus:border-emerald-100 focus:bg-white transition-all text-sm" />
                              </div>
                           </div>
                           <button onClick={() => toast.success("Password Updated!")} className="w-full py-6 bg-emerald-600 text-white rounded-[2.25rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all active:scale-95">Update Partner Password</button>
                        </div>
                      </motion.div>
                    ) : profileTab === 'support' ? (
                      <motion.div key="support" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="bg-white rounded-[3rem] p-10 shadow-2xl space-y-6 border border-slate-100">
                           <div className="flex items-center gap-4 pb-6 border-b border-slate-50">
                              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500"><HelpCircle className="w-6 h-6" /></div>
                              <h3 className="text-sm font-black uppercase tracking-widest">Partner Support</h3>
                           </div>
                           
                           <div className="space-y-4">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Driver FAQs</p>
                              <button className="w-full p-6 bg-slate-50 rounded-[2rem] flex items-center justify-between group hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100 text-left"><div className="flex-1"><h4 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-1">How do I get paid?</h4><p className="text-[10px] text-slate-400 font-medium">Understanding your weekly earnings</p></div><ChevronRight className="w-5 h-5 text-slate-300" /></button>
                              <button className="w-full p-6 bg-slate-50 rounded-[2rem] flex items-center justify-between group hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100 text-left"><div className="flex-1"><h4 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-1">Navigation Issues</h4><p className="text-[10px] text-slate-400 font-medium">Using GPS and route optimization</p></div><ChevronRight className="w-5 h-5 text-slate-300" /></button>
                              <button className="w-full p-6 bg-slate-50 rounded-[2rem] flex items-center justify-between group hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100 text-left"><div className="flex-1 text-blue-600"><h4 className="text-sm font-black uppercase tracking-tight mb-1">Driver Safety</h4><p className="text-[10px] text-blue-400 font-medium">Best practices for safe trips</p></div><ShieldCheck className="w-5 h-5 text-blue-300" /></button>
                           </div>

                           <div className="pt-8 border-t border-slate-50 space-y-4">
                              <button onClick={() => toast.success("Connecting to Partner Support...")} className="w-full py-6 bg-emerald-600 text-white rounded-[2.25rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-3"><Bell className="w-5 h-5" /> Chat with Us</button>
                              <button onClick={() => window.location.href = 'mailto:partners@fetchmeup.com'} className="w-full py-6 bg-slate-50 text-slate-600 rounded-[2.25rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-100 transition-all flex items-center justify-center gap-3"><Mail className="w-5 h-5" /> Partner Support Email</button>
                           </div>
                        </div>
                        <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">Partner App v1.0.4 • Butuan City</p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* DRIVER TRIP DETAIL MODAL (Digital Receipt) */}
      <AnimatePresence>
        {selectedHistoryTrip && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm bg-white rounded-[4rem] p-10 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2.5 bg-emerald-500" />
               <button onClick={() => setSelectedHistoryTrip(null)} className="absolute top-8 right-8 w-11 h-11 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"><X className="w-7 h-7" /></button>
               
               <div className="flex flex-col items-center text-center mb-10">
                  <div className="w-24 h-24 bg-slate-50 rounded-[3rem] flex items-center justify-center text-emerald-600 mb-5 shadow-inner"><Receipt className="w-12 h-12" /></div>
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Trip Receipt</h2>
                  <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1">ID: {selectedHistoryTrip.id.slice(0, 8)}</p>
               </div>

               <div className="space-y-8 bg-slate-50 rounded-[3rem] p-8 border border-slate-100 mb-8">
                  <div className="flex items-start gap-6">
                     <div className="flex flex-col items-center gap-1.5 pt-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" /><div className="w-0.5 h-10 bg-slate-200" /><div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-100" /></div>
                     <div className="space-y-6">
                        <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pickup</p><p className="text-sm font-bold text-slate-700 leading-tight">{selectedHistoryTrip.pickup_location}</p></div>
                        <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Destination</p><p className="text-sm font-bold text-slate-700 leading-tight">{selectedHistoryTrip.destination}</p></div>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200/50">
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2"><Calendar className="w-4 h-4" /> Date</p><p className="text-[12px] font-bold text-slate-700">{new Date(selectedHistoryTrip.created_at).toLocaleDateString()}</p></div>
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2"><Tag className="w-4 h-4" /> Vehicle</p><p className="text-[12px] font-bold text-slate-700">{selectedHistoryTrip.vehicle_type}</p></div>
                  </div>
               </div>

               {/* DYNAMIC PASSENGER SECTION */}
               <div className="bg-slate-50 rounded-[2.5rem] p-6 border border-slate-100 mb-8 flex items-center gap-5">
                  <div className="w-14 h-14 bg-white rounded-[1.5rem] flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-50"><UserIcon className="w-7 h-7" /></div>
                  <div className="text-left flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Picked Up</p>
                    <p className="text-base font-black text-slate-900 uppercase truncate">
                      {historyPassenger ? historyPassenger.full_name : (
                        <span className="text-slate-300 animate-pulse italic text-xs">Fetching Name...</span>
                      )}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1"><Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /><span className="text-[11px] font-black text-amber-700 uppercase">Top Passenger</span></div>
                  </div>
               </div>

               <div className="flex justify-between items-center p-8 bg-emerald-600 rounded-[3rem] text-white shadow-2xl shadow-emerald-200">
                  <span className="text-xs font-black uppercase tracking-[0.2em]">You Earned</span>
                  <span className="text-4xl font-black italic tracking-tighter">₱{selectedHistoryTrip.fare_estimate}.00</span>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 w-full h-24 bg-white border-t border-slate-100 px-8 py-3 flex justify-between items-center z-[60] shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
        {[
          { id: 'dash', icon: LayoutDashboard, label: 'Dash' },
          { id: 'activity', icon: HistoryIcon, label: 'Activity' },
          { id: 'wallet', icon: Wallet, label: 'Wallet' },
          { id: 'profile', icon: User, label: 'Profile' }
        ].map(item => (
          <button 
            key={item.id} 
            onClick={() => { setActiveTab(item.id); if(item.id === 'profile') setProfileTab('menu'); }} 
            className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === item.id ? 'text-emerald-600 scale-110' : 'text-slate-300 hover:text-slate-500'}`}
          >
            <div className={`p-2.5 rounded-2xl ${activeTab === item.id ? 'bg-emerald-50' : ''}`}>
              <item.icon className={`w-7 h-7 ${activeTab === item.id ? 'fill-emerald-600' : ''}`} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
