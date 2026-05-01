'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Car, 
  MapPin, 
  ShieldCheck, 
  ChevronRight, 
  Download, 
  UserPlus, 
  CheckCircle2,
  Users,
  Target
} from 'lucide-react';

export default function LandingPage() {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Car className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">FETCH ME UP</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="#features" className="hover:text-emerald-600 transition-colors">Features</Link>
            <Link href="#about" className="hover:text-emerald-600 transition-colors">Our Story</Link>
            <Link href="#how-it-works" className="hover:text-emerald-600 transition-colors">How It Works</Link>
            <Link href="/login" className="bg-emerald-500 text-white px-5 py-2 rounded-full hover:bg-emerald-600 transition-all shadow-sm">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial="initial"
              animate="animate"
              variants={staggerContainer}
              className="space-y-8"
            >
              <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold tracking-wide uppercase">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Launching in Butuan City
              </motion.div>
              
              <motion.h1 variants={fadeIn} className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-[1.1]">
                Butuan’s First <span className="text-emerald-500">Homegrown</span> Ride-Hailing App.
              </motion.h1>
              
              <motion.p variants={fadeIn} className="text-lg text-slate-600 leading-relaxed max-w-lg">
                Safe, predictable, and hassle-free rides at the tap of a button. 
                No more overcharging, just reliable transport tailored for the Butuanon lifestyle.
              </motion.p>
              
              <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4">
                <Link href="/login?tab=signup&role=user" className="flex items-center justify-center gap-2 bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 group">
                  Start Riding
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/login?tab=signup&role=driver" className="flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-8 py-4 rounded-xl font-bold hover:border-emerald-500 hover:text-emerald-600 transition-all">
                  Drive with Us
                </Link>
              </motion.div>

              <motion.div variants={fadeIn} className="flex items-center gap-6 pt-4 text-slate-400">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                      <div className="w-full h-full bg-slate-300 animate-pulse" />
                    </div>
                  ))}
                </div>
                <p className="text-sm font-medium italic">Join 1,000+ early Butuanons</p>
              </motion.div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative lg:ml-12"
            >
              <div className="absolute -inset-4 bg-emerald-500/10 rounded-3xl blur-3xl -z-10" />
              <div className="relative bg-slate-50 p-4 rounded-[2.5rem] border-8 border-slate-900 shadow-2xl max-w-[320px] mx-auto">
                <Image 
                  src="/mockup.png"
                  width={280}
                  height={600}
                  alt="FETCH ME UP App Interface"
                  className="rounded-[1.5rem] w-full"
                  priority
                />
              </div>
              {/* Floating badges */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="absolute top-20 -left-4 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                  <ShieldCheck className="text-blue-500 w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Safety Guaranteed</p>
                  <p className="text-sm font-bold text-slate-900">Verified Drivers</p>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 5, delay: 1 }}
                className="absolute bottom-20 -right-4 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
                  <MapPin className="text-emerald-500 w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Real-time</p>
                  <p className="text-sm font-bold text-slate-900">Live Tracking</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
          <div className="space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Built for the Butuanon Commuter</h2>
            <p className="text-slate-600">We solve local transportation problems with smart, digital solutions.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Fixed Fares",
                desc: "Transparent pricing based on official local rates. No more night-time haggling or overcharging.",
                icon: <Target className="w-8 h-8" />
              },
              {
                title: "Real-time Tracking",
                desc: "Watch your ride arrive in real-time. Share your trip status with family for peace of mind.",
                icon: <MapPin className="w-8 h-8" />
              },
              {
                title: "Support Local",
                desc: "A private startup built by Butuanons, for Butuanons. Empowering our local tricycle community.",
                icon: <Users className="w-8 h-8" />
              }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-left space-y-6 group hover:border-emerald-500/50 transition-all"
              >
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-emerald-500 font-bold tracking-wider uppercase text-sm">Our Story</h2>
                <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
                  Modernizing Transport, <br/>One Tap at a Time.
                </h3>
              </div>
              <p className="text-slate-600 text-lg leading-relaxed">
                Born out of the need for better transportation in Butuan City, FETCH ME UP is a technology-driven private startup. 
                We aim to modernize the local transport landscape by bridging the gap between traditional tricycle services and digital convenience.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-6 pt-4">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2 text-emerald-600">
                    <Target className="w-5 h-5" /> Our Mission
                  </h4>
                  <p className="text-sm text-slate-600">To provide every Butuanon with a safe, efficient, and fair commuting experience.</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2 text-emerald-600">
                    <Users className="w-5 h-5" /> The Founders
                  </h4>
                  <p className="text-sm text-slate-600">
                    Mona Almero, Ma. Phoebe Burdeos, Dan Louis Dacut, Kyle Mahinay, Khim Joy Lucintes.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square bg-emerald-500 rounded-[3rem] rotate-3 p-8">
                <div className="w-full h-full bg-slate-900 rounded-[2.5rem] -rotate-3 overflow-hidden relative group">
                  <div className="absolute inset-0 bg-emerald-500/20 group-hover:opacity-0 transition-opacity" />
                  <div className="flex flex-col items-center justify-center h-full text-white text-center p-8 space-y-4">
                    <Car className="w-16 h-16 opacity-50" />
                    <p className="text-xl font-bold italic">"For Butuanons, By Butuanons"</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">Getting Started is Easy</h2>
            <p className="text-slate-400">Join the movement in just a few minutes.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16">
            {/* Riders */}
            <div className="space-y-10">
              <h3 className="text-2xl font-bold flex items-center gap-3">
                <span className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-xs">01</span>
                For Riders
              </h3>
              <div className="space-y-8">
                {[
                  { icon: <Download className="w-6 h-6" />, title: "Download", desc: "Get the app from Play Store or App Store." },
                  { icon: <MapPin className="w-6 h-6" />, title: "Set Destination", desc: "Enter where you want to go and see the fixed price." },
                  { icon: <CheckCircle2 className="w-6 h-6" />, title: "Enjoy the Ride", desc: "Track your driver and arrive safely." }
                ].map((step, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400">
                      {step.icon}
                    </div>
                    <div>
                      <h4 className="font-bold mb-1">{step.title}</h4>
                      <p className="text-slate-400 text-sm">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Drivers */}
            <div className="space-y-10">
              <h3 className="text-2xl font-bold flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs">02</span>
                For Drivers
              </h3>
              <div className="space-y-8">
                {[
                  { icon: <UserPlus className="w-6 h-6" />, title: "Register", desc: "Sign up through our portal with your documents." },
                  { icon: <ShieldCheck className="w-6 h-6" />, title: "Get Verified", desc: "Our team will review your application for safety." },
                  { icon: <Target className="w-6 h-6" />, title: "Start Earning", desc: "Accept rides and get paid fairly for every trip." }
                ].map((step, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400">
                      {step.icon}
                    </div>
                    <div>
                      <h4 className="font-bold mb-1">{step.title}</h4>
                      <p className="text-slate-400 text-sm">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-emerald-500 rounded-[3rem] p-12 text-center text-white space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute -top-24 -left-24 w-96 h-96 bg-white rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-slate-900 rounded-full blur-3xl" />
            </div>
            
            <div className="relative space-y-4">
              <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">Ready to Fetch a Ride?</h2>
              <p className="text-emerald-50 text-lg max-w-xl mx-auto">
                Be among the first to experience the future of transport in Butuan City.
              </p>
            </div>
            
            <div className="relative flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/register" className="bg-white text-emerald-600 px-10 py-4 rounded-2xl font-bold hover:bg-emerald-50 transition-all shadow-xl">
                Get Started Now
              </Link>
              <Link href="/contact" className="bg-emerald-600 text-white border border-emerald-400 px-10 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Car className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900">FETCH ME UP</span>
            </div>
            
            <div className="flex items-center gap-8 text-sm font-medium text-slate-500">
              <Link href="/privacy" className="hover:text-emerald-600 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-emerald-600 transition-colors">Terms of Service</Link>
              <Link href="/contact" className="hover:text-emerald-600 transition-colors">Contact Us</Link>
            </div>
            
            <p className="text-sm text-slate-400">
              © 2026 FETCH ME UP. A Private IT-31 Application Development Project.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
