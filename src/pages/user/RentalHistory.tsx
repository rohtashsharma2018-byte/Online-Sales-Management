import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { RentalRequest } from "../../types";
import { format } from "date-fns";

export default function RentalHistory() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RentalRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    
    fetchRequests();

    const subscription = supabase
      .channel('user_rental_history')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rental_requests',
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
      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 text-sm">Rental History</h3>
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Product Model</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Dates</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Duration</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map(req => (
              <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3">
                  <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 text-xs font-mono">{req.laptop_name}</span>
                  <div className="mt-1 text-[10px] text-slate-500 font-bold uppercase">Qty: {req.quantity || 1}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div className="text-xs">
                    {safeFormat(req.pickup_date, "MMM d, yy")} - 
                    {safeFormat(req.return_date, "MMM d, yy")}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div className="text-[10px] font-bold text-blue-600 uppercase">{req.duration} Days (₹{req.total_cost})</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 items-start">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      req.status === 'completed' ? 'bg-slate-100 text-slate-700' :
                      req.status === 'active' ? 'bg-green-100 text-green-700' :
                      req.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                      req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {req.status}
                    </span>
                    {req.status === 'rejected' && req.purpose.includes("|| REJECTION:") && (
                      <div className="text-[10px] text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100 max-w-[200px] leading-tight italic">
                        Reason: {req.purpose.split("|| REJECTION:")[1]?.trim()}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-500">You have no rental history.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
