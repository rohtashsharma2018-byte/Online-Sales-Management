import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Laptop } from "../../types";
import { toast } from "sonner";

interface FormValues {
  laptopId: string;
  quantity: number;
  deliveryDate: string;
  email: string;
  phone: string;
  address: string;
  comments: string;
}

export default function PurchaseRequestForm() {
  const { user } = useAuth();
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [selectedLaptop, setSelectedLaptop] = useState<Laptop | null>(null);
  const { register, handleSubmit, watch, reset, setValue } = useForm<FormValues>();

  const watchLaptopId = watch("laptopId");
  const watchQuantity = watch("quantity", 1);

  useEffect(() => {
    fetchLaptops();
  }, []);

  useEffect(() => {
    if (user?.id) {
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            const profileEmail = data.email || (data as any).user_email;
            if (profileEmail) {
              setValue("email", profileEmail);
            } else if (user.email && !user.email.endsWith("@modarnet.internal")) {
              setValue("email", user.email);
            }
            if (data.phone) setValue("phone", data.phone);
            if (data.address) setValue("address", data.address);
          } else {
            if (user.email && !user.email.endsWith("@modarnet.internal")) {
              setValue("email", user.email);
            }
          }
        });
    }
  }, [user, setValue]);

  useEffect(() => {
    if (laptops.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const preselectedId = params.get("laptopId");
      if (preselectedId && laptops.some(l => l.id === preselectedId)) {
        setValue("laptopId", preselectedId);
      }
    }
  }, [laptops, setValue]);

  const fetchLaptops = async () => {
    const { data, error } = await supabase
      .from("laptops")
      .select("*")
      .gt("stock", 0);
    
    if (error) {
      toast.error("Error fetching laptops: " + error.message);
    } else {
      setLaptops(data as Laptop[]);
    }
  };

  useEffect(() => {
    if (watchLaptopId) {
      setSelectedLaptop(laptops.find(l => l.id === watchLaptopId) || null);
    }
  }, [watchLaptopId, laptops]);

  const onSubmit = async (data: FormValues) => {
    if (!user || !selectedLaptop) return;

    try {
      const dDate = new Date(data.deliveryDate);
      
      if (isNaN(dDate.getTime())) {
        toast.error("Invalid delivery date selected.");
        return;
      }

      const quantity = Number(data.quantity) || 1;
      const totalCost = Number(((selectedLaptop.sell_price || 0) * quantity).toFixed(2));

      // Update user profile with phone/address
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          phone: data.phone,
          address: data.address
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Insert purchase request
      const { error: requestError } = await supabase
        .from("purchase_requests")
        .insert({
          user_id: user.id,
          laptop_id: selectedLaptop.id,
          laptop_name: selectedLaptop.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          quantity,
          sell_price: selectedLaptop.sell_price || 0,
          total_cost: totalCost,
          delivery_date: dDate.toISOString(),
          comments: data.comments,
          status: "pending"
        });

      if (requestError) throw requestError;

      toast.success("Purchase request submitted successfully");
      reset();
    } catch (e: any) {
      toast.error("Error: " + e.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-sm tracking-tight text-center w-full uppercase py-1">Submit Purchase Request</h3>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">SELECT PRODUCT</label>
                <select 
                  {...register("laptopId", { required: true })}
                  className="w-full rounded border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">-- Select a product --</option>
                  {laptops.map(l => (
                    <option key={l.id} value={l.id}>{l.name} (Sell Price: ₹{l.sell_price || 'N/A'} - {l.stock} in stock)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Quantity</label>
                <input 
                  type="number" 
                  min={1} 
                  max={selectedLaptop?.stock || 1}
                  {...register("quantity", { required: true, min: 1, valueAsNumber: true })} 
                  className="w-full rounded border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500 bg-white" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expected Delivery Date</label>
                <input type="date" {...register("deliveryDate", { required: true })} className="w-full rounded border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500 bg-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                <input 
                  {...register("email", { required: true })}
                  type="email"
                  placeholder="your.email@example.com"
                  className="w-full rounded border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500 bg-white" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                 <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Number</label>
                 <input 
                   {...register("phone", { 
                     required: true, 
                     pattern: /^\d{10}$/,
                     maxLength: 10,
                     minLength: 10
                   })} 
                   onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '').slice(0, 10); }}
                   placeholder="1234567890" 
                   className="w-full rounded border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500 bg-white" 
                 />
              </div>
              <div className="md:col-span-2">
                 <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Delivery Address</label>
                 <input {...register("address", { required: true })} placeholder="123 Main St, City" className="w-full rounded border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500 bg-white" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Comments / Special Requirements</label>
              <textarea {...register("comments", { required: true })} rows={3} placeholder="Any specific requirements for your purchase" className="w-full rounded border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500 resize-none bg-white" />
            </div>

            {selectedLaptop && (
              <div className="p-3 bg-orange-50 rounded border border-orange-100 flex justify-between items-center text-sm">
                <div>
                  <div className="text-[10px] uppercase font-bold text-orange-600 tracking-wider">Purchase Summary</div>
                  <div className="text-slate-500 text-xs">{selectedLaptop.name} × {watchQuantity} units</div>
                </div>
                <div className="text-right">
                    <div className="text-sm font-medium text-slate-500 line-through decoration-slate-300">₹{((selectedLaptop.sell_price || 0) * watchQuantity * 1.1).toFixed(2)}</div>
                    <div className="text-xl font-black text-slate-900">
                        ₹{((selectedLaptop.sell_price || 0) * watchQuantity).toFixed(2)}
                    </div>
                </div>
              </div>
            )}

            <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white p-2.5 rounded text-sm font-bold tracking-wide transition-colors mt-2 uppercase">
              Submit Purchase Request
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
