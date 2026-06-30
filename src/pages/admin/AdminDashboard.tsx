import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { RentalRequest, Laptop } from "../../types";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminDashboard() {
  const { user, role } = useAuth();
  const [profileName, setProfileName] = useState<string>("");
  const [stats, setStats] = useState({ 
    requests: 0, 
    active: 0, 
    overdue: 0, 
    totalAssets: 0, 
    totalRentals: 0,
    totalSalesIncentive: 0,
    totalRentalIncentive: 0
  });

  useEffect(() => {
    fetchStats();
    if (user) {
      fetchProfile();
    }

    const laptopSubscription = supabase
      .channel('laptops_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'laptops' }, () => {
        fetchStats();
      })
      .subscribe();

    const rentalRequestsSubscription = supabase
      .channel('rental_requests_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rental_requests' }, () => {
        fetchStats();
      })
      .subscribe();

    const purchaseRequestsSubscription = supabase
      .channel('purchase_requests_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_requests' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      laptopSubscription.unsubscribe();
      rentalRequestsSubscription.unsubscribe();
      purchaseRequestsSubscription.unsubscribe();
    };
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();
    
    if (data) {
      setProfileName(data.name || "");
    } else {
      setProfileName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Admin");
    }
  };

  const fetchStats = async () => {
    // Fetch Rental Requests Stats
    const { data: rentalRequests, error: rentalReqError } = await supabase
      .from("rental_requests")
      .select("status, total_cost");
    
    // Fetch Purchase Requests Stats
    const { data: purchaseRequests, error: purchaseReqError } = await supabase
      .from("purchase_requests")
      .select("status, total_cost");
    
    let pending = 0, activeCount = 0, overdueCount = 0, totalRentalsVal = 0;

    if (rentalReqError) {
      console.error(rentalReqError);
    } else {
      rentalRequests?.forEach(d => {
        if (d.status === "pending") pending++;
        if (d.status === "active" || d.status === "approved" || d.status === "overdue") {
          totalRentalsVal += (d.total_cost || 0);
        }
        if (d.status === "active" || d.status === "approved") activeCount++;
        if (d.status === "overdue") overdueCount++;
      });
    }

    if (purchaseReqError) {
      console.error(purchaseReqError);
    } else {
      purchaseRequests?.forEach(d => {
        if (d.status === "pending") pending++;
      });
    }

    // Fetch incentives from profiles (using a default of 0 if any columns are missing on older blueprints)
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("rental_incentive, sales_incentive");

    let sumSalesIncentive = 0;
    let sumRentalIncentive = 0;

    if (profilesError) {
      console.warn("Profiles incentive fetch warning (columns might missing):", profilesError.message);
    } else {
      profiles?.forEach(p => {
        sumSalesIncentive += Number(p.sales_incentive || 0);
        sumRentalIncentive += Number(p.rental_incentive || 0);
      });
    }

    setStats(prev => ({ 
      ...prev, 
      requests: pending, 
      active: activeCount, 
      overdue: overdueCount, 
      totalRentals: totalRentalsVal,
      totalSalesIncentive: sumSalesIncentive,
      totalRentalIncentive: sumRentalIncentive
    }));

    // Fetch Laptop Stats
    const { data: laptops, error: laptopError } = await supabase
      .from("laptops")
      .select("price");
    
    if (laptopError) {
      console.error(laptopError);
    } else {
      let assets = 0;
      laptops?.forEach(d => {
        assets += (d.price || 0);
      });
      setStats(prev => ({ ...prev, totalAssets: assets }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner for Admin */}
      <div className="bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-950 flex items-center justify-between text-white">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-0.5">Welcome Back</div>
          <div className="text-xl font-black tracking-tight uppercase">{profileName || "System Administrator"}</div>
        </div>
        <div className="text-right">
           <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-0.5">Authenticated Role</div>
           <div className="inline-flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-full border border-white/20">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-[11px] font-bold uppercase tracking-widest">{role || 'Admin'}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Total Assets</div>
          <div className="text-2xl sm:text-3xl font-bold truncate" title={`₹${stats.totalAssets.toLocaleString()}`}>₹{stats.totalAssets.toLocaleString()}</div>
          <div className="text-emerald-500 text-[10px] mt-2 font-semibold">Inventory Valuation</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Total Rentals</div>
          <div className="text-2xl sm:text-3xl font-bold truncate" title={`₹${stats.totalRentals.toLocaleString()}`}>₹{stats.totalRentals.toLocaleString()}</div>
          <div className="text-blue-500 text-[10px] mt-2 font-semibold">Cost of Active/Overdue</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-1 md:col-span-2 lg:col-span-1">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Total Pending Requests</div>
          <div className="text-2xl sm:text-3xl font-bold truncate">{stats.requests}</div>
          <div className="text-blue-500 text-[10px] mt-2 font-semibold italic">Rental + Purchase Awaiting Approval</div>
        </div>

        {/* Incentive KPI Card: Sales Incentives */}
        <div className="bg-blue-50/40 p-5 rounded-xl border border-blue-200 shadow-sm">
          <div className="text-blue-700 text-xs font-black uppercase tracking-wider mb-1">Total Sales Incentive</div>
          <div className="text-2xl sm:text-3xl font-black text-blue-900 truncate" title={`₹${stats.totalSalesIncentive.toLocaleString()}`}>₹{stats.totalSalesIncentive.toLocaleString()}</div>
          <div className="text-blue-600 text-[10px] mt-2 font-bold uppercase tracking-widest">Team Bonus Pool</div>
        </div>

        {/* Incentive KPI Card: Rental Incentives */}
        <div className="bg-emerald-50/40 p-5 rounded-xl border border-emerald-200 shadow-sm">
          <div className="text-emerald-700 text-xs font-black uppercase tracking-wider mb-1">Total Rental Incentive</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-900 truncate" title={`₹${stats.totalRentalIncentive.toLocaleString()}`}>₹{stats.totalRentalIncentive.toLocaleString()}</div>
          <div className="text-emerald-600 text-[10px] mt-2 font-bold uppercase tracking-widest">Team Commission Pool</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Active Rentals</div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-800 truncate">{stats.active}</div>
          <div className="text-slate-400 text-[10px] mt-2 font-semibold">Currently Deploying</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-1 md:col-span-2 lg:col-span-1">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Overdue Items</div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-500 truncate">{stats.overdue}</div>
          <div className="text-rose-400 text-[10px] mt-2 font-semibold italic">{stats.overdue > 0 ? "Immediate Action Required" : "All good"}</div>
        </div>
      </div>
    </div>
  );
}
