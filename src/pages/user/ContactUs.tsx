import React from "react";
import { Mail, PhoneCall, MapPin, Building2 } from "lucide-react";

const ContactUs: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contact Us</h1>
        <p className="text-slate-500 text-sm">Get in touch with us for any queries or support regarding your rental.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">Registered Address</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                TechRent Computer Networks Pvt Ltd.<br />
                Plot No. E-60-61, Mansaram Park,<br />
                Uttam Nagar, New Delhi - 110059
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 pt-4 border-t border-slate-100">
            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">Email ID</h3>
              <p className="text-slate-600 text-sm italic">client@techrent.com</p>
            </div>
          </div>

          <div className="flex items-start gap-4 pt-4 border-t border-slate-100">
            <div className="w-10 h-25 bg-green-50 text-green-600 rounded-lg flex items-center justify-center shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">Phone Number</h3>
              <p className="text-slate-600 text-sm font-mono">96754 96755</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-xl flex flex-col justify-between overflow-hidden relative">
          <div className="relative z-10 space-y-4">
            <span className="bg-blue-600 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded">Quick Support</span>
            <h2 className="text-2xl font-bold font-sans">Need Help?</h2>
            <p className="text-slate-400 text-sm leading-relaxed">Our support team is available during business hours to assist you with laptop rentals, technical issues, or billing inquiries.</p>
          </div>
          
          <div className="relative z-10 mt-8 pt-8 border-t border-slate-800">
             <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-slate-400">Serving all of Delhi NCR</span>
             </div>
          </div>

          {/* Decorative element */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl"></div>
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-orange-600/5 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
