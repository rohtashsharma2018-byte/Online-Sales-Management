import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Eye, EyeOff, LayoutGrid } from "lucide-react";
import { TechRentLogo } from "./Login";

export const SignUp: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const phone = data.phone.trim();
      // Use a synthetic email derived from the phone number to bypass SMS/OTP requirements
      // while still using Supabase Auth for session management and security.
      const syntheticEmail = `${phone}@modarnet.internal`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: syntheticEmail,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
            phone_number: phone,
            address: data.address
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Also perform an explicit update/upsert of profile to guarantee address is saved
        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert({
            id: authData.user.id,
            email: syntheticEmail,
            name: data.name,
            phone: phone,
            address: data.address,
            role: "user"
          });
        
        if (upsertError) {
          console.warn("Explicit profile updates report:", upsertError);
        }

        toast.success("Account created successfully! You can now log in.");
        navigate("/login");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 font-sans relative selection:bg-slate-900 selection:text-white">
      {/* Dynamic background accents */}
      <div className="absolute top-0 right-1/4 w-[350px] h-[350px] bg-slate-200/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-10 w-[250px] h-[250px] bg-blue-50/50 rounded-full blur-[80px] pointer-events-none" />

      {/* Corporate branding at top */}
      <div className="mb-6 transform scale-90">
        <TechRentLogo />
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 relative z-10 text-left">
        <div className="mb-6">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Create Client Account</h2>
          <p className="text-xs text-slate-500 mt-1">Join TechRent and start managing high-performance IT equipment immediately.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
            <input 
              {...register("name", { required: "Name is required" })}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-shadow"
              placeholder="e.g. John Doe"
            />
          </div>
          
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile Number</label>
            <input 
              {...register("phone", { 
                required: "Mobile is required", 
                pattern: { value: /^[0-9]{10}$/, message: "Enter a valid 10-digit mobile number" } 
              })}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-shadow"
              placeholder="10-digit number"
            />
            {errors.phone && <p className="text-rose-500 text-[10px] mt-1 font-semibold">{errors.phone.message as string}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Operational/Delivery Address</label>
            <textarea 
              {...register("address", { required: "Address is required" })}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none resize-none bg-white font-sans"
              placeholder="Enter full physical address structure"
              rows={2}
            />
            {errors.address && <p className="text-rose-500 text-[10px] mt-1 font-semibold">{errors.address.message as string}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Choose Safe Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                {...register("password", { 
                  required: "Password is required", 
                  minLength: { value: 6, message: "Choose a password of at least 6 characters" } 
                })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none pr-10 transition-shadow"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-rose-500 text-[10px] mt-1 font-semibold">{errors.password.message as string}</p>}
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs h-11 uppercase tracking-wider transition-all shadow-sm rounded-xl mt-2"
          >
            {loading ? "Creating..." : "Agree & Register Account"}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Already have operational keys?{" "}
            <Link to="/login" className="text-slate-950 font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
