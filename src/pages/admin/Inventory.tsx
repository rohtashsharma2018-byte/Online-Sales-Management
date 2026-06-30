import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Laptop } from "../../types";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Folder, Download, Image, X } from "lucide-react";

interface LaptopForm {
  name: string;
  description: string;
  category: string;
  catalogue_url: string;
  price_per_day: number;
  price?: number;
  sell_price?: number;
  stock: number;
}

export default function Inventory() {
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLaptop, setEditingLaptop] = useState<Laptop | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [pendingThumbnailIndex, setPendingThumbnailIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [nextProductCode, setNextProductCode] = useState("");
  const [fullViewImage, setFullViewImage] = useState<string | null>(null);
  const [currentGallery, setCurrentGallery] = useState<string[]>([]);
  
  const { register, handleSubmit, reset } = useForm<LaptopForm>({
    defaultValues: {
      name: "",
      description: "",
      category: "General",
      catalogue_url: "",
      price_per_day: 0,
      price: 0,
      sell_price: 0,
      stock: 0
    }
  });

  useEffect(() => {
    fetchLaptops();

    // Set up real-time listener
    const subscription = supabase
      .channel('laptops')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'laptops' }, () => {
        fetchLaptops();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!editingLaptop && isDialogOpen) {
      const year = new Date().getFullYear();
      const prefix = `MCN-${year}-`;
      
      // Generate a random 4-digit number (1000-9999)
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      setNextProductCode(`${prefix}${randomNum}`);
    }
  }, [isDialogOpen, editingLaptop]);

  const fetchLaptops = async () => {
    const { data, error } = await supabase
      .from("laptops")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error("Error fetching inventory: " + error.message);
    } else if (data) {
      setLaptops(data as Laptop[]);
    }
  };

  const uploadImages = async (files: File[]): Promise<string[]> => {
    if (!supabase.storage) {
      toast.error("Supabase Storage is not initialized.");
      return [];
    }

    const uploadedUrls: string[] = [];
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}${Date.now()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) {
          if (uploadError.message.includes('bucket not found') || uploadError.message.includes('does not exist')) {
            toast.error("Storage bucket 'product-images' not found.");
            return uploadedUrls;
          }
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      } catch (error: any) {
        console.error('Error uploading image:', error);
        toast.error('Failed to upload ' + file.name);
      }
    }
    return uploadedUrls;
  };

  const onSubmit = async (data: LaptopForm) => {
    setIsUploading(true);
    try {
      let allUrls = [...existingUrls];
      let finalThumbnail = thumbnailUrl;
      
      if (selectedFiles.length > 0) {
        const newUrls = await uploadImages(selectedFiles);
        
        // If a pending thumbnail was selected, use that newly uploaded URL
        if (pendingThumbnailIndex !== null && newUrls[pendingThumbnailIndex]) {
          finalThumbnail = newUrls[pendingThumbnailIndex];
        }
        
        allUrls = [...allUrls, ...newUrls];
      }

      // If still no thumbnail but we have images, use the first one
      if (!finalThumbnail && allUrls.length > 0) {
        finalThumbnail = allUrls[0];
      }

      const payload = {
        name: data.name,
        description: data.description,
        category: data.category || "General",
        catalogue_url: data.catalogue_url?.trim() || null,
        price_per_day: Number(data.price_per_day),
        price: data.price ? Number(data.price) : 0,
        sell_price: data.sell_price ? Number(data.sell_price) : 0,
        stock: Number(data.stock),
        image_url: finalThumbnail,
        image_urls: allUrls,
        product_code: editingLaptop ? editingLaptop.product_code : nextProductCode
      };

      if (editingLaptop) {
        const { error } = await supabase
          .from("laptops")
          .update(payload)
          .eq("id", editingLaptop.id);
        
        if (error) throw error;
        toast.success("Product updated successfully");
      } else {
        const { error } = await supabase
          .from("laptops")
          .insert(payload);
        
        if (error) throw error;
        toast.success("New product added to inventory");
      }
      setIsDialogOpen(false);
      setEditingLaptop(null);
      setSelectedFiles([]);
      setExistingUrls([]);
      setThumbnailUrl("");
      setPendingThumbnailIndex(null);
      reset();
    } catch(e: any) {
      toast.error("Database Error: " + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (laptop: Laptop) => {
    setEditingLaptop(laptop);
    setSelectedFiles([]);
    setPendingThumbnailIndex(null);
    setExistingUrls(laptop.image_urls || (laptop.image_url ? [laptop.image_url] : []));
    setThumbnailUrl(laptop.image_url || "");
    reset({ 
      name: laptop.name, 
      description: laptop.description || "",
      category: laptop.category || "",
      catalogue_url: laptop.catalogue_url || "",
      price_per_day: laptop.price_per_day, 
      price: laptop.price || 0, 
      sell_price: laptop.sell_price || 0,
      stock: laptop.stock 
    });
    setIsDialogOpen(true);
  };

  const checkIfCanDelete = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("rental_requests")
        .select("id")
        .eq("laptop_id", id)
        .in("status", ["active", "approved", "overdue"]);

      if (error) throw error;

      if (data && data.length > 0) {
        toast.error("Deletion Blocked", {
          description: "This product cannot be deleted because it is currently in 'Active', 'Approved' or 'Overdue' rentals. Please complete or cancel the rentals before deleting this item.",
          duration: 5000
        });
        return;
      }

      setDeleteConfirmId(id);
    } catch (e: any) {
      toast.error("Error Checking Rental Status: " + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Get the laptop to find image URLs before deletion
      const laptopToDelete = laptops.find(l => l.id === id);
      const urlsToDelete = laptopToDelete?.image_urls || (laptopToDelete?.image_url ? [laptopToDelete.image_url] : []);
      
      // Delete images from storage if they exist
      if (urlsToDelete.length > 0) {
        const pathsToDelete = urlsToDelete
          .map(url => {
            const parts = url.split('/public/product-images/');
            return parts.length > 1 ? parts[1] : null;
          })
          .filter(path => path !== null) as string[];

        if (pathsToDelete.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('product-images')
            .remove(pathsToDelete);
            
          if (storageError) {
            console.error("Storage deletion error:", storageError);
          }
        }
      }

      const { error } = await supabase
        .from("laptops")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast.success("Product and associated images deleted");
      fetchLaptops();
    } catch(e: any) {
      toast.error("Error deleting: " + e.message);
    }
  };

  const exportToCSV = () => {
    if (laptops.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Product Code", "Product Model", "Description", "Category", "Catalogue URL", "Total Price", "Sell Price", "Price / Day", "Stock"];
    const csvContent = [
      headers.join(","),
      ...laptops.map(l => [
        `"${(l.product_code || '').replace(/"/g, '""')}"`,
        `"${l.name.replace(/"/g, '""')}"`,
        `"${(l.description || '').replace(/"/g, '""')}"`,
        `"${(l.category || '').replace(/"/g, '""')}"`,
        `"${(l.catalogue_url || '').replace(/"/g, '""')}"`,
        l.price || 0,
        l.sell_price || 0,
        l.price_per_day,
        l.stock
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export started");
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
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Confirm Delete</h3>
            <p className="text-sm text-slate-600 mb-6">Are you sure you want to delete this product? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded">Cancel</button>
              <button 
                onClick={() => { 
                  handleDelete(deleteConfirmId); 
                  setDeleteConfirmId(null); 
                }} 
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">Inventory Management</h3>
          <div className="flex gap-2">
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-xs font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button onClick={() => { setIsDialogOpen(true); setEditingLaptop(null); setSelectedFiles([]); setExistingUrls([]); setThumbnailUrl(""); reset({name:'', description: '', category: 'General', catalogue_url: '', price_per_day:0, price:0, sell_price: 0, stock:0}); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors">
              + Add Product
            </button>
          </div>
        </div>
        
        {isDialogOpen && (
          <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-4">
            <h4 className="font-bold text-sm">{editingLaptop ? "Edit Product" : "Add New Product"}</h4>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Product Code</label>
                  <input 
                    value={editingLaptop ? editingLaptop.product_code : nextProductCode} 
                    disabled 
                    className="w-full rounded border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm font-bold text-blue-600" 
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Name</label>
                  <input {...register("name", { required: true })} className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <input {...register("category", { required: true })} placeholder="e.g. Workstation, Gaming" className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Product Catalogue (Google Drive Link)</label>
                  <input {...register("catalogue_url")} placeholder="https://drive.google.com/..." className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />
                </div>
                <div className="lg:col-span-3">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                  <textarea {...register("description", { required: true })} rows={2} className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Total Product Price (₹)</label>
                  <input type="number" step="0.01" {...register("price", { required: true })} className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Sell Price (₹)</label>
                  <input type="number" step="0.01" {...register("sell_price", { required: true })} className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Price/Day (₹)</label>
                  <input type="number" step="0.01" {...register("price_per_day")} className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Stock</label>
                  <input type="number" {...register("stock", { required: true })} className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Product Images (Up to 5)</label>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {/* Existing Images */}
                      {existingUrls.map((url, idx) => (
                        <div key={`existing-${idx}`} className={`relative w-16 h-16 rounded border overflow-hidden group ${thumbnailUrl === url ? 'ring-2 ring-blue-500' : 'border-slate-200'}`}>
                          <img src={url} alt="Product" className="w-full h-full object-cover cursor-pointer" onClick={() => { setThumbnailUrl(url); setPendingThumbnailIndex(null); }} />
                          <button 
                            type="button" 
                            onClick={() => {
                              const newUrls = existingUrls.filter(u => u !== url);
                              setExistingUrls(newUrls);
                              if (thumbnailUrl === url) setThumbnailUrl(newUrls[0] || "");
                            }}
                            className="absolute top-0.5 right-0.5 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {thumbnailUrl === url && <div className="absolute bottom-0 left-0 right-0 bg-blue-500 text-[8px] text-white text-center py-0.5 font-bold uppercase">Main</div>}
                        </div>
                      ))}
                                       {/* Selected Files (Pre-upload) */}
                      {selectedFiles.map((file, idx) => (
                        <div key={`selected-${idx}`} className={`relative w-16 h-16 rounded border overflow-hidden group bg-slate-50 flex items-center justify-center ${pendingThumbnailIndex === idx ? 'ring-2 ring-blue-500' : 'border-slate-200'}`}>
                          <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover cursor-pointer" onClick={() => { setPendingThumbnailIndex(idx); setThumbnailUrl(""); }} />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              type="button" 
                              onClick={() => {
                                setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
                                if (pendingThumbnailIndex === idx) setPendingThumbnailIndex(null);
                              }} 
                              className="text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {pendingThumbnailIndex === idx && <div className="absolute bottom-0 left-0 right-0 bg-blue-500 text-[8px] text-white text-center py-0.5 font-bold uppercase">Main</div>}
                        </div>
                      ))}

                      {/* Add Button */}
                      {(existingUrls.length + selectedFiles.length) < 5 && (
                        <div className="w-16 h-16 rounded border-2 border-dashed border-slate-200 flex items-center justify-center hover:border-blue-300 hover:bg-slate-50 transition-colors">
                          <input 
                            type="file" 
                            accept="image/*" 
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              const remaining = 5 - (existingUrls.length + selectedFiles.length);
                              setSelectedFiles(prev => [...prev, ...files.slice(0, remaining)]);
                            }}
                            className="hidden" 
                            id="image-upload-multi" 
                          />
                          <label htmlFor="image-upload-multi" className="cursor-pointer w-full h-full flex items-center justify-center">
                            <Image className="w-5 h-5 text-slate-400" />
                          </label>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">Click an image to set it as the primary thumbnail.</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsDialogOpen(false)} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-200 hover:bg-slate-300 rounded">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isUploading}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {editingLaptop ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Img</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Product Code</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-center">Catalogue</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Product Model</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Total Price</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Sell Price</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Price / Day</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Stock</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {laptops.map(l => (
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
                  <td className="px-4 py-3">
                    <span className="font-mono text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                      {l.product_code || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {l.catalogue_url ? (
                      <div className="flex flex-col gap-1">
                        <a 
                          href={l.catalogue_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-orange-500 hover:text-orange-700 transition-colors flex items-center gap-1 font-bold text-[10px]"
                        >
                          <Folder className="w-3 h-3" />
                          LINK
                        </a>
                      </div>
                    ) : (
                      <span className="text-slate-300 flex items-center gap-1 opacity-40 text-[10px] font-medium"><Folder className="w-3 h-3" /> NONE</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-xs">{l.name}</span>
                      <span className="text-[10px] text-slate-500 line-clamp-1">{l.description}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">{l.category || 'General'}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{l.price ? `₹${l.price}` : '-'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{l.sell_price ? `₹${l.sell_price}` : '-'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">₹{l.price_per_day}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                      {l.stock} {l.stock > 0 ? 'Available' : 'Out'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button onClick={() => handleEdit(l)} className="px-2 py-1 bg-white text-slate-600 border border-slate-200 rounded text-xs font-bold hover:bg-slate-50">Edit</button>
                    <button onClick={() => checkIfCanDelete(l.id)} className="px-2 py-1 bg-white text-rose-600 border border-slate-200 rounded text-xs font-bold hover:bg-rose-50">Del</button>
                  </td>
                </tr>
              ))}
              {laptops.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-xs text-slate-500">No inventory found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
