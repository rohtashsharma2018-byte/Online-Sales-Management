import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";
import { toast } from "sonner";
import { Search, Download, Filter } from "lucide-react";

type UnifiedRequest = {
  id: string;
  type: "Rental" | "Purchase";
  userName: string;
  userEmail: string;
  laptopName: string;
  quantity: number;
  status: string;
  createdAt: string;
  actionReason?: string;
  cost: number;
};

export default function RequestsHistory() {
  const [history, setHistory] = useState<UnifiedRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");

  useEffect(() => {
    fetchHistory();

    const rentalSub = supabase
      .channel('history_rental')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rental_requests' }, () => fetchHistory())
      .subscribe();

    const purchaseSub = supabase
      .channel('history_purchase')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_requests' }, () => fetchHistory())
      .subscribe();

    return () => {
      rentalSub.unsubscribe();
      purchaseSub.unsubscribe();
    }
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);

      const [rentalRes, purchaseRes] = await Promise.all([
        supabase.from("rental_requests").select("*"),
        supabase.from("purchase_requests").select("*")
      ]);

      if (rentalRes.error) throw rentalRes.error;
      if (purchaseRes.error) throw purchaseRes.error;

      // Extract unique user IDs from both lists
      const userIds = new Set([
        ...(rentalRes.data || []).map(r => r.user_id),
        ...(purchaseRes.data || []).map(p => p.user_id)
      ]);

      // Fetch profiles manually
      let profDict: Record<string, any> = {};
      if (userIds.size > 0) {
        const { data: profData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", Array.from(userIds));
          
        if (profData) {
          profDict = profData.reduce((acc, curr) => {
            acc[curr.id] = curr;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      const rentals: UnifiedRequest[] = (rentalRes.data || []).map((r: any) => {
        let reason = "";
        if (r.purpose && r.purpose.includes("|| REJECTION:")) {
            reason = r.purpose.split("|| REJECTION:")[1]?.trim();
        }
        const p = profDict[r.user_id];
        return {
          id: r.id,
          type: "Rental",
          userName: p?.name || r.email || "Unknown User",
          userEmail: p?.email || p?.user_email || r.email || "Unknown Email",
          laptopName: r.laptop_name,
          quantity: r.quantity || 1,
          status: r.status,
          createdAt: r.created_at,
          actionReason: reason,
          cost: r.total_cost || 0
        };
      });

      const purchases: UnifiedRequest[] = (purchaseRes.data || []).map((req: any) => {
        let reason = "";
        if (req.comments && req.comments.includes("|| REJECTION:")) {
            reason = req.comments.split("|| REJECTION:")[1]?.trim();
        }
        const p = profDict[req.user_id];
        return {
          id: req.id,
          type: "Purchase",
          userName: p?.name || req.email || "Unknown User",
          userEmail: p?.email || p?.user_email || req.email || "Unknown Email",
          laptopName: req.laptop_name,
          quantity: req.quantity || 1,
          status: req.status,
          createdAt: req.created_at,
          actionReason: reason,
          cost: req.total_cost || (req.sell_price * req.quantity) || 0
        };
      });

      const combined = [...rentals, ...purchases]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setHistory(combined);
    } catch (err: any) {
      toast.error("Failed to load history: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-700 border-green-200";
      case "rejected": return "bg-rose-100 text-rose-700 border-rose-200";
      case "completed":
      case "delivered": return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "active":
      case "processing": return "bg-blue-100 text-blue-700 border-blue-200";
      case "cancelled": return "bg-slate-100 text-slate-500 border-slate-200";
      case "pending": return "bg-amber-100 text-amber-700 border-amber-200";
      case "overdue": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const safeFormat = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try { return format(new Date(dateStr), "MMM d, yyyy"); }
    catch { return "Invalid Date"; }
  };

  const filteredHistory = history.filter((req) => {
    // Type Filter
    if (typeFilter !== "All" && req.type !== typeFilter) return false;

    // Status Filter
    if (statusFilter !== "All") {
      const s1 = req.status.toLowerCase();
      const s2 = statusFilter.toLowerCase();
      if (s2 === 'completed' && (s1 === 'completed' || s1 === 'delivered')) {
         // allow
      } else if (s1 !== s2) {
        return false;
      }
    }

    // Search Filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        req.userName.toLowerCase().includes(searchLower) ||
        req.userEmail.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Date Filter
    if (dateFilter !== "All") {
      const reqDate = new Date(req.createdAt).getTime();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      if (dateFilter === "Today") {
        if (reqDate < today) return false;
      } else if (dateFilter === "Last 7 Days") {
        const last7 = today - 7 * 24 * 60 * 60 * 1000;
        if (reqDate < last7) return false;
      } else if (dateFilter === "Last 30 Days") {
        const last30 = today - 30 * 24 * 60 * 60 * 1000;
        if (reqDate < last30) return false;
      } else if (dateFilter === "This Month") {
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        if (reqDate < thisMonth) return false;
      }
    }

    return true;
  });

  const exportCSV = () => {
    if (filteredHistory.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Date", "Type", "User Name", "User Email", "Product Name", "Quantity", "Status", "Cost", "Action Reason"];
    const csvContent = [
      headers.join(","),
      ...filteredHistory.map(r => [
        `"${safeFormat(r.createdAt)}"`,
        `"${r.type}"`,
        `"${r.userName.replace(/"/g, '""')}"`,
        `"${r.userEmail.replace(/"/g, '""')}"`,
        `"${r.laptopName.replace(/"/g, '""')}"`,
        r.quantity,
        `"${r.status}"`,
        r.cost,
        `"${(r.actionReason || "").replace(/"/g, '""')}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `requests_history_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Requests History</h2>
          <p className="text-sm text-slate-500">Review all historical rental and purchase requests across the platform.</p>
        </div>
        <button 
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold shadow hover:bg-slate-800 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-1/4">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Search Users</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>
          
          <div className="w-full md:w-1/4">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date Filter</label>
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="All">All Time</option>
              <option value="Today">Today</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="This Month">This Month</option>
            </select>
          </div>
          
          <div className="w-full md:w-1/4">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Type Filter</label>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="All">All Types</option>
              <option value="Rental">Rental</option>
              <option value="Purchase">Purchase</option>
            </select>
          </div>
          
          <div className="w-full md:w-1/4">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status Filter</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="All">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="active">Active</option>
              <option value="completed">Completed / Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">All Requests</h3>
          <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
            {filteredHistory.length} results
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Date & Type</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">User Details</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Item Details</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Cost</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Status & Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-xs text-slate-500 font-bold uppercase tracking-widest">
                    Loading history...
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-xs text-slate-500 italic font-medium">
                    No history matches your filters.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((req) => (
                  <tr key={req.id + req.type} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-slate-800">{safeFormat(req.createdAt)}</div>
                      <div className={`mt-1 inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${req.type === 'Rental' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                        {req.type}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="text-xs font-bold text-slate-800">{req.userName}</div>
                      <div className="text-[10px] text-slate-500">{req.userEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="text-xs font-bold text-slate-800">{req.laptopName}</div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Qty: {req.quantity}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[11px] font-bold text-blue-600 uppercase">₹{req.cost.toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[250px] whitespace-normal">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getStatusColor(req.status)}`}>
                          {req.status}
                        </span>
                        {req.status === 'rejected' && req.actionReason && (
                          <div className="text-[10px] text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100 leading-tight italic line-clamp-2" title={req.actionReason}>
                            Reason: {req.actionReason}
                          </div>
                        )}
                      </div>
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
