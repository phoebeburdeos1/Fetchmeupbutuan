"use client"

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Car, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  ArrowLeft,
  ChevronDown,
  Shield
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Tab State
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(
    (searchParams.get('tab') as 'login' | 'signup') || 'login'
  )

  // Form States
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'user' | 'driver'>(
    (searchParams.get('role') as 'user' | 'driver') || 'user'
  )
  
  // OTP States
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', ''])
  const [step, setStep] = useState<'auth' | 'verify'>('auth')
  const [timer, setTimer] = useState(0)
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Sync tab/role from URL if changed
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    const roleParam = searchParams.get('role')
    if (tabParam === 'login' || tabParam === 'signup') setActiveTab(tabParam)
    if (roleParam === 'user' || roleParam === 'driver') setRole(roleParam)
  }, [searchParams])

  // Timer logic for resend
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timer])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Hardcoded Admin Bypass (Allows entry even if network fails)
    if (email === 'fetchmeup@gmail.com' && (password === 'admin123' || password === 'ADMIN123')) {
      // Still attempt to sign in in the background to get a session for RLS
      supabase.auth.signInWithPassword({ email, password }).catch(() => {})
      
      toast.success("Welcome, Admin!")
      if (typeof window !== 'undefined') {
        document.cookie = "admin_access=true; path=/; max-age=86400" 
      }
      router.push('/dashboard/admin')
      setLoading(false)
      return
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else if (data.user) {
      if (!data.user.email_confirmed_at) {
        toast.error("Please verify your email first.")
        setStep('verify')
        setLoading(false)
        return
      }

      toast.success("Welcome back!")
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      const userRole = profile?.role || 'user'
      router.push(`/dashboard/${userRole}`)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match!")
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      toast.success("Account created! Verification code sent.")
      setStep('verify')
      setTimer(60)
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = otp.join('')
    if (token.length !== 8) {
      toast.error("Please enter the 8-digit code.")
      return
    }

    setLoading(true)
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup', // Verification code sent during signup
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else if (data.user) {
      toast.success("Verification successful!")
      
      // Get role from user metadata (backup if profile trigger takes a second)
      const userRole = data.user.user_metadata?.role || 'user'
      router.push(`/dashboard/${userRole}`)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1)
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Move to next input if value is entered
    if (value && index < 7) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleResendCode = async () => {
    if (timer > 0) return
    setLoading(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("New code sent!")
      setTimer(60)
    }
    setLoading(false)
  }

  if (step === 'verify') {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-8"
      >
        <div className="space-y-2">
          <button 
            onClick={() => setStep('auth')}
            className="flex items-center text-xs font-bold text-slate-400 hover:text-emerald-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <h3 className="text-2xl font-bold text-slate-900">Enter Verification Code</h3>
          <p className="text-slate-500 text-sm">
            Enter the 8-digit code sent to <span className="font-bold text-slate-900">{email}</span>.
          </p>
        </div>

        <form onSubmit={handleVerifyOtp} className="space-y-8">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                className="w-full h-14 text-center text-xl font-black bg-slate-50 border-2 border-slate-100 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all focus:bg-white"
              />
            ))}
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Access Dashboard"}
            </button>

            <div className="text-center">
              {timer > 0 ? (
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Resend code in <span className="text-emerald-500">{timer}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-xs font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest underline underline-offset-4"
                >
                  Resend Verification Code
                </button>
              )}
            </div>
          </div>
        </form>
      </motion.div>
    )
  }

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
        <button
          onClick={() => setActiveTab('login')}
          className={`flex-1 py-3 text-sm font-black uppercase tracking-wider rounded-xl transition-all ${
            activeTab === 'login' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Login
        </button>
        <button
          onClick={() => setActiveTab('signup')}
          className={`flex-1 py-3 text-sm font-black uppercase tracking-wider rounded-xl transition-all ${
            activeTab === 'signup' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Sign Up
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'login' ? (
          <motion.form
            key="login-form"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onSubmit={handleLogin}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</label>
                  <button type="button" className="text-[10px] font-black text-emerald-600 hover:underline uppercase tracking-widest">Forgot?</button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-500 focus:bg-white transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Login
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-wider">
              Don't have an account?{' '}
              <button 
                type="button"
                onClick={() => setActiveTab('signup')}
                className="text-emerald-600 hover:underline"
              >
                Create an account
              </button>
            </p>
          </motion.form>
        ) : (
          <motion.form
            key="signup-form"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onSubmit={handleSignUp}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
                  <div className="relative group">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-500 focus:bg-white transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm</label>
                  <div className="relative group">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-2xl outline-none transition-all text-sm ${
                        confirmPassword && password !== confirmPassword 
                          ? 'border-red-200 focus:border-red-500 bg-red-50' 
                          : 'border-slate-100 focus:border-emerald-500 focus:bg-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Join as:</label>
                <div className="relative">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'user' | 'driver')}
                    className="w-full pl-4 pr-10 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-500 focus:bg-white transition-all text-sm appearance-none font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="user">User (Rider)</option>
                    <option value="driver">Driver</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (!!confirmPassword && password !== confirmPassword)}
              className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-wider">
              Already have an account?{' '}
              <button 
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-emerald-600 hover:underline"
              >
                Log in
              </button>
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-10">
        <Link href="/" className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-[1.5rem] shadow-xl shadow-emerald-200 mb-6 rotate-3 hover:rotate-6 transition-transform">
          <Car className="text-white w-8 h-8" />
        </Link>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">FETCH ME UP</h2>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1 ml-1">Authentication</p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-10 px-6 sm:px-12 shadow-[0_30px_60px_rgba(16,185,129,0.12)] rounded-[3rem] border border-slate-50">
          <Suspense fallback={<div className="h-[400px] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>}>
            <LoginContent />
          </Suspense>
          
          <div className="mt-10 pt-6 border-t border-slate-50 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Secure 256-bit Encryption</span>
          </div>
        </div>
      </div>
    </div>
  )
}
