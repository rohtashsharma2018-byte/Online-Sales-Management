import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Laptop } from "../../types";
import { toast } from "sonner";
import { Folder, Download, Image, X, LayoutGrid, List, Calendar, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function InventoryView() {
  const navigate = useNavigate();
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "gallery">("list");
  const [loading, setLoading] = useState(true);
  const [fullViewImage, setFullViewImage] = useState<string | null>(null);
  const [currentGallery, setCurrentGallery] = useState<string[]>([]);
  
  useEffect(() => {
    fetchLaptops();

    // Set up real-time listener for live inventory updates
    const subscription = supabase
      .channel('laptops_user_view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'laptops' }, () => {
        fetchLaptops();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchLaptops = async () => {
    try {
      const { data, error } = await supabase
        .from("laptops")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      if (data) {
        setLaptops(data as Laptop[]);
      }
    } catch (error: any) {
      toast.error("Error fetching inventory: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (laptops.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Exporting only user-visible columns (excluding Total Price and Internal IDs)
    const headers = ["Product Code", "Product Model", "Description", "Category", "Catalogue URL", "Sell Price", "Price / Day", "Stock Status"];
    const csvContent = [
      headers.join(","),
      ...laptops.map(l => [
        `"${(l.product_code || '').replace(/"/g, '""')}"`,
        `"${l.name.replace(/"/g, '""')}"`,
        `"${(l.description || '').replace(/"/g, '""')}"`,
        `"${(l.category || '').replace(/"/g, '""')}"`,
        `"${(l.catalogue_url || '').replace(/"/g, '""')}"`,
        l.sell_price || 0,
        l.price_per_day,
        l.stock > 0 ? "Available" : "Out of Stock"
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `live_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Inventory summary exported to CSV");
  };

  return (
    <div className="space-y-6">
      {fullViewImage && (
        <div className="fixed inset-0 bg-black/95 z-[60] flex flex-col items-center justify-center p-4 md:p-8" onClick={() => setFullViewImage(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-slate-300 transition-colors z-10">
            <X className="w-8 h-8" />
          </button>
          
          <div className="relative group max-w-5xl w-full h-full flex flex-col items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
            <img src={fullViewImage} alt="Full view" className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-sm" />
            
            {currentGallery.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 max-w-full">
                {currentGallery.map((url, idx) => (
                  <div 
                    key={idx} 
                    className={`w-16 h-16 rounded border-2 overflow-hidden flex-shrink-0 cursor-pointer transition-all ${fullViewImage === url ? 'border-white opacity-100 scale-110' : 'border-white/20 opacity-50 hover:opacity-80'}`}
                    onClick={() => setFullViewImage(url)}
                  >
                    <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm italic">Live Inventory View</h3>
            <p className="text-xs text-slate-400">Browse models available for instant hire or purchase.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto self-end sm:self-auto justify-end">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === "list" 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("gallery")}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === "gallery" 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Gallery View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {viewMode === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Img</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-center tracking-tight">Code</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-center">Catalogue</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Product Model</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Purchase Price</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Rental / Day</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-xs text-slate-400">Loading live inventory...</td>
                  </tr>
                ) : laptops.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2">
                      {l.image_url ? (
                        <div 
                          className="w-10 h-10 rounded border border-slate-200 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            setFullViewImage(l.image_url);
                            setCurrentGallery(l.image_urls || [l.image_url]);
                          }}
                        >
                          <img src={l.image_url} alt={l.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300">
                          <Image className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-[9px] font-black text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-100">
                        {l.product_code || '---'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {l.catalogue_url ? (
                        <a 
                          href={l.catalogue_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-orange-500 hover:text-orange-700 transition-colors inline-flex items-center gap-1 font-bold text-[10px]"
                        >
                          <Folder className="w-3.5 h-3.5" />
                          CATALOGUE
                        </a>
                      ) : (
                        <span className="text-slate-300 flex items-center gap-1 opacity-40 text-[10px] font-medium italic"><Folder className="w-3.5 h-3.5" /> N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-xs">{l.name}</span>
                        <span className="text-[10px] text-slate-500 line-clamp-1 italic">{l.description}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">{l.category || 'General'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-medium">
                      {l.sell_price ? `₹${l.sell_price.toLocaleString()}` : 'Contact Support'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-medium">
                      ₹{l.price_per_day.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${l.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                        {l.stock > 0 ? 'Instock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex gap-1.5">
                        <button
                          onClick={() => navigate(`/request?laptopId=${l.id}`)}
                          disabled={l.stock === 0}
                          className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:hover:bg-amber-500 text-white px-2.5 py-1.5 rounded text-xs font-bold transition-all active:scale-[0.98] cursor-pointer shadow-sm"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>Rent</span>
                        </button>
                        <button
                          onClick={() => navigate(`/purchase?laptopId=${l.id}`)}
                          disabled={l.stock === 0}
                          className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white px-2.5 py-1.5 rounded text-xs font-bold transition-all active:scale-[0.98] cursor-pointer shadow-sm"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          <span>Buy</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && laptops.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-xs text-slate-500 italic">No inventory available at the moment.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
            {loading ? (
              <div className="col-span-full text-center text-xs text-slate-400 py-12">Loading gallery...</div>
            ) : laptops.length === 0 ? (
              <div className="col-span-full text-center text-xs text-slate-400 italic py-12">No inventory available at the moment.</div>
            ) : (
              laptops.map(l => (
                <div key={l.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group">
                  {/* Image Container */}
                  <div className="relative aspect-video bg-slate-50 border-b border-slate-100 overflow-hidden shrink-0">
                    {l.image_url ? (
                      <img 
                        src={l.image_url} 
                        alt={l.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => {
                          setFullViewImage(l.image_url);
                          setCurrentGallery(l.image_urls || [l.image_url]);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                        <Image className="w-8 h-8" />
                      </div>
                    )}
                    <span className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                      {l.product_code || '---'}
                    </span>
                    <span className={`absolute top-2 right-2 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${l.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                      {l.stock > 0 ? `${l.stock} Instock` : 'Out of Stock'}
                    </span>
                  </div>

                  {/* Content Container */}
                  <div className="p-4 flex flex-col flex-1 justify-between gap-4">
                    <div>
                      <div className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase inline-block mb-1">
                        {l.category || 'General'}
                      </div>
                      
                      {/* Product Model */}
                      <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors line-clamp-1">{l.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 italic leading-relaxed min-h-[2rem]">
                        {l.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {/* Prices */}
                      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sell Price</span>
                          <span className="font-bold text-slate-800">
                            {l.sell_price ? `₹${l.sell_price.toLocaleString()}` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex flex-col border-l border-slate-100 pl-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rent Price</span>
                          <span className="font-bold text-emerald-600">
                            ₹{l.price_per_day.toLocaleString()}/day
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => navigate(`/request?laptopId=${l.id}`)}
                          disabled={l.stock === 0}
                          className="flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:hover:bg-amber-500 text-white py-1.5 rounded-lg text-xs font-bold transition-all active:scale-[0.98] cursor-pointer shadow-sm"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Rent</span>
                        </button>
                        <button
                          onClick={() => navigate(`/purchase?laptopId=${l.id}`)}
                          disabled={l.stock === 0}
                          className="flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white py-1.5 rounded-lg text-xs font-bold transition-all active:scale-[0.98] cursor-pointer shadow-sm"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Buy</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
        <p className="text-[10px] text-blue-700 leading-relaxed italic">
          <strong>Note:</strong> This is a live view of our current product inventory. Prices listed are subject to availability. 
          For bulk requirements or specific models not listed above, please contact our support team via the Contact Us page.
        </p>
      </div>
    </div>
  );
}
