import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { PurchaseRequest } from "../../types";
import { format } from "date-fns";

export default function PurchaseHistory() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    
    fetchRequests();

    const subscription = supabase
      .channel('user_purchase_history')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'purchase_requests',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("purchase_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching purchase requests:", error.message);
    } else {
      setRequests(data as PurchaseRequest[]);
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

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-orange-50/30">
        <h3 className="font-bold text-slate-800 text-sm">Purchase History</h3>
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Product Model</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Order Details</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Cost</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map(req => (
              <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3">
                  <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 text-xs font-mono font-bold">{req.laptop_name}</span>
                  <div className="mt-1 text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Order Date: {safeFormat(req.created_at, "MMM d, yyyy")}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div className="text-xs">
                    <span className="font-bold text-slate-800">Qty: {req.quantity}</span>
                    <div className="text-[10px] text-slate-400 italic">Delivery: {safeFormat(req.delivery_date, "MMM d")}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div className="text-[10px] font-bold text-blue-600 uppercase">₹{(req.total_cost || (req.sell_price * req.quantity)).toLocaleString()}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 items-start">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      req.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      req.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                      req.status === 'approved' ? 'bg-indigo-100 text-indigo-700' :
                      req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      req.status === 'cancelled' ? 'bg-slate-100 text-slate-500' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {req.status}
                    </span>
                    {req.status === 'rejected' && req.comments?.includes("|| REJECTION:") && (
                      <div className="text-[10px] text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100 max-w-[200px] leading-tight italic">
                        Reason: {req.comments.split("|| REJECTION:")[1]?.trim()}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-xs text-slate-500 italic font-medium">You have no purchase history records.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
