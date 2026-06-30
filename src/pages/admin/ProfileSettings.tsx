import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { User, Lock, Save, MapPin, Mail, Phone } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function ProfileSettings() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailColName, setEmailColName] = useState<"email" | "user_email">("email");

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();
      
      if (error) throw error;
      if (data) {
        setName(data.name || "");
        setAddress(data.address || "");
        setPhone(data.phone || "");
        
        // Detect if db holds email or user_email
        if ('user_email' in data) {
          setEmailColName("user_email");
          setEmail(data.user_email || "");
        } else {
          setEmailColName("email");
          setEmail(data.email || "");
        }
      }
    } catch (err: any) {
      toast.error("Failed to load profile: " + err.message);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const updateData: any = { name, address, phone };
      if (emailColName === "user_email") {
        updateData.user_email = email;
      } else {
        updateData.email = email;
      }

      // Update in Profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);
        
      if (profileError) throw profileError;

      // Update Password if provided
      if (password) {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        
        const { error: passwordError } = await supabase.auth.updateUser({
          password: password,
        });
        
        if (passwordError) throw passwordError;
      }
      
      toast.success("Profile updated successfully");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error("Error updating profile: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-2xl mx-auto">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">Profile Settings</h2>
        <p className="text-sm text-slate-500 mb-6">Update your account name, email address, phone, and password.</p>
        
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10 block w-full rounded-lg border border-slate-200 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                placeholder="Enter your name"
                required
              />
            </div>
          </div>

          {/* Email Address Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Email Address (User Email)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 block w-full rounded-lg border border-slate-200 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          {/* Phone Number Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10 block w-full rounded-lg border border-slate-200 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                placeholder="Enter your phone number"
                required
              />
            </div>
          </div>

          {/* Address Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Address
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none">
                <MapPin className="h-5 w-5 text-slate-400" />
              </div>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="pl-10 block w-full rounded-lg border border-slate-200 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow resize-none bg-white"
                placeholder="Enter your address"
                required
                rows={3}
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4 tracking-wide uppercase">Change Password</h3>
            <p className="text-xs text-slate-500 mb-4">Leave fields blank if you do not want to change your password.</p>
            
            <div className="space-y-4">
              {/* New Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 block w-full rounded-lg border border-slate-200 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                    placeholder="Enter new password"
                    minLength={6}
                  />
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 block w-full rounded-lg border border-slate-200 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                    placeholder="Confirm new password"
                    minLength={6}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
