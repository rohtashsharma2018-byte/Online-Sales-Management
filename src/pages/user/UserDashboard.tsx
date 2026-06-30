import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { RentalRequest, PurchaseRequest, UserProfile } from "../../types";
import { format } from "date-fns";

export default function UserDashboard() {
  const { user, role } = useAuth();
  const [profileName, setProfileName] = useState<string>("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    
    fetchProfile();
    fetchRequests();
    fetchPurchaseRequests();

    const rentalSub = supabase
      .channel('user_requests')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rental_requests',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchRequests();
      })
      .subscribe();

    const purchaseSub = supabase
      .channel('user_purchase_requests')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'purchase_requests',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchPurchaseRequests();
      })
      .subscribe();

    return () => {
      rentalSub.unsubscribe();
      purchaseSub.unsubscribe();
    };
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("rental_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching requests:", error.message);
    } else {
      setRequests(data as RentalRequest[]);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    if (data) {
      setProfileName(data.name || "");
      setProfile(data as UserProfile);
    } else {
      setProfileName(user.user_metadata?.full_name || user.email?.split("@")[0] || "User");
    }
  };

  const fetchPurchaseRequests = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("purchase_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching purchase requests:", error.message);
    } else {
      setPurchaseRequests(data as PurchaseRequest[]);
    }
  };

  const safeFormat = (dateStr: string | null | undefined, fmt: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Invalid Date";
      return format(d, fmt);
    } catch (e) {
      return "Error";
    }
  };

  const activeRentals = requests.filter(r => r.status === "active" || r.status === "approved" || r.status === "overdue");
  const pendingRequests = requests.filter(r => r.status === "pending");
  const pendingPurchases = purchaseRequests.filter(r => r.status === "pending");
  
  const rejectedRentals = requests.filter(r => r.status === "rejected");
  const rejectedPurchases = purchaseRequests.filter(r => r.status === "rejected");
  const allRejected = [...rejectedRentals, ...rejectedPurchases].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 3); // Show last 3 rejections

  return (
    <div className="space-y-6">
      {/* Mustard Yellow Banner for User */}
      <div className="bg-[#EAB308] rounded-xl p-4 shadow-sm border border-[#CA8A04] flex items-center justify-between text-white">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90 mb-0.5">Welcome to Portal</div>
          <div className="text-xl font-black tracking-tight uppercase">{profileName || "Valued Customer"}</div>
        </div>
        <div className="text-right">
           <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90 mb-0.5">Account Status</div>
           <div className="inline-flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-full border border-white/20">
              <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse"></div>
              <span className="text-[11px] font-bold uppercase tracking-widest">{role || 'User'}</span>
           </div>
        </div>
      </div>


      {allRejected.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2 mb-3">
             <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
             <h3 className="text-xs font-black text-rose-800 uppercase tracking-widest">Action Required: Recently Rejected Requests</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allRejected.map(req => (
              <div key={req.id} className="bg-white p-3 rounded-lg border border-rose-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black bg-rose-600 text-white px-2 py-0.5 rounded uppercase">Declined</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">{safeFormat(req.created_at, "MMM d")}</span>
                </div>
                <div className="text-xs font-bold text-slate-800 mb-1">{req.laptop_name}</div>
                <div className="text-[10px] text-slate-500 italic mb-2">
                  {'pickup_date' in req ? 'Rental Request' : 'Purchase Request'}
                </div>
                <div className="bg-rose-50 p-2 rounded text-[10px] text-rose-700 border border-rose-100 italic">
                  <strong>Admin Response:</strong> {(() => {
                    const text = 'purpose' in req ? req.purpose : ('comments' in req ? req.comments : "");
                    if (text && text.includes("|| REJECTION:")) {
                      return text.split("|| REJECTION:")[1]?.trim();
                    }
                    return "No specific reason provided. Please contact support.";
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <h3 className="font-bold text-slate-800 text-sm">Pending Rentals</h3>
          </div>
          <div className="p-4">
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No pending rental requests.</p>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map(req => (
                  <div key={req.id} className="bg-slate-50 p-2.5 rounded border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{req.laptop_name} (Qty: {req.quantity || 1})</div>
                      <div className="text-[10px] text-slate-500">
                        {safeFormat(req.pickup_date, "MMM d, yyyy")} 
                        <span className="text-blue-600 font-semibold ml-1">• {req.duration} Days</span></div>
                    </div>
                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-orange-50/30">
            <h3 className="font-bold text-slate-800 text-sm">Pending Purchases</h3>
          </div>
          <div className="p-4">
            {pendingPurchases.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No pending purchase requests.</p>
            ) : (
              <div className="space-y-2">
                {pendingPurchases.map(req => (
                  <div key={req.id} className="bg-orange-50/50 p-2.5 rounded border border-orange-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{req.laptop_name} (Qty: {req.quantity})</div>
                      <div className="text-[10px] text-orange-600 font-bold">
                        Total: ₹{req.total_cost.toFixed(2)}
                      </div>
                    </div>
                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden md:col-span-2 lg:col-span-1">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-blue-50/30">
            <h3 className="font-bold text-slate-800 text-sm">Active Rentals</h3>
          </div>
          <div className="p-4">
            {activeRentals.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No active rentals.</p>
            ) : (
              <div className="space-y-2">
                {activeRentals.map(req => (
                  <div key={req.id} className={`p-2.5 rounded border flex items-center justify-between ${req.status === 'overdue' ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{req.laptop_name} (Qty: {req.quantity || 1})</div>
                      <div className={`text-[10px] ${req.status === 'overdue' ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                        Return by: {safeFormat(req.return_date, "MMM d, yyyy")}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${req.status === 'overdue' ? 'bg-rose-600 text-white' : 'bg-green-100 text-green-700'}`}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
