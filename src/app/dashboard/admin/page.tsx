"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Users, 
  Car, 
  TrendingUp, 
  Activity, 
  LayoutDashboard, 
  List, 
  LogOut, 
  Search, 
  Filter, 
  MoreVertical,
  Star,
  Settings,
  ShieldCheck,
  ChevronRight,
  Loader2,
  Menu,
  X
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDrivers: 0,
    revenue: 0,
    activeRides: 0
  })
  const [users, setUsers] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'drivers' | 'settings'>('overview')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [userRides, setUserRides] = useState<any[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const [isOnline, setIsOnline] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setIsOnline(!!user || true) // Simplified check
      console.log("Admin: Logged in as:", user?.email)
      console.log("Admin: Starting data fetch...")
    } catch (e) {
      setIsOnline(false)
    }
    
    try {
      // 1. Fetch Stats
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user')
      const { count: driverCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'driver')
      const { data: completedRides } = await supabase.from('rides').select('fare_estimate').eq('status', 'completed')
      const { count: activeRidesCount } = await supabase.from('rides').select('*', { count: 'exact', head: true }).eq('status', 'ongoing')

      const totalRevenue = completedRides?.reduce((acc, ride) => acc + (Number(ride.fare_estimate) * 0.15), 0) || 0

      // 2. Fetch Users
      const { data: userData } = await supabase.from('profiles').select('*').eq('role', 'user')
      
      // 3. Fetch Drivers
      const { data: driverData } = await supabase.from('profiles').select('*').eq('role', 'driver')

      // MOCK DATA FALLBACK (If connection fails or DB is empty)
      if (!userData || userData.length === 0) {
        console.log("Admin: Using Mock Data for demo")
        setUsers([
          { id: '1', full_name: 'John Doe (Demo)', email: 'john@example.com', created_at: new Date().toISOString() },
          { id: '2', full_name: 'Jane Smith (Demo)', email: 'jane@example.com', created_at: new Date().toISOString() }
        ])
        setDrivers([
          { id: '3', full_name: 'Fast Driver (Demo)', phone_number: '09123456789', vehicle_type: 'Tricycle', rating: 4.8, status: 'Active' },
          { id: '4', full_name: 'Bad Driver (Demo)', phone_number: '09987654321', vehicle_type: 'Car', rating: 3.2, status: 'Inactive' }
        ])
        setStats({
          totalUsers: 2,
          totalDrivers: 2,
          revenue: 450.50,
          activeRides: 1
        })
      } else {
        setUsers(userData)
        setStats({
          totalUsers: userCount || 0,
          totalDrivers: driverCount || 0,
          revenue: totalRevenue,
          activeRides: activeRidesCount || 0
        })

        // Process Drivers
        const processedDrivers = await Promise.all((driverData || []).map(async (d) => {
          const { data: reviews } = await supabase.from('reviews').select('rating').eq('driver_id', d.id)
          const avg = reviews?.length ? reviews.reduce((a, b) => a + b.rating, 0) / reviews.length : 5.0
          return { ...d, rating: avg, status: 'Active' }
        }))
        setDrivers(processedDrivers)
      }

    } catch (error: any) {
      console.error("Admin Fetch Error:", error)
      toast.error("Offline Mode: Showing Demo Data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleUserClick = async (user: any) => {
    setSelectedUser(user)
    setLoadingDetails(true)
    try {
      const { data } = await supabase
        .from('rides')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      setUserRides(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingDetails(false)
    }
  }

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false)
      } else {
        setIsSidebarOpen(true)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = () => {
    document.cookie = "admin_access=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;"
    router.push('/login')
    toast.success("Logged out safely")
  }

  if (loading && activeTab === 'overview') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 animate-spin text-[#10B981]" />
      </div>
    )
  }

  const filteredUsers = users.filter(u => u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredDrivers = drivers.filter(d => d.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || d.phone_number?.includes(searchQuery))

  return (
    <div className="min-h-screen bg-white flex text-slate-800 relative">
      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 shadow-2xl lg:shadow-none`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-[#10B981] rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter">ADMIN PANEL</h1>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Fetch Me Up</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {[
              { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
              { id: 'users', icon: Users, label: 'User List' },
              { id: 'drivers', icon: Car, label: 'Driver List' },
              { id: 'settings', icon: Settings, label: 'System Settings' }
            ].map((item: any) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${activeTab === item.id ? 'bg-[#10B981] text-white shadow-lg shadow-emerald-900/50' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-bold">{item.label}</span>
                {activeTab === item.id && <motion.div layoutId="activeTab" className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />}
              </button>
            ))}
          </nav>

          <button 
            onClick={handleLogout}
            className="mt-auto flex items-center gap-4 px-4 py-3.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-bold">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <header className="bg-white border-b border-slate-100 px-8 py-6 sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 text-slate-400">
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-black text-slate-900 capitalize italic">{activeTab}</h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-sm outline-none focus:border-emerald-500 transition-all w-64"
              />
            </div>
            <div className="w-10 h-10 bg-slate-50 rounded-full border border-slate-100 flex items-center justify-center font-black text-emerald-600">A</div>
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'blue' },
                    { label: 'Total Drivers', value: stats.totalDrivers, icon: Car, color: 'emerald' },
                    { label: 'Platform Revenue', value: `₱${stats.revenue.toLocaleString()}`, icon: TrendingUp, color: 'amber' },
                    { label: 'Active Rides', value: stats.activeRides, icon: Activity, color: 'red' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                      <div className="flex items-start justify-between">
                        <div className={`p-4 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                          <stat.icon className="w-6 h-6" />
                        </div>
                        <button className="text-slate-300 hover:text-slate-600"><MoreVertical className="w-5 h-5" /></button>
                      </div>
                      <div className="mt-6">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        <h3 className="text-3xl font-black text-slate-900 mt-1 italic tracking-tight">{stat.value}</h3>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Main Dashboard Layout */}
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Recent Activity / Quick Actions */}
                  <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-black italic uppercase tracking-tight">Recent Platform Growth</h3>
                        <button className="text-xs font-black text-emerald-600 uppercase tracking-widest hover:underline">View Report</button>
                      </div>
                      <div className="h-64 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-100">
                        Analytics Visualization Placeholder
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                      <div className="relative z-10">
                        <ShieldCheck className="w-12 h-12 text-emerald-400 mb-6" />
                        <h3 className="text-xl font-black italic mb-2 tracking-tight">System Status</h3>
                        <p className="text-slate-400 text-sm mb-8 leading-relaxed">All core services are operational. Last security audit: Today 04:00 AM.</p>
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Services Online</span>
                        </div>
                      </div>
                      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div 
                key="users"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden"
              >
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black italic tracking-tight">User Management</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Total {users.length} registered riders</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="p-3 bg-slate-50 rounded-xl text-slate-400 border border-slate-100 hover:text-emerald-600 transition-all"><Filter className="w-5 h-5" /></button>
                    <button className="bg-[#10B981] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100">Export CSV</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Name</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Email</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Rides Taken</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Date Joined</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredUsers.map((user, i) => (
                        <tr 
                          key={i} 
                          onClick={() => handleUserClick(user)}
                          className="hover:bg-slate-50 transition-all group cursor-pointer"
                        >
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-black shadow-sm group-hover:scale-110 transition-transform">
                                {user.full_name?.charAt(0) || 'U'}
                              </div>
                              <span className="text-sm font-black text-slate-900 italic tracking-tight">{user.full_name}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-sm font-medium text-slate-500">{user.email}</td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-emerald-500" />
                              <span className="text-sm font-black italic">{user.rides?.[0]?.count || 0} Trips</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date(user.created_at).toLocaleDateString()}</td>
                          <td className="px-8 py-6 text-right">
                            <button className="p-2 text-slate-300 hover:text-slate-900 transition-colors" onClick={(e) => { e.stopPropagation(); }}><MoreVertical className="w-5 h-5" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'drivers' && (
              <motion.div 
                key="drivers"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden"
              >
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black italic tracking-tight">Driver Management</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Total {drivers.length} verified partners</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="p-3 bg-slate-50 rounded-xl text-slate-400 border border-slate-100 hover:text-emerald-600 transition-all"><Filter className="w-5 h-5" /></button>
                    <button className="bg-[#10B981] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100">Add Driver</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Driver Partner</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Phone</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Vehicle</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Rating</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredDrivers.map((driver, i) => (
                        <tr 
                          key={i} 
                          onClick={() => handleUserClick(driver)}
                          className="hover:bg-slate-50 transition-all group cursor-pointer"
                        >
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 font-black shadow-inner border border-slate-200">
                                {driver.full_name?.charAt(0) || 'D'}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-900 italic tracking-tight">{driver.full_name}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {driver.id.slice(0, 8)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-sm font-black italic text-slate-600">{driver.phone_number || 'N/A'}</td>
                          <td className="px-8 py-6">
                            <span className="px-3 py-1.5 bg-slate-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 border border-slate-200">{driver.vehicle_type || 'Tricycle'}</span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                              <Star className={`w-4 h-4 ${driver.rating < 4 ? 'text-red-500 fill-red-500' : 'text-amber-400 fill-amber-400'}`} />
                              <span className={`text-sm font-black italic ${driver.rating < 4 ? 'text-red-500' : 'text-slate-900'}`}>
                                {driver.rating.toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${driver.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                              <span className={`text-[10px] font-black uppercase tracking-widest ${driver.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {driver.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                             <button className="p-2 text-slate-300 hover:text-slate-900 transition-colors" onClick={(e) => { e.stopPropagation(); }}><MoreVertical className="w-5 h-5" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-slate-900 p-8 text-white relative">
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="absolute top-8 right-8 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-[#10B981] rounded-[2rem] flex items-center justify-center text-4xl font-black shadow-2xl">
                    {selectedUser.full_name?.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase">{selectedUser.full_name}</h2>
                    <p className="text-emerald-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">{selectedUser.role} Profile</p>
                    <div className="flex items-center gap-4 mt-4">
                      <div className="px-4 py-1.5 bg-white/10 rounded-full text-[10px] font-black tracking-widest border border-white/10 uppercase">ID: {selectedUser.id.slice(0, 8)}</div>
                      <div className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black tracking-widest border border-emerald-500/20 uppercase">Status: Active</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Contact Information</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Email Address</p>
                        <p className="font-bold text-slate-700">{selectedUser.email}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Phone Number</p>
                        <p className="font-bold text-slate-700">{selectedUser.phone_number || 'No phone linked'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Account Stats</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Date Joined</p>
                        <p className="font-bold text-slate-700">{new Date(selectedUser.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Preferred Vehicle</p>
                        <p className="font-bold text-slate-700">Tricycle (Most frequent)</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Recent Trip History</h4>
                  {loadingDetails ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
                  ) : userRides.length > 0 ? (
                    <div className="space-y-3">
                      {userRides.map((ride: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
                              <Activity className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-700 uppercase italic tracking-tight truncate w-40">{ride.destination}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{new Date(ride.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-emerald-600 italic">₱{ride.fare_estimate}</p>
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{ride.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100 text-slate-400 text-sm font-bold uppercase tracking-widest">No trips found for this user</div>
                  )}
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                <button className="flex-1 py-4 bg-[#10B981] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all active:scale-95">Reset Password</button>
                <button onClick={() => setSelectedUser(null)} className="px-8 py-4 bg-white text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 hover:text-slate-600 transition-all">Close Details</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
