import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { 
  Eye, 
  EyeOff, 
  Laptop as LaptopIcon, 
  ShieldCheck, 
  Clock, 
  ChevronDown, 
  ArrowRight, 
  CheckCircle2, 
  FileText, 
  Truck, 
  Info,
  Layers,
  Sparkles,
  Award,
  BookOpen,
  Phone,
  X
} from "lucide-react";
import { Laptop } from "../types";
import { motion, AnimatePresence } from "motion/react";

// Dynamic SVG representation matching TechRent's official logo
export const TechRentLogo: React.FC<{ className?: string; dark?: boolean }> = ({ className = "h-14", dark = false }) => {
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Outer oval container */}
      <div className="relative flex items-center justify-center p-2 w-[160px] h-[95px]">
        {/* The Registered Mark */}
        <span className={`absolute top-0 right-1 text-[11px] font-bold ${dark ? "text-slate-400" : "text-slate-600"}`}>®</span>
        
        {/* Main Oval Ring */}
        <svg className="absolute inset-0 w-full h-full text-slate-900" viewBox="0 0 160 95" fill="none">
          <ellipse cx="80" cy="47.5" rx="72" ry="42" stroke="currentColor" strokeWidth="2.5" strokeDasharray="240 10" />
        </svg>

        {/* TechRent Initial Block */}
        <div className="flex gap-4 justify-center items-center relative z-10 -mt-1">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl tracking-tight shadow-lg border border-slate-700">
            TR
          </div>
        </div>
      </div>
      
      {/* Corporate Label */}
      <div className="text-center mt-1">
        <h1 className="text-[20px] font-black tracking-[4px] text-slate-900 leading-none">TECHRENT</h1>
        <p className="text-[11px] font-medium tracking-[1.5px] text-slate-500 mt-1 italic">Equipment Redefined</p>
      </div>
    </div>
  );
};

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showHelplineModal, setShowHelplineModal] = useState(false);
  const [helphoneNumber, setHelphoneNumber] = useState("+91 XXXXX XXXXX");

  useEffect(() => {
    if (showHelplineModal) {
      setHelphoneNumber("+91 XXXXX XXXXX");
    }
  }, [showHelplineModal]);
  
  // Real laptops from DB
  const [dbLaptops, setDbLaptops] = useState<Laptop[]>([]);
  const [loadingLaptops, setLoadingLaptops] = useState(true);

  // References for smoother scrolling
  const catalogRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);

  // React Hook Forms
  const { register: registerLogin, handleSubmit: handleLoginSubmit, reset: resetLogin } = useForm();
  const { register: registerSignup, handleSubmit: handleSignupSubmit, formState: { errors: signupErrors }, reset: resetSignup } = useForm();

  // Load laptops on mount
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoadingLaptops(false);
      return;
    }
    const loadInventory = async () => {
      try {
        const { data, error } = await supabase
          .from("laptops")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data) {
          setDbLaptops(data as Laptop[]);
        }
      } catch (err) {
        console.warn("Could not load real hardware inventory for landing page preview, using fallbacks:", err);
      } finally {
        setLoadingLaptops(false);
      }
    };
    loadInventory();
  }, []);

  // Standard Login Action
  const onLoginSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      const phone = data.phone.trim();
      const syntheticEmail = `${phone}@modarnet.internal`;

      const { error } = await supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password: data.password,
      });
      if (error) throw error;
      toast.success("Welcome back to TechRent!");
    } catch (error: any) {
      toast.error(error.message || "Invalid credentials. Please verify your number and password.");
    } finally {
      setSubmitting(false);
    }
  };

  // Standard Signup Action
  const onSignupSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      const phone = data.phone.trim();
      const syntheticEmail = `${phone}@modarnet.internal`;

      // 1. Auth Signup with user meta
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: syntheticEmail,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
            phone_number: phone,
            address: data.address || ""
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Insert secure public profile record
        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert({
            id: authData.user.id,
            email: syntheticEmail,
            name: data.name,
            phone: phone,
            address: data.address || "",
            role: "user"
          });

        if (upsertError) {
          console.warn("Public profile syncing notice:", upsertError);
        }

        toast.success("Account created successfully! You can now sign in.");
        setActiveTab("signin");
        resetLogin();
      }
    } catch (error: any) {
      toast.error(error.message || "Registration failed. Verify your details.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper action: Scroll to Ref smoothly
  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Click on a laptop card CTA
  const handleProductAction = (laptopName: string) => {
    toast.info(`To request "${laptopName}", please sign in or create a quick account below.`);
    scrollTo(formRef);
  };

  // Default fallback laptops for preview
  const fallbackLaptops: Partial<Laptop>[] = [
    {
      id: "demo-mac",
      name: "Apple MacBook Pro M3 Max",
      category: "Powerhouse",
      description: "16-inch liquid retina XDR, 36GB RAM, 1TB SSD. Built for artificial intelligence, graphic simulation, and heavy compile workloads.",
      price_per_day: 15,
      sell_price: 2499,
      stock: 4,
      image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: "demo-x1",
      name: "Lenovo ThinkPad X1 Carbon Gen 11",
      category: "Enterprise Elite",
      description: "Intel Core i7 Evo, 32GB RAM, 512GB NVMe. Elegant matte carbon weave, military grade robust durability with privacy guard screen.",
      price_per_day: 12,
      sell_price: 1899,
      stock: 7,
      image_url: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: "demo-xps",
      name: "Dell XPS 15 InfinityEdge",
      category: "Studio Pro",
      description: "NVIDIA RTX 4060, Intel Core Ultra 9, 4K OLED touch display. Seamless borderless design engineered with aircraft aluminum chassis.",
      price_per_day: 14,
      sell_price: 2199,
      stock: 3,
      image_url: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=400&q=80"
    }
  ];

  const displayLaptops = dbLaptops.length > 0 ? dbLaptops : (fallbackLaptops as Laptop[]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans selection:bg-slate-900 selection:text-white">
      
      {/* Dynamic Header Navbar Section */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-100 px-6 py-3 transition-all duration-200 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="scale-75 -my-2 transform origin-left">
              <TechRentLogo className="h-10" />
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <button onClick={() => scrollTo(catalogRef)} className="hover:text-slate-900 transition-colors">
              Hardware Catalog
            </button>
            <span className="text-slate-200">|</span>
            <button onClick={() => scrollTo(faqRef)} className="hover:text-slate-900 transition-colors">
              FAQs & Guides
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              size="sm" 
              onClick={() => { setActiveTab("signin"); scrollTo(formRef); }}
              className="text-xs font-bold py-2 px-4 shadow-sm h-9 border-slate-200 hover:bg-slate-50 uppercase tracking-wider"
            >
              Log In
            </Button>
            <Button 
              size="sm" 
              onClick={() => { setActiveTab("signup"); scrollTo(formRef); }}
              className="text-xs font-bold py-2 px-4 bg-slate-900 text-white hover:bg-slate-800 h-9 uppercase tracking-wider"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero & Account Portal split grid */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-100/50 via-white to-slate-50 py-12 lg:py-20 px-6 border-b border-slate-200">
        
        {/* Ambient mesh-glow effect */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-slate-200/40 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-10 w-[300px] h-[300px] bg-blue-50/50 rounded-full blur-[80px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Hero left details block */}
          <div className="lg:col-span-7 space-y-6 text-left animate-in fade-in slide-in-from-left duration-300">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-slate-600" />
              Corporate IT Procurement Redefined
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              <span
                onClick={() => setShowHelplineModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-2xl inline-flex items-center gap-3 cursor-pointer shadow-xl transition-all duration-300 hover:shadow-blue-500/30 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] border border-blue-400 select-none group text-left align-middle"
              >
                High-Performance Laptops & Desktops,
                <motion.span 
                  animate={{
                    rotate: [0, -18, 15, -18, 15, -10, 10, -5, 5, 0]
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    repeatDelay: 0.8,
                    ease: "easeInOut"
                  }}
                  className="inline-flex items-center justify-center bg-green-600 group-hover:bg-green-500 rounded-full p-2 transition-colors shrink-0 shadow-md shadow-green-600/35"
                >
                  <Phone className="w-5 h-5 text-white" />
                </motion.span>
              </span>
              <br className="my-2" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-800 inline-block mt-2">
                On Demand.
              </span>
            </h1>
            
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl font-normal leading-relaxed">
              TechRent provides flexible laptop rental programs and premium equipment purchases tailored for professionals, creative studios, and fast-scaling teams. Rent starting from single days or purchase elite models outright.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Button 
                onClick={() => scrollTo(catalogRef)}
                className="bg-slate-900 text-white hover:bg-slate-800 font-bold px-6 h-12 uppercase tracking-wider text-xs flex items-center gap-2 shadow"
              >
                Browse Active Inventory
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Quick trust metrics panel */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-100 max-w-lg">
              <div className="space-y-1">
                <div className="text-2xl font-black text-slate-900">100%</div>
                <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Certified Hardware</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-black text-slate-900">1 day</div>
                <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Instant Delivery</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-black text-slate-900">24/7</div>
                <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">On-Site Support</div>
              </div>
            </div>
          </div>

          {/* Account Portal Right Block */}
          <div ref={formRef} className="lg:col-span-5 w-full max-w-md mx-auto animate-in fade-in slide-in-from-right duration-300">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
              
              {/* Sliding Tab Header */}
              <div className="flex bg-slate-100/60 p-1.5 border-b border-slate-200">
                <button
                  onClick={() => { setActiveTab("signin"); setShowPassword(false); }}
                  className={`flex-1 py-3 text-xs font-black tracking-wider uppercase rounded-xl transition-all ${
                    activeTab === "signin"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setActiveTab("signup"); setShowPassword(false); }}
                  className={`flex-1 py-3 text-xs font-black tracking-wider uppercase rounded-xl transition-all ${
                    activeTab === "signup"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Tab Contents Panel */}
              <div className="p-8">
                {activeTab === "signin" ? (
                  // Sign In Content
                  <div className="space-y-6">
                    <div className="text-center sm:text-left mb-4">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Welcome Back</h3>
                      <p className="text-xs text-slate-500 mt-1">Sign in with your registered mobile number</p>
                    </div>

                    <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile Number</label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. 9876543210 (10-digit)"
                          {...registerLogin("phone", { required: true, pattern: /^[0-9]{10}$/ })}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-300"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="Password code"
                            {...registerLogin("password", { required: true })}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-300 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={submitting}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs h-12 uppercase tracking-wider transition-all shadow-sm rounded-xl mt-2"
                      >
                        {submitting ? "Processing..." : "Secure Sign In"}
                      </Button>
                    </form>
                    
                    <div className="text-center pt-2">
                      <p className="text-xs text-slate-400">
                        Interested in leasing custom specs?{" "}
                        <button 
                          onClick={() => setActiveTab("signup")} 
                          className="text-slate-950 font-semibold hover:underline"
                        >
                          Register here
                        </button>
                      </p>
                    </div>
                  </div>
                ) : (
                  // Sign Up Content
                  <div className="space-y-5">
                    <div className="text-center sm:text-left mb-2">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight font-sans">Get Started</h3>
                      <p className="text-xs text-slate-500 mt-1">Submit your details to activate client privileges</p>
                    </div>

                    <form onSubmit={handleSignupSubmit(onSignupSubmit)} className="space-y-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                        <input
                          type="text"
                          placeholder="Your Name"
                          {...registerSignup("name", { required: "Name is required" })}
                          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-300"
                        />
                        {signupErrors.name && (
                          <p className="text-rose-500 text-[10px] font-semibold">{signupErrors.name.message as string}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile Number</label>
                        <input
                          type="tel"
                          placeholder="10-digit number"
                          {...registerSignup("phone", { 
                            required: "Mobile is required", 
                            pattern: { value: /^[0-9]{10}$/, message: "Must be a 10-digit phone number" } 
                          })}
                          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-300"
                        />
                        {signupErrors.phone && (
                          <p className="text-rose-500 text-[10px] font-semibold">{signupErrors.phone.message as string}</p>
                        )}
                      </div>



                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Choose Code Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Min 6 characters"
                            {...registerSignup("password", { 
                              required: "Password is required", 
                              minLength: { value: 6, message: "Minimum 6 characters required" } 
                            })}
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-300 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {signupErrors.password && (
                          <p className="text-rose-500 text-[10px] font-semibold">{signupErrors.password.message as string}</p>
                        )}
                      </div>

                      <Button 
                        type="submit" 
                        disabled={submitting}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs h-11 uppercase tracking-wider transition-all shadow-sm rounded-xl mt-2"
                      >
                        {submitting ? "Processing..." : "Complete Registration"}
                      </Button>
                    </form>

                    <div className="text-center pt-1">
                      <p className="text-xs text-slate-400">
                        Already have access keys?{" "}
                        <button 
                          onClick={() => setActiveTab("signin")} 
                          className="text-slate-950 font-semibold hover:underline"
                        >
                          Sign In here
                        </button>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Corporate Slogan Banner */}
      <section className="bg-slate-900 text-slate-100 py-10 px-6 font-mono border-y border-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-sm font-bold tracking-[3px] text-slate-400 uppercase">OUR PROMISE</h4>
            <p className="text-lg font-bold text-white font-sans">"Ideas to reality! We supply hardware; you supply vision."</p>
          </div>
          <div className="flex gap-4 md:gap-8 text-xs select-none">
            <div className="flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-500" /> V8 Inspected</div>
            <div className="flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-500" /> Direct Delivery</div>
            <div className="flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-500" /> Invoice Sync</div>
          </div>
        </div>
      </section>

      {/* Core Services / Highlighted Features Layout */}
      <section className="py-20 px-6 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto space-y-14">
          
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <div className="text-[10px] font-black text-slate-500 tracking-[3px] uppercase">Service Capabilities</div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight sm:text-4xl">
              Turnkey IT Hardware Systems
            </h2>
            <p className="text-sm text-slate-500 leading-normal">
              Skip capital expenditure and leadtimes. Rent state-of-the-art computers for specific team deliverables or purchase fully certified rigs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/60 hover:border-slate-300 transition-all hover:shadow-md hover:-translate-y-0.5 duration-200 text-left">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-4">
                <LaptopIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">High-Spec Inventory</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Choose between leading MacOS models and heavy-duty Linux/Windows machines preconfigured for production pipelines.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/60 hover:border-slate-300 transition-all hover:shadow-md hover:-translate-y-0.5 duration-200 text-left">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Flexible Rent Plans</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Rent for a weekend, a sprint, or multiple fiscal quarters. Scale nodes or switch specifications instantly as projects shift.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/60 hover:border-slate-300 transition-all hover:shadow-md hover:-translate-y-0.5 duration-200 text-left">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-4">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Procure & Buyout</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Acquire premium assets with quick delivery warranties, tested profiles, and convenient corporate invoice payments.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/60 hover:border-slate-300 transition-all hover:shadow-md hover:-translate-y-0.5 duration-200 text-left">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Premium Security</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                All physical systems are sanitized, security-cleared, and reset to bare metal firmware prior to deployment.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* LIVE CATALOG SHOWCASE PREVIEW */}
      <section ref={catalogRef} className="py-20 px-6 bg-slate-100/50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div className="space-y-2 text-left">
              <div className="text-[10px] font-black text-slate-500 tracking-[3px] uppercase">ACTIVE FLEET PREVIEW</div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight sm:text-4xl">Available Specifications</h2>
              <p className="text-sm text-slate-500 max-w-lg">
                Inspect a fraction of our live deployed inventory below. Sign in to place immediate rentals or purchase locks.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white shadow-sm border border-slate-200/80 px-4 py-2 rounded-full font-semibold">
              <Layers className="w-4 h-4 text-slate-400" />
              Showing {displayLaptops.length} Premium Configurations
            </div>
          </div>

          {loadingLaptops ? (
            <div className="flex items-center justify-center py-20 text-slate-400 font-mono text-xs font-bold tracking-wider uppercase">
              QUERYING LIVE SUPABASE SPECS...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayLaptops.map((laptop) => (
                <div 
                  key={laptop.id} 
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-lg transition-all duration-300 relative text-left"
                >
                  
                  {/* Category overlay */}
                  {laptop.category && (
                    <span className="absolute top-4 left-4 z-10 bg-slate-900/90 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md backdrop-blur-sm">
                      {laptop.category}
                    </span>
                  )}

                  {/* Stock status overlay */}
                  <span className={`absolute top-4 right-4 z-10 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-sm border backdrop-blur-sm ${
                    laptop.stock > 0 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                      : "bg-rose-50 text-rose-700 border-rose-100"
                  }`}>
                    {laptop.stock > 0 ? "In Stock" : "Out of Stock"}
                  </span>

                  {/* Laptop image block */}
                  <div className="h-48 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    <img 
                      src={laptop.image_url || "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=400&q=80"} 
                      alt={laptop.name} 
                      onError={(e)=>{
                        // fallback image
                        (e.target as any).src = "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=400&q=80";
                      }}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Listing details */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="font-sans text-xs font-bold text-slate-400 font-mono tracking-wider">{laptop.product_code || "SKU-LIVE"}</div>
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">{laptop.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{laptop.description || "High efficiency enterprise laptop designed to handle rigorous technical simulations, corporate spreadsheet arrays, and complex development workflows."}</p>
                    </div>

                    <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wide">RENTAL RATE</span>
                        <span className="text-base font-black text-slate-950">₹{laptop.price_per_day} <span className="text-xs text-slate-400 font-normal">/ day</span></span>
                      </div>
                      
                      {laptop.sell_price && laptop.sell_price > 0 && (
                        <div className="space-y-0.5 text-right">
                          <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wide">BUYOUT PRICE</span>
                          <span className="text-base font-black text-slate-950">₹{laptop.sell_price}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <Button 
                        size="sm"
                        onClick={() => handleProductAction(laptop.name)}
                        className="text-[10px] font-bold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white py-2 shadow-sm rounded-lg"
                      >
                        Rent Hardware
                      </Button>
                      <Button 
                        variant="default"
                        size="sm"
                        onClick={() => handleProductAction(laptop.name)}
                        className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg"
                      >
                        Buy Spec
                      </Button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* HOW THE LOGISTICS CHAIN WORKS */}
      <section className="py-20 px-6 bg-white border-b border-slate-200 text-center">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="space-y-3 max-w-xl mx-auto">
            <div className="text-[10px] font-black text-slate-500 tracking-[3.5px] uppercase">DEPLOYMENT CHAIN</div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight sm:text-4xl">
              Simplifying Hardware Lifecycle
            </h2>
            <p className="text-sm text-slate-500 leading-normal">
              From our inventory vaults straight to your desk with minimal friction. Here is the operational schematic.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Step 1 */}
            <div className="space-y-4 relative text-left p-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-900 font-bold text-lg font-mono shadow-sm">
                01
              </div>
              <h3 className="text-lg font-bold text-slate-900">Configure & Select</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Log in and browse active equipment files. Select specifications, choose desired days for rentals or indicate straight buy contracts.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-4 relative text-left p-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-900 font-bold text-lg font-mono shadow-sm">
                02
              </div>
              <h3 className="text-lg font-bold text-slate-900">Admin Dispatch</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Our operations team verifies your request files, flashes clean customized environment images, and prepares physical items for courier.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-4 relative text-left p-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-900 font-bold text-lg font-mono shadow-sm">
                03
              </div>
              <h3 className="text-lg font-bold text-slate-900">Incentive Support</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Receive systems directly at your office location. Check active rental logs, process returns easily, and enjoy prompt device tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section ref={faqRef} className="py-20 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-12 text-left">
          
          <div className="text-center space-y-2">
            <div className="text-[10px] font-black text-slate-500 tracking-[3px] uppercase">CONCIERGE DESK</div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight sm:text-4xl">Questions & Answers</h2>
            <p className="text-xs text-slate-500 mt-2">Get swift explanations on our technical rental systems and purchases.</p>
          </div>

          <div className="space-y-4">
            
            {/* FAQ Item 1 */}
            <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Info size={16} className="text-slate-400" />
                Who can register and request rentals from TechRent?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                TechRent is open to active corporate entities, consulting professionals, individual engineering students, and remote work teams. Everyone creates a profile containing valid delivery addresses and mobile numbers to qualify for security verification.
              </p>
            </div>

            {/* FAQ Item 2 */}
            <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Info size={16} className="text-slate-400" />
                How are rental days and pricing calculated?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Rates are billed on a neat per-day basis from the chosen pickup date until the physical system return. Taxes are configured transparently, and we calculate instant invoice sums upon completing submission files inside user dashboards.
              </p>
            </div>

            {/* FAQ Item 3 */}
            <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Info size={16} className="text-slate-400" />
                Can we purchase rental machines outright later on?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Absolutely! Our catalogue lists outright purchase ("buyout") valuations alongside standard daily rental plans. You can submit dedicated purchase files, and admins will arrange standard ownership transfers, original warranties, and billing updates.
              </p>
            </div>

            {/* FAQ Item 4 */}
            <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Info size={16} className="text-slate-400" />
                What support is provided in case of hardware failures?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                TechRent laptops are backed by professional on-site support. If hardware defaults occur, we offer immediate cross-ship dispatch within 2 business hours and ensure replacement systems arrive completely configured.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* Premium Footer */}
      <footer className="bg-slate-900 text-slate-500 py-12 px-6 border-t border-slate-950 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          
          <div className="flex flex-col items-center md:items-start gap-2">
            {/* Simple monochrome representation for footer */}
            <div className="flex items-center gap-2 text-white font-black tracking-widest text-sm uppercase">
              TECHRENT
            </div>
            <p className="text-[10px] text-slate-500">Corporate IT Solutions & Procurement. Equipment Redefined!</p>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-[11px] font-semibold text-slate-400">
            <button onClick={() => scrollTo(catalogRef)} className="hover:text-white transition-colors">Catalog Specifications</button>
            <button onClick={() => scrollTo(formRef)} className="hover:text-white transition-colors">Client Log In</button>
            <button onClick={() => scrollTo(faqRef)} className="hover:text-white transition-colors font-sans">Frequently Asked Questions</button>
            <Link to="/signup" className="hover:text-white transition-colors">New Registration</Link>
          </div>

          <div className="text-center md:text-right space-y-1">
            <p className="text-[10px] text-slate-600">© 2026 TechRent Inc. Licensed in compliance with local business laws.</p>
            <p className="text-[9px] text-slate-700">All registered marks, product screenshots, and laptops remain proprietary brand materials.</p>
          </div>

        </div>
      </footer>

      {/* Helpline modal */}
      <AnimatePresence>
        {showHelplineModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="helpline-modal-overlay">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelplineModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
              id="helpline-backdrop"
            />
            
            {/* Modal Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl p-6 md:p-8 z-10 text-center"
              id="helpline-modal-content"
            >
              {/* Close Button */}
              <button
                id="close-helpline-modal"
                onClick={() => setShowHelplineModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mx-auto w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-5">
                <Phone className="w-7 h-7 text-blue-600 animate-bounce" />
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-1" id="helpline-title">
                TechRent Hotline Support
              </h3>
              <p className="text-xs text-slate-500 mb-6 px-1">
                Need premium configurations, custom rental agreements, or instant setup updates? Connect with our dedicated deployment desk.
              </p>

              {/* Animated Helpline Display Box */}
              <div className="bg-slate-950 rounded-xl p-5 py-6 border border-slate-800 shadow-inner flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-blue-500/5 pointer-events-none" />
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-extrabold mb-3">Dial Priority Line</span>
                
                {/* Each character of helpline number is individually animated */}
                <div className="flex items-center justify-center gap-1 sm:gap-1.5" id="animated-phone-digits">
                  {Array.from(helphoneNumber).map((char, index) => {
                    if (char === " ") {
                      return <div key={index} className="w-2.5 sm:w-3" />;
                    }
                    return (
                      <motion.span
                        key={index}
                        initial={{ opacity: 0, y: 20, scale: 0.5, rotate: -15 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0, 
                          scale: 1, 
                          rotate: 0,
                          transition: {
                            type: "spring",
                            stiffness: 260,
                            damping: 14,
                            delay: index * 0.04
                          }
                        }}
                        whileHover={{ 
                          scale: 1.3, 
                          color: "#3b82f6", 
                          y: -5,
                          textShadow: "0 0 10px rgba(59,130,246,0.6)",
                          transition: { duration: 0.1 }
                        }}
                        className="text-xl sm:text-2xl font-black text-white inline-block cursor-pointer tracking-wide"
                        style={{
                          textShadow: "0 0 8px rgba(255,255,255,0.1)"
                        }}
                      >
                        {char}
                      </motion.span>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                  <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Active Live Support</span>
                </div>
              </div>

              {/* Action options */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex gap-3 justify-center">
                <Button 
                   id="copy-helpline-button"
                  onClick={() => {
                    navigator.clipboard.writeText(helphoneNumber);
                    toast.success("Helpline number copied!");
                  }}
                  variant="outline" 
                   className="font-bold text-[10px] uppercase tracking-wider h-10 px-4 border-slate-200 hover:bg-slate-50 text-slate-700"
                >
                  Copy Number
                </Button>
                <a 
                   id="call-helpline-link"
                  href={`tel:${helphoneNumber.replace(/\s+/g, "")}`}
                  className="inline-flex items-center justify-center font-bold text-[10px] uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 h-10 px-5 rounded-lg shadow-md hover:shadow-blue-500/20 active:scale-95 transition-all text-xs"
                >
                  Call Live Agent
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
