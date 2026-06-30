import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { RentalRequest } from "../../types";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ActiveRentals() {
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [extendRequestId, setExtendRequestId] = useState<string | null>(null);
  const [extraDays, setExtraDays] = useState(1);

  useEffect(() => {
    fetchRequests();

    const subscription = supabase
      .channel('rental_requests_active')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rental_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("rental_requests")
      .select("*, profiles(*)")
      .in("status", ["active", "approved", "overdue"])
      .order("return_date", { ascending: true });
    
    if (error) {
      toast.error("Error fetching requests: " + error.message);
    } else {
      setRequests(data as RentalRequest[]);
    }
  };

  const handleReturn = async (req: RentalRequest) => {
    try {
      // 1. Mark request as completed
      const { error: updateError } = await supabase
        .from("rental_requests")
        .update({ status: "completed" })
        .eq("id", req.id);
      
      if (updateError) throw updateError;

      // 2. Increment laptop stock
      const { data: laptop, error: fetchError } = await supabase
        .from("laptops")
        .select("stock")
        .eq("id", req.laptop_id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (laptop) {
        const { error: stockError } = await supabase
          .from("laptops")
          .update({ stock: laptop.stock + (req.quantity || 1) })
          .eq("id", req.laptop_id);
        
        if (stockError) throw stockError;
      }

      toast.success("Product returned and inventory updated");
      fetchRequests();
    } catch(e: any) {
      toast.error("Error: " + e.message);
    }
  };

  const handleExtend = async () => {
    if (!extendRequestId) return;
    try {
      const req = requests.find(r => r.id === extendRequestId);
      if (!req) return;
      
      const { data: laptop, error: laptopError } = await supabase
        .from("laptops")
        .select("price_per_day")
        .eq("id", req.laptop_id)
        .single();
      
      if (laptopError) throw laptopError;
      const price_per_day = laptop?.price_per_day || 0;
      
      const extraCost = extraDays * price_per_day;
      const currentReturnDate = new Date(req.return_date);
      const newReturnDate = new Date(currentReturnDate.getTime() + (extraDays * 24 * 60 * 60 * 1000));
      
      const { error: updateError } = await supabase
        .from("rental_requests")
        .update({
          return_date: newReturnDate.toISOString(),
          duration: req.duration + extraDays,
          total_cost: req.total_cost + extraCost,
          status: newReturnDate.getTime() < Date.now() ? "overdue" : "active"
        })
        .eq("id", extendRequestId);

      if (updateError) throw updateError;

      toast.success("Rental extended");
      setExtendRequestId(null);
      setExtraDays(1);
      fetchRequests();
    } catch(e: any) {
      toast.error("Error: " + e.message);
    }
  };

  const handleMarkOverdue = async (reqId: string) => {
    try {
      const { error } = await supabase
        .from("rental_requests")
        .update({ status: "overdue" })
        .eq("id", reqId);
      
      if (error) throw error;
      toast.success("Marked as overdue");
      fetchRequests();
    } catch(e: any) {
      toast.error("Error: " + e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">Active & Overdue Rentals</h3>
        </div>
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">User Details</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Product Model</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Return / Cost</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map(req => {
                const returnDateObj = new Date(req.return_date);
                const isOverdue = returnDateObj.getTime() < Date.now();
                return (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-slate-800">{req.profiles?.name || 'Unknown'}</div>
                      <div className="text-[11px] text-blue-600 truncate w-32" title={req.email || req.profiles?.email || (req.profiles as any)?.user_email || ''}>{req.email || req.profiles?.email || (req.profiles as any)?.user_email || 'No email'}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{req.profiles?.phone || 'No phone'}</div>
                      <div className="text-[11px] text-slate-500 truncate w-32" title={req.profiles?.address || ''}>{req.profiles?.address || 'No address'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 text-xs font-mono">{req.laptop_name}</span>
                      <div className="mt-1 text-xs text-slate-500 font-bold">Qty: {req.quantity || 1}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="text-xs">{format(returnDateObj, "MMM d, yyyy")}</div>
                      <div className="text-[10px] font-bold text-blue-600 mt-1 uppercase">{req.duration} Days (₹{req.total_cost})</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${req.status === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'}`}>
                        {req.status}
                      </span>
                      {req.status !== "overdue" && isOverdue && (
                        <button className="text-[10px] font-bold bg-rose-600 text-white px-2 py-1 rounded shadow-sm ml-2 uppercase" onClick={() => handleMarkOverdue(req.id)}>Force Overdue</button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button onClick={() => setExtendRequestId(req.id)} className="px-3 py-1 bg-white text-slate-600 border border-slate-200 rounded text-xs font-bold hover:bg-slate-50 uppercase tracking-wider">Extend</button>
                      <button onClick={() => handleReturn(req)} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-bold hover:bg-blue-100 uppercase tracking-wider">Return</button>
                    </td>
                  </tr>
                );
              })}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-xs text-slate-500">No active rentals.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {extendRequestId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full border border-slate-200">
            <h4 className="font-bold text-slate-800 text-sm mb-4">Extend Rental</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Extra Days</label>
                <input type="number" min={1} value={extraDays} onChange={e => setExtraDays(Number(e.target.value))} className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setExtendRequestId(null)} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-200 hover:bg-slate-300 rounded">Cancel</button>
                <button onClick={handleExtend} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded">Confirm Extension</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
