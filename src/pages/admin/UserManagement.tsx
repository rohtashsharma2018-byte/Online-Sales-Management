import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";
import { toast } from "sonner";
import { Search, ShieldAlert, Shield, ShieldOff, Trash2, Plus, X, Eye, EyeOff } from "lucide-react";
import { UserProfile } from "../../types";
import { Button } from "../../components/ui/button";

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailColName, setEmailColName] = useState<"email" | "user_email">("email");

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
      if (data && data.length > 0) {
        if ('user_email' in data[0]) {
          setEmailColName("user_email");
        } else {
          setEmailColName("email");
        }
      }
    } catch (err: any) {
      toast.error("Error fetching users: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const onAddUserSubmit = async (data: any) => {
    try {
      const phone = data.phone;
      const syntheticEmail = `${phone}@modarnet.internal`;

      // Create user using signUp
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
        // Explicitly upsert the profile with variables
        const profileToUpsert: any = {
          id: authData.user.id,
          name: data.name,
          phone: phone,
          address: data.address,
          role: "user"
        };
        
        if (emailColName === "user_email") {
          profileToUpsert.user_email = syntheticEmail;
        } else {
          profileToUpsert.email = syntheticEmail;
        }

        await supabase
          .from("profiles")
          .upsert(profileToUpsert);

        toast.success("User added successfully!");
        setIsAddModalOpen(false);
        reset();
        fetchUsers();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to add user");
    }
  };

  const filteredUsers = users.filter((u) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const n = (u.name || "").toLowerCase();
      const e = (u.email || (u as any).user_email || "").toLowerCase();
      return n.includes(q) || e.includes(q);
    }
    return true;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin": return "bg-purple-100 text-purple-700 border-purple-200";
      case "blocked": return "bg-rose-100 text-rose-700 border-rose-200";
      default: return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all duration-300">
        <div className="flex-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">User Management</h2>
          <p className="text-sm text-slate-500">Show active users with roles</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
            />
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add New User</h3>
                <p className="text-xs text-slate-500">Create a new account manually.</p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors border border-transparent hover:border-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onAddUserSubmit)} className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Full Name</label>
                  <input 
                    {...register("name", { required: "Name is required" })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Enter full name"
                  />
                  {errors.name && <p className="text-rose-500 text-[10px] mt-1 font-medium">{errors.name.message as string}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Mobile Number</label>
                  <input 
                    {...register("phone", { 
                      required: "Mobile is required", 
                      pattern: { value: /^[0-9]{10}$/, message: "Enter 10 digit mobile" } 
                    })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="10-digit mobile"
                  />
                  {errors.phone && <p className="text-rose-500 text-[10px] mt-1 font-medium">{errors.phone.message as string}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Address</label>
                  <textarea 
                    {...register("address", { required: "Address is required" })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none bg-white font-sans"
                    placeholder="Enter full address"
                    rows={2}
                  />
                  {errors.address && <p className="text-rose-500 text-[10px] mt-1 font-medium">{errors.address.message as string}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      {...register("password", { required: "Password is required", minLength: { value: 6, message: "Min 6 characters" } })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-11 transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-lg"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-rose-500 text-[10px] mt-1 font-medium">{errors.password.message as string}</p>}
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 rounded-xl h-11 font-bold text-slate-600 border-slate-200"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl h-11 font-bold text-white shadow-lg shadow-blue-200"
                >
                  Create Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">All Users</h3>
          <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
            {filteredUsers.length} users
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Joining Date</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">User Name</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">User Email</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Address</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Role & Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-xs text-slate-500 font-bold uppercase tracking-widest">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-xs text-slate-500 italic font-medium">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-600">
                      <div className="text-xs font-bold text-slate-800">
                        {u.created_at ? format(new Date(u.created_at), "MMM d, yyyy") : "N/A"}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">
                        ID: {u.id}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-bold text-slate-900">{u.name || 'No Name'}</div>
                      <div className="text-xs text-slate-500">{u.phone || 'No Phone'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-slate-700">{u.email || (u as any).user_email || <span className="text-slate-400 italic">No Email</span>}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-700 max-w-xs truncate" title={u.address}>
                        {u.address || <span className="text-slate-400 italic">No Address Saved</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${getRoleBadge(u.role)}`}>
                        {u.role === 'admin' && <Shield className="w-3 h-3" />}
                        {u.role === 'blocked' && <ShieldOff className="w-3 h-3" />}
                        {u.role || 'user'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
