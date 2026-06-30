import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PurchaseRequest } from "../../types";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ManagePurchaseRequests() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchRequests();

    const subscription = supabase
      .channel('purchase_requests_all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchRequests = async () => {
    // Try joined query first
    const { data, error } = await supabase
      .from("purchase_requests")
      .select("*, profiles(*)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    
    if (error) {
      if (error.message.includes("relationship")) {
        // Fallback: fetch without profiles and then fetch profiles manually
        const { data: reqData, error: reqError } = await supabase
          .from("purchase_requests")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false });
          
        if (reqError) {
           toast.error("Error fetching requests: " + reqError.message);
           return;
        }

        // Fetch profiles for these users to emulate the join
        const userIds = Array.from(new Set((reqData || []).map(r => r.user_id)));
        const { data: profData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", userIds);

        const enriched = (reqData || []).map(r => ({
          ...r,
          profiles: profData?.find(p => p.id === r.user_id)
        }));
        
        setRequests(enriched as PurchaseRequest[]);
      } else {
        toast.error("Error fetching requests: " + error.message);
      }
    } else {
      setRequests(data as PurchaseRequest[]);
    }
  };

  const handleApprove = async (req: PurchaseRequest) => {
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

      const { error: updateRequestError } = await supabase
        .from("purchase_requests")
        .update({ status: "approved" })
        .eq("id", req.id);

      if (updateRequestError) throw updateRequestError;

      const { error: updateLaptopError } = await supabase
        .from("laptops")
        .update({ stock: laptop.stock - req.quantity })
        .eq("id", req.laptop_id);

      if (updateLaptopError) throw updateLaptopError;

      toast.success("Purchase request approved");
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
        .from("purchase_requests")
        .update({ 
          status: "rejected",
          comments: (request.comments || "") + " || REJECTION: " + rejectionReason.trim()
        })
        .eq("id", rejectingId);

      if (error) throw error;
      toast.success("Purchase request rejected with comment");
      setRejectingId(null);
      setRejectionReason("");
      fetchRequests();
    } catch(e: any) {
      toast.error("Error: " + e.message);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-rose-100 bg-rose-50/50 flex justify-between items-center">
              <h4 className="font-black text-rose-900 text-[10px] uppercase tracking-widest">Reject Purchase</h4>
              <button onClick={() => setRejectingId(null)} className="text-rose-400 hover:text-rose-700">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Reason for Denial</label>
                <textarea 
                  autoFocus
                  className="w-full h-24 rounded-lg border border-slate-200 p-3 text-xs focus:ring-2 focus:ring-black outline-none transition-all resize-none"
                  placeholder="Explain why this request is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setRejectingId(null)}
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

      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-orange-50/50">
        <h3 className="font-bold text-slate-800 text-sm tracking-tight uppercase">New Purchase Requests</h3>
      </div>
      <div className="flex-1 overflow-x-auto text-[13px]">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 italic">
            <tr>
              <th className="px-4 py-3 font-semibold text-[10px] uppercase tracking-widest">User Details</th>
              <th className="px-4 py-3 font-semibold text-[10px] uppercase tracking-widest">Product Details</th>
              <th className="px-4 py-3 font-semibold text-[10px] uppercase tracking-widest">Summary</th>
              <th className="px-4 py-3 font-semibold text-[10px] uppercase tracking-widest">Delivery</th>
              <th className="px-4 py-3 font-semibold text-[10px] uppercase tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map(req => (
              <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-bold text-slate-900">{req.profiles?.name || 'Customer'}</div>
                  <div className="text-[11px] text-blue-600 font-medium">{req.email}</div>
                  <div className="text-[11px] text-slate-500 mt-1">{req.phone}</div>
                  <div className="text-[11px] text-slate-400 italic truncate w-32" title={req.address}>{req.address}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-bold text-slate-800 uppercase text-[12px]">{req.laptop_name}</div>
                  <div className="text-slate-500 text-[11px]">Quantity: <span className="text-blue-600 font-bold">{req.quantity}</span></div>
                  <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{req.comments || 'No comments'}</div>
                </td>
                <td className="px-4 py-3">
                   <div className="space-y-0.5">
                      <div className="text-[10px] text-slate-400">Unit: ₹{req.sell_price.toFixed(2)}</div>
                      <div className="text-xs font-black text-slate-900">Total: ₹{req.total_cost.toFixed(2)}</div>
                   </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-[11px] font-bold text-slate-600 underline decoration-slate-200 underline-offset-4">{format(new Date(req.delivery_date), "MMM d, yyyy")}</div>
                  <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">Requested On {format(new Date(req.created_at), "HH:mm | MMM d")}</div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button 
                      onClick={() => handleApprove(req)} 
                      className="px-2 py-1 bg-black text-white rounded text-[10px] font-black uppercase hover:bg-slate-800 transition-all shadow-sm"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => setRejectingId(req.id)} 
                      className="px-2 py-1 bg-white text-slate-400 border border-slate-200 rounded text-[10px] font-bold uppercase hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 opacity-30">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500">No Pending Purchases</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
