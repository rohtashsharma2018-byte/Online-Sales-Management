import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { RentalRequest } from "../../types";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ManageRequests() {
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchRequests();

    const subscription = supabase
      .channel('rental_requests_pending')
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
      .eq("status", "pending")
      .order("pickup_date", { ascending: true });
    
    if (error) {
      toast.error("Error fetching requests: " + error.message);
    } else {
      setRequests(data as RentalRequest[]);
    }
  };

  const handleApprove = async (req: RentalRequest) => {
    try {
      // Get current laptop stock
      const { data: laptop, error: fetchError } = await supabase
        .from("laptops")
        .select("stock")
        .eq("id", req.laptop_id)
        .single();

      if (fetchError) throw fetchError;
      if (!laptop) throw new Error("Product not found");

      if (laptop.stock < req.quantity) {
        toast.error("Not enough stock!");
        return;
      }

      // Update both using Supabase RPC or just separate calls if RLS allows
      // For simplicity and standard usage, we'll do two calls. 
      // In a real app we might use a Postgres function (RPC) for transaction.
      
      const { error: updateRequestError } = await supabase
        .from("rental_requests")
        .update({ status: "approved" })
        .eq("id", req.id);

      if (updateRequestError) throw updateRequestError;

      const { error: updateLaptopError } = await supabase
        .from("laptops")
        .update({ stock: laptop.stock - req.quantity })
        .eq("id", req.laptop_id);

      if (updateLaptopError) throw updateLaptopError;

      toast.success("Request approved");
      fetchRequests(); // Refresh
    } catch(e: any) {
      toast.error("Error: " + e.message);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    const request = requests.find(r => r.id === rejectingId);
    if (!request) return;

    try {
      const { error } = await supabase
        .from("rental_requests")
        .update({ 
          status: "rejected",
          purpose: request.purpose + " || REJECTION: " + rejectionReason.trim()
        })
        .eq("id", rejectingId);

      if (error) throw error;
      toast.success("Request rejected with comment");
      setRejectingId(null);
      setRejectionReason("");
      fetchRequests();
    } catch(e: any) {
      toast.error("Error: " + e.message);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
      {/* Rejection Dialog */}
      {rejectingId && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-rose-100 bg-rose-50/50 flex justify-between items-center">
              <h4 className="font-black text-rose-900 text-[10px] uppercase tracking-widest">Reject Request</h4>
              <button onClick={() => { setRejectingId(null); setRejectionReason(""); }} className="text-rose-400 hover:text-rose-700">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Reason for Rejection</label>
                <textarea 
                  autoFocus
                  className="w-full h-24 rounded-lg border border-slate-200 p-3 text-xs focus:ring-2 focus:ring-black outline-none transition-all resize-none"
                  placeholder="Tell the user why their request was declined (e.g., Unavailability, Invalid details)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => { setRejectingId(null); setRejectionReason(""); }}
                  className="flex-1 bg-slate-100 text-slate-600 rounded-lg py-2.5 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReject}
                  className="flex-1 bg-black text-white rounded-lg py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 text-sm">Recent Rental Requests</h3>
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">User Details</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Purpose</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Product Model</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Duration</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map(req => (
              <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="text-xs font-bold text-slate-800">{req.profiles?.name || 'Unknown'}</div>
                  <div className="text-[11px] text-blue-600 truncate w-32" title={req.email || req.profiles?.email || (req.profiles as any)?.user_email || ''}>{req.email || req.profiles?.email || (req.profiles as any)?.user_email || 'No email'}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{req.profiles?.phone || 'No phone'}</div>
                  <div className="text-[11px] text-slate-500 truncate w-32" title={req.profiles?.address || ''}>{req.profiles?.address || 'No address'}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-[11px] text-slate-500 truncate w-40 italic">{req.purpose}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 text-xs font-mono">{req.laptop_name}</span>
                  <div className="mt-1 text-xs text-slate-500 font-bold">Qty: {req.quantity || 1}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div className="text-xs">{format(new Date(req.pickup_date), "MMM d")} - {format(new Date(req.return_date), "MMM d")}</div>
                  <div className="text-[10px] font-bold text-blue-600 uppercase">{req.duration} Days ({`₹${req.total_cost}`})</div>
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  <button onClick={() => handleApprove(req)} className="px-3 py-1 bg-black text-white border border-black rounded text-xs font-bold hover:bg-slate-800 uppercase tracking-wider">Approve</button>
                  <button onClick={() => setRejectingId(req.id)} className="px-3 py-1 bg-white text-slate-400 border border-slate-200 rounded text-xs font-bold hover:bg-rose-50 hover:text-rose-600 uppercase tracking-wider">Reject</button>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-xs text-slate-500">No pending requests.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
