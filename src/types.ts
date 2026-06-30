export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user" | "blocked";
  phone: string;
  address: string;
  created_at: string;
  rental_incentive?: number;
  sales_incentive?: number;
  incentive_comments?: string;
}

export interface Laptop {
  id: string;
  name: string;
  description?: string;
  category?: string;
  catalogue_url?: string;
  price_per_day: number;
  price?: number;
  sell_price?: number;
  stock: number;
  image_url: string;
  image_urls?: string[];
  product_code?: string;
  created_at: string;
  updated_at: string;
}

export type RentalStatus = "pending" | "approved" | "rejected" | "active" | "completed" | "overdue";
export type PurchaseStatus = "pending" | "approved" | "rejected" | "processing" | "delivered" | "cancelled";

export interface RentalRequest {
  id: string;
  user_id: string;
  laptop_id: string;
  laptop_name: string;
  email?: string;
  quantity: number;
  pickup_date: string; 
  return_date: string;
  duration: number; // days
  purpose: string;
  status: RentalStatus;
  total_cost: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

export interface PurchaseRequest {
  id: string;
  user_id: string;
  laptop_id: string;
  laptop_name: string;
  email: string;
  phone: string;
  address: string;
  quantity: number;
  sell_price: number;
  total_cost: number;
  delivery_date: string;
  comments: string;
  status: PurchaseStatus;
  created_at: string;
  updated_at: string;
  profiles?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}
