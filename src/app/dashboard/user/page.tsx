"use client"

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  MapPin, 
  Navigation, 
  History as HistoryIcon, 
  User as UserIcon, 
  Home, 
  LogOut, 
  Settings, 
  HelpCircle, 
  ChevronRight, 
  Star, 
  Clock, 
  Car, 
  Zap, 
  CheckCircle, 
  X, 
  ArrowRight, 
  Loader2,
  ChevronLeft,
  ShieldCheck,
  Phone,
  Mail,
  Receipt,
  Calendar,
  Tag,
  UserCheck,
  Ban,
  Search,
  Bell,
  ShieldAlert,
  Info,
  Lock,
  Camera,
  Edit2,
  Key
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

export default function UserDashboard() {
  const [activeView, setActiveView] = useState<'home' | 'history' | 'profile'>('home')
  const [profileTab, setProfileTab] = useState<'menu' | 'settings' | 'support' | 'password'>('menu')
  const [rideStatus, setRideStatus] = useState<string | null>(null)
  const [pickup, setPickup] = useState('')
  const [destination, setDestination] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState('Tricycle')
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [activeRide, setActiveRide] = useState<Ride | null>(null)
  const [driverProfile, setDriverProfile] = useState<any>(null)
  const [historyRides, setHistoryRides] = useState<Ride[]>([])
  const [selectedHistoryRide, setSelectedHistoryRide] = useState<Ride | null>(null)
  const [historyDriver, setHistoryDriver] = useState<any>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null)
  const [rating, setRating] = useState(0)

  const router = useRouter()
  const supabase = createClient()

  const vehicles = [
    { id: 'Tricycle', name: 'TRICYCLE', price: 30, icon: Navigation, color: 'bg-blue-50 text-blue-500' },
    { id: 'E-Trike', name: 'E-TRIKE', price: 25, icon: Zap, color: 'bg-amber-50 text-amber-500' },
    { id: 'Car', name: 'CAR', price: 120, icon: Car, color: 'bg-emerald-50 text-emerald-500' }
  ]

  const fetchHistory = async (userId: string) => {
    const { data } = await supabase.from('rides').select('*').eq('user_id', userId).in('status', ['completed', 'cancelled']).order('created_at', { ascending: false })
    if (data) setHistoryRides(data as Ride[])
  }

  const checkStatus = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.user) return

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profile) {
        setUserProfile(profile)
        fetchHistory(session.user.id)
      }

      const { data: active } = await supabase
        .from('rides')
        .select('*')
        .eq('user_id', session.user.id)
        .in('status', ['pending', 'accepted', 'ongoing'])
        .maybeSingle()

      if (active) {
        setActiveRide(active as Ride)
        setRideStatus(active.status)
        if (active.driver_id) {
          const { data: drv } = await supabase.from('profiles').select('*').eq('id', active.driver_id).maybeSingle()
          setDriverProfile(drv)
        }
      } else {
        if (rideStatus === 'ongoing') setShowFeedback(true)
        setActiveRide(null)
        setRideStatus(null)
        setDriverProfile(null)
      }
    } catch (err) {
      console.error("Status check failed:", err)
    }
  }

  // REAL-TIME DRIVER TRACKING
  useEffect(() => {
    if (activeRide?.driver_id && (rideStatus === 'accepted' || rideStatus === 'ongoing')) {
      // 1. Initial fetch of driver location
      supabase.from('locations').select('*').eq('user_id', activeRide.driver_id).maybeSingle().then(({ data }) => {
        if (data) setDriverLocation([data.latitude, data.longitude])
      })

      // 2. Subscribe to real-time location updates
      const channel = supabase
        .channel(`driver-location-${activeRide.driver_id}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'locations', 
          filter: `user_id=eq.${activeRide.driver_id}` 
        }, (payload) => {
          if (payload.new.latitude && payload.new.longitude) {
            setDriverLocation([payload.new.latitude, payload.new.longitude])
          }
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    } else {
      setDriverLocation(null)
    }
  }, [activeRide?.driver_id, rideStatus])

  useEffect(() => {
    checkStatus()
    const channel = supabase.channel('user_realtime_v22')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => checkStatus())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleBook = async () => {
    if (!pickup || !destination) { toast.error("Enter route details"); return; }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const v = vehicles.find(x => x.id === selectedVehicle)
    const { error } = await supabase.from('rides').insert([{ user_id: user.id, pickup_location: pickup, destination: destination, fare_estimate: v?.price, vehicle_type: selectedVehicle, status: 'pending' }])
    if (!error) { toast.success("Searching for drivers..."); checkStatus(); }
  }

  const handleCancelTrip = async () => {
    if (!activeRide) return
    const { error } = await supabase.from('rides').update({ status: 'completed' }).eq('id', activeRide.id)
    if (!error) { toast.success("Trip cancelled"); checkStatus(); }
  }

  const handleLogout = async () => {
    document.cookie = "admin_access=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;"
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleOpenHistoryDetail = async (ride: Ride) => {
    setSelectedHistoryRide(ride)
    setHistoryDriver(null)
    if (ride.driver_id) {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', ride.driver_id).maybeSingle()
      if (data) setHistoryDriver(data)
    }
  }

  const handleSubmitFeedback = async () => {
    if (rating === 0) { toast.error("Please select a rating"); return; }
    
    // Get the last completed ride for this user that hasn't been reviewed
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: lastRide } = await supabase
      .from('rides')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (lastRide && lastRide.driver_id) {
      const { error } = await supabase.from('reviews').insert([{
        ride_id: lastRide.id,
        driver_id: lastRide.driver_id,
        user_id: user.id,
        rating: rating,
        comment: "" // Could add a comment field later
      }])

      if (!error) {
        toast.success("Thank you for your feedback!")
        setShowFeedback(false)
        setRating(0)
      } else {
        console.error(error)
        toast.error("Failed to save review")
      }
    } else {
      setShowFeedback(false)
    }
  }

  useEffect(() => { setTimeout(() => setLoading(false), 800) }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-10 h-10 animate-spin text-emerald-600" /></div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col pb-28">
      {/* HEADER: LOGO LEFT, AVATAR RIGHT */}
      <header className="bg-white px-6 pt-12 pb-4 flex justify-between items-center sticky top-0 z-50 border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100/50">
            <Car className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Fetch Me Up</h1>
        </div>
        <button 
          onClick={() => { setActiveView('profile'); setProfileTab('menu'); }}
          className="w-11 h-11 rounded-full bg-emerald-50 border-4 border-white shadow-xl flex items-center justify-center text-emerald-600 font-black text-base transition-transform active:scale-95 overflow-hidden"
        >
          {userProfile?.avatar_url ? (
            <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            userProfile?.full_name?.charAt(0) || 'P'
          )}
        </button>
      </header>

      <div className="flex-1">
        <AnimatePresence mode="wait">
          {activeView === 'home' ? (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col">
              <main className="p-6 space-y-6 max-w-md mx-auto w-full">
                <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white h-72 relative group">
                  <MapComponent 
                    center={[8.9475, 125.5406]} 
                    pickupPoint={
                      pickup.toLowerCase().includes('bonbon') ? [8.9554, 125.5147] : 
                      pickup.toLowerCase().includes('obrero') ? [8.9566, 125.5323] : 
                      pickup.toLowerCase().includes('libertad') ? [8.9405, 125.5245] : undefined
                    }
                    destinationPoint={
                      destination.toLowerCase().includes('fsuu') ? [8.9482, 125.5367] : 
                      destination.toLowerCase().includes('obrero') ? [8.9566, 125.5323] : 
                      destination.toLowerCase().includes('robinsons') ? [8.9412, 125.5250] : 
                      destination.toLowerCase().includes('sm') ? [8.9560, 125.5360] : undefined
                    }
                    route={
                      (pickup && destination) ? [
                        pickup.toLowerCase().includes('bonbon') ? [8.9554, 125.5147] : [8.9475, 125.5406],
                        destination.toLowerCase().includes('obrero') ? [8.9566, 125.5323] : 
                        destination.toLowerCase().includes('fsuu') ? [8.9482, 125.5367] : 
                        destination.toLowerCase().includes('sm') ? [8.9560, 125.5360] : [8.9412, 125.5250]
                      ] : []
                    }
                    driverLocation={driverLocation || undefined}
                  />
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pickup)}&destination=${encodeURIComponent(destination)}`}
                    target="_blank"
                    className="absolute bottom-4 right-4 z-20 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-100 shadow-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 transition-all active:scale-95"
                  >
                    <Navigation className="w-4 h-4" /> Open Navi
                  </a>
                </div>

                <div className="space-y-3">
                  <div className="relative group/input">
                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 group-focus-within/input:scale-110 transition-transform" />
                    <input value={pickup} onChange={e => setPickup(e.target.value)} placeholder="Pickup Location" className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-50 focus:border-emerald-500 rounded-[2rem] shadow-sm outline-none font-black text-slate-700 text-sm placeholder:text-slate-300 transition-all" />
                  </div>
                  <div className="relative group/input">
                    <Navigation className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 group-focus-within/input:scale-110 transition-transform" />
                    <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Where to?" className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-50 focus:border-blue-500 rounded-[2rem] shadow-sm outline-none font-black text-slate-700 text-sm placeholder:text-slate-300 transition-all" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] ml-2">Select Vehicle</h3>
                  <div className="space-y-3">
                    {vehicles.map(v => (
                      <div key={v.id} onClick={() => setSelectedVehicle(v.id)} className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer flex items-center justify-between group ${selectedVehicle === v.id ? 'bg-emerald-50 border-emerald-500 shadow-xl scale-[1.02]' : 'bg-white border-slate-50 hover:border-slate-100'}`}>
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-[1.75rem] flex items-center justify-center transition-transform group-hover:scale-110 ${v.color} shadow-inner`}>
                            <v.icon className="w-7 h-7" />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 uppercase italic tracking-tight">{v.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Base Fare: ₱{v.price}</p>
                          </div>
                        </div>
                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${selectedVehicle === v.id ? 'bg-emerald-600 border-emerald-600' : 'border-slate-200'}`}>
                          {selectedVehicle === v.id && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={handleBook} className="w-full py-6 bg-emerald-600 text-white rounded-[2.5rem] font-black text-base uppercase tracking-[0.2em] shadow-2xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-4 group">
                  FETCH ME UP NOW <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </button>
              </main>
            </motion.div>
          ) : activeView === 'history' ? (
            <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col bg-white min-h-screen">
               <header className="px-6 pt-16 pb-6 flex items-center justify-between sticky top-0 bg-white z-50">
                  <h2 className="text-xl font-black uppercase tracking-[0.2em] italic">Rider History</h2>
                  <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><HistoryIcon className="w-6 h-6" /></div>
               </header>
               <div className="px-6 pb-32 space-y-4">
                  {historyRides.map((ride, i) => (
                    <div key={i} onClick={() => handleOpenHistoryDetail(ride)} className="p-6 bg-slate-50 rounded-[2.25rem] border border-slate-100 flex items-center justify-between group transition-all hover:bg-white hover:shadow-xl cursor-pointer">
                       <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-emerald-500 transition-all shadow-sm"><Clock className="w-6 h-6" /></div>
                          <div>
                             <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none mb-2 truncate max-w-[150px]">{ride.pickup_location} <ArrowRight className="inline w-3 h-3 mx-1 text-emerald-500" /> {ride.destination}</p>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(ride.created_at).toLocaleDateString()} • {ride.vehicle_type}</p>
                          </div>
                       </div>
                       <p className="text-base font-black text-emerald-600 italic">₱{ride.fare_estimate}</p>
                    </div>
                  ))}
                  {historyRides.length === 0 && (
                    <div className="text-center py-20 opacity-20"><HistoryIcon className="w-20 h-20 mx-auto mb-4" /><p className="font-black uppercase tracking-widest">No trips yet</p></div>
                  )}
               </div>
            </motion.div>
          ) : (
              <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 bg-slate-50 flex flex-col min-h-screen">
                {profileTab !== 'settings' && profileTab !== 'password' ? (
                 <div className="bg-gradient-to-b from-emerald-600 via-emerald-600 to-emerald-700 pt-16 pb-32 px-6 text-center text-white relative rounded-b-[4rem] shadow-2xl">
                    {profileTab !== 'menu' && (
                      <button onClick={() => setProfileTab('menu')} className="absolute left-6 top-16 w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center transition-transform active:scale-90 border border-white/20 backdrop-blur-sm"><ChevronLeft className="w-7 h-7" /></button>
                    )}
                    <h2 className="text-xl font-black uppercase tracking-[0.3em] mb-10 italic drop-shadow-lg">
                      {profileTab === 'menu' ? 'Profile' : 'Support Center'}
                    </h2>
                    <div className="relative inline-block">
                      <div className="w-32 h-32 bg-white rounded-[3.5rem] relative z-10 mx-auto flex items-center justify-center text-5xl font-black shadow-2xl text-emerald-600 border-4 border-emerald-400/30 animate-pulse overflow-hidden">
                          {userProfile?.avatar_url ? (
                            <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            userProfile?.full_name?.charAt(0) || 'P'
                          )}
                      </div>
                    </div>
                    <h3 className="text-3xl font-black mt-6 uppercase truncate max-w-xs mx-auto tracking-tighter italic">{userProfile?.full_name || 'Passenger'}</h3>
                    <p className="text-[11px] font-black text-emerald-100 uppercase tracking-[0.4em] mt-1 italic opacity-80">Verified Rider</p>
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
                      <motion.div key="menu" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                        <button onClick={() => setProfileTab('settings')} className="w-full bg-white rounded-[2.5rem] p-8 shadow-xl flex items-center justify-between group transition-all border border-slate-100 hover:shadow-2xl hover:translate-x-2"><div className="flex items-center gap-6"><div className="w-16 h-16 bg-slate-50 rounded-[1.75rem] flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all shadow-inner"><Settings className="w-7 h-7" /></div><span className="text-base font-black text-slate-800 uppercase tracking-tight">Account Settings</span></div><ChevronRight className="w-6 h-6 text-slate-300" /></button>
                        <button onClick={() => setProfileTab('support')} className="w-full bg-white rounded-[2.5rem] p-8 shadow-xl flex items-center justify-between group transition-all border border-slate-100 hover:shadow-2xl hover:translate-x-2"><div className="flex items-center gap-6"><div className="w-16 h-16 bg-slate-50 rounded-[1.75rem] flex items-center justify-center text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-500 transition-all shadow-inner"><HelpCircle className="w-7 h-7" /></div><span className="text-base font-black text-slate-800 uppercase tracking-tight">Help & Support</span></div><ChevronRight className="w-6 h-6 text-slate-300" /></button>
                        <button onClick={handleLogout} className="w-full bg-white rounded-[2.5rem] p-8 shadow-xl flex items-center justify-between group transition-all border border-red-50 hover:shadow-2xl mt-4"><div className="flex items-center gap-6 text-red-500"><div className="w-16 h-16 bg-red-50 rounded-[1.75rem] flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all shadow-inner"><LogOut className="w-7 h-7" /></div><span className="text-base font-black uppercase tracking-tight">Sign Out</span></div><ChevronRight className="w-6 h-6 text-red-200" /></button>
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
                                    ) : userProfile?.full_name?.charAt(0) || 'P'}
                                 </div>
                                 <div className="absolute inset-0 bg-emerald-600/60 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Camera className="w-8 h-8 text-white" />
                                 </div>
                                 <input type="file" className="hidden" id="avatar-upload" onChange={async (e) => {
                                   const file = e.target.files?.[0];
                                   if (!file) return;

                                   const { data: { user } } = await supabase.auth.getUser();
                                   if (!user) return;

                                   const toastId = toast.loading("Uploading image...");
                                   
                                   try {
                                     // 1. Upload to Supabase Storage
                                     const fileExt = file.name.split('.').pop();
                                     const fileName = `${user.id}-${Math.random()}.${fileExt}`;
                                     const filePath = `${fileName}`;

                                     const { error: uploadError } = await supabase.storage
                                       .from('Avatars')
                                       .upload(filePath, file);

                                     if (uploadError) throw uploadError;

                                     // 2. Get Public URL
                                     const { data: { publicUrl } } = supabase.storage
                                       .from('Avatars')
                                       .getPublicUrl(filePath);

                                     // 3. Update Profile Table
                                     const { error: updateError } = await supabase
                                       .from('profiles')
                                       .update({ avatar_url: publicUrl })
                                       .eq('id', user.id);

                                     if (updateError) throw updateError;

                                     toast.success("Profile updated!", { id: toastId });
                                     checkStatus(); // Refresh local profile
                                   } catch (error: any) {
                                     console.error(error);
                                     toast.error("Upload failed: " + error.message, { id: toastId });
                                   }
                                 }} />
                                 <label htmlFor="avatar-upload" className="absolute inset-0 cursor-pointer" />
                              </div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tap to change photo</p>
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
                              <h3 className="text-sm font-black uppercase tracking-widest">Secure Reset</h3>
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
                           <button onClick={() => toast.success("Password Updated!")} className="w-full py-6 bg-emerald-600 text-white rounded-[2.25rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all active:scale-95">Update Password</button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="support" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="bg-white rounded-[3rem] p-10 shadow-2xl space-y-6 border border-slate-100">
                           <div className="flex items-center gap-4 pb-6 border-b border-slate-50">
                              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500"><HelpCircle className="w-6 h-6" /></div>
                              <h3 className="text-sm font-black uppercase tracking-widest">Help Center</h3>
                           </div>
                           
                           <div className="space-y-4">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Frequently Asked</p>
                              <button className="w-full p-6 bg-slate-50 rounded-[2rem] flex items-center justify-between group hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100 text-left"><div className="flex-1"><h4 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-1">How to book a ride?</h4><p className="text-[10px] text-slate-400 font-medium">Step-by-step guide for beginners</p></div><ChevronRight className="w-5 h-5 text-slate-300" /></button>
                              <button className="w-full p-6 bg-slate-50 rounded-[2rem] flex items-center justify-between group hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100 text-left"><div className="flex-1"><h4 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-1">Payment & Fares</h4><p className="text-[10px] text-slate-400 font-medium">Understanding our pricing system</p></div><ChevronRight className="w-5 h-5 text-slate-300" /></button>
                              <button className="w-full p-6 bg-slate-50 rounded-[2rem] flex items-center justify-between group hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100 text-left"><div className="flex-1 text-blue-600"><h4 className="text-sm font-black uppercase tracking-tight mb-1">Safety Guidelines</h4><p className="text-[10px] text-blue-400 font-medium">How we keep you secure</p></div><ShieldCheck className="w-5 h-5 text-blue-300" /></button>
                           </div>

                           <div className="pt-8 border-t border-slate-50 space-y-4">
                              <button onClick={() => toast.success("Connecting to Live Agent...")} className="w-full py-6 bg-emerald-600 text-white rounded-[2.25rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-3"><Bell className="w-5 h-5" /> Chat with Us</button>
                              <button onClick={() => window.location.href = 'mailto:support@fetchmeup.com'} className="w-full py-6 bg-slate-50 text-slate-600 rounded-[2.25rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-100 transition-all flex items-center justify-center gap-3"><Mail className="w-5 h-5" /> Email Support</button>
                           </div>
                        </div>
                        <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">Fetch Me Up v1.0.4 • Butuan City</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIDE STATUS & RECEIPT MODALS (Unchanged Logic) */}
      <AnimatePresence>
        {selectedHistoryRide && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm bg-white rounded-[4rem] p-10 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2.5 bg-emerald-500" />
               <button onClick={() => setSelectedHistoryRide(null)} className="absolute top-8 right-8 w-11 h-11 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"><X className="w-7 h-7" /></button>
               <div className="flex flex-col items-center text-center mb-10">
                  <div className="w-24 h-24 bg-slate-50 rounded-[3rem] flex items-center justify-center text-emerald-600 mb-5 shadow-inner"><Receipt className="w-12 h-12" /></div>
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Ride Receipt</h2>
                  <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1">ID: {selectedHistoryRide.id.slice(0, 8)}</p>
               </div>
               <div className="space-y-8 bg-slate-50 rounded-[3rem] p-8 border border-slate-100 mb-8">
                  <div className="flex items-start gap-6">
                     <div className="flex flex-col items-center gap-1.5 pt-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" /><div className="w-0.5 h-10 bg-slate-200" /><div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-100" /></div>
                     <div className="space-y-6">
                        <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pickup</p><p className="text-sm font-bold text-slate-700 leading-tight">{selectedHistoryRide.pickup_location}</p></div>
                        <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Destination</p><p className="text-sm font-bold text-slate-700 leading-tight">{selectedHistoryRide.destination}</p></div>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200/50">
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2"><Calendar className="w-4 h-4" /> Date</p><p className="text-[12px] font-bold text-slate-700">{new Date(selectedHistoryRide.created_at).toLocaleDateString()}</p></div>
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2"><Tag className="w-4 h-4" /> Vehicle</p><p className="text-[12px] font-bold text-slate-700">{selectedHistoryRide.vehicle_type}</p></div>
                  </div>
               </div>
               <div className="bg-slate-50 rounded-[2.5rem] p-6 border border-slate-100 mb-8 flex items-center gap-5">
                  <div className="w-14 h-14 bg-white rounded-[1.5rem] flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-50"><UserCheck className="w-7 h-7" /></div>
                  <div className="text-left flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Confirmed By</p>
                    <p className="text-base font-black text-slate-900 uppercase truncate">{historyDriver?.full_name || 'Partner Driver'}</p>
                    <div className="flex items-center gap-1.5 mt-1"><Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /><span className="text-[11px] font-black text-amber-700 uppercase">4.9 Partner</span></div>
                  </div>
               </div>
               <div className="flex justify-between items-center p-8 bg-emerald-600 rounded-[3rem] text-white shadow-2xl shadow-emerald-200">
                  <span className="text-xs font-black uppercase tracking-[0.2em]">Total Paid</span>
                  <span className="text-4xl font-black italic tracking-tighter">₱{selectedHistoryRide.fare_estimate}.00</span>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rideStatus && rideStatus !== 'completed' && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 w-full z-[100]">
            <motion.div className="bg-white rounded-t-[4rem] p-10 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] border-t border-slate-100">
              <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mb-10" />
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-emerald-600 shadow-inner relative border-4 border-white">
                    {driverProfile?.full_name?.charAt(0) || <Loader2 className="animate-spin" />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">{driverProfile?.full_name || 'Searching for driver...'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{rideStatus.toUpperCase()}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-600 italic">₱{activeRide?.fare_estimate}</p>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{activeRide?.vehicle_type}</p>
                </div>
              </div>
              <button onClick={handleCancelTrip} className="w-full py-6 bg-red-50 text-red-500 rounded-[2.25rem] font-black text-sm uppercase tracking-[0.3em] hover:bg-red-100 flex items-center justify-center gap-4 transition-all active:scale-95 mb-10 border-2 border-red-100/50"><Ban className="w-6 h-6" /> CANCEL THIS TRIP</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEW NAVIGATION BAR: HOME, HISTORY, PROFILE */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[400] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm bg-white rounded-[4rem] p-10 shadow-2xl text-center">
              <div className="w-24 h-24 bg-emerald-50 rounded-[3rem] flex items-center justify-center text-emerald-600 mx-auto mb-8 shadow-inner">
                <Star className="w-12 h-12 fill-emerald-600" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic mb-2">Rate your Trip</h2>
              <p className="text-sm font-medium text-slate-400 mb-10 px-4">How was your experience with our partner driver?</p>
              
              <div className="flex justify-center gap-3 mb-12">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star}
                    onClick={() => setRating(star)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${rating >= star ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 scale-110' : 'bg-slate-50 text-slate-300'}`}
                  >
                    <Star className={`w-6 h-6 ${rating >= star ? 'fill-white' : ''}`} />
                  </button>
                ))}
              </div>

              <button 
                onClick={handleSubmitFeedback}
                className="w-full py-6 bg-emerald-600 text-white rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 mb-4"
              >
                Submit Feedback
              </button>
              <button 
                onClick={() => setShowFeedback(false)}
                className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-400 transition-colors"
              >
                Skip for now
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 w-full h-24 bg-white border-t border-slate-100 flex items-center justify-around px-8 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
        {[
          { id: 'home', icon: Home, label: 'Home' },
          { id: 'history', icon: HistoryIcon, label: 'History' },
          { id: 'profile', icon: UserIcon, label: 'Profile' }
        ].map(item => (
          <button 
            key={item.id} 
            onClick={() => { setActiveView(item.id as any); if(item.id === 'profile') setProfileTab('menu'); }} 
            className={`flex flex-col items-center gap-1.5 transition-all ${activeView === item.id ? 'text-emerald-600 scale-110' : 'text-slate-300 hover:text-slate-500'}`}
          >
            <div className={`p-2.5 rounded-2xl ${activeView === item.id ? 'bg-emerald-50' : ''}`}>
              <item.icon className={`w-7 h-7 ${activeView === item.id ? 'fill-emerald-600' : ''}`} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
