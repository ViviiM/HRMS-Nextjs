"use client";

import { useState } from "react";

import { User, Mail, Phone, MessageSquare, Send, CheckCircle } from "lucide-react";

export default function NewContactPage() {
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", phone: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
      } else {
        setError(json.error || "Failed to submit");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-white/50 animate-in fade-in zoom-in duration-300">
           <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
               <CheckCircle className="w-8 h-8" />
           </div>
           <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h2>
           <p className="text-gray-600 mb-6">Your contact details have been successfully saved to our system.</p>
           <button onClick={() => { setSuccess(false); setFormData({ firstName: "", lastName: "", email: "", phone: "", message: "" }); }} className="text-blue-600 font-medium hover:underline">
               Submit Another
           </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100 p-4 font-sans">
      <div className="bg-white/70 backdrop-blur-lg shadow-2xl rounded-3xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row border border-white/50">
        
        {/* Left Side - Branding */}
        <div className="md:w-5/12 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white flex flex-col justify-between relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                 {/* Decorative circles */}
                 <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white"></div>
                 <div className="absolute bottom-10 right-10 w-20 h-20 rounded-full bg-white"></div>
             </div>

             <div className="z-10">
                 <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl inline-block mb-6">
                     {/* MV Logo */}
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                     <img src="/mv_logo.png" alt="MV Logo" className="h-12 w-auto object-contain brightness-0 invert" />
                 </div>
                 <h1 className="text-3xl font-bold mb-4">Get in Touch</h1>
                 <p className="text-blue-100 text-lg leading-relaxed">
                     Connect with us directly. Your details will be synchronized instantly with our Salesforce CRM.
                 </p>
             </div>

             <div className="z-10 mt-12">
                 <div className="flex items-center gap-3 opacity-80 mb-2">
                     <span className="text-xs uppercase tracking-wider">Powered by</span>
                 </div>
                 <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                     {/* Salesforce Logo */}
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                     <img src="https://c1.sfdcstatic.com/content/dam/sfdc-docs/www/logos/logo-salesforce.svg" alt="Salesforce" className="h-8 w-auto" />
                     {/* Fallback text if image fails to load or blocked */}
                     {/* <span className="font-semibold tracking-tight text-xl">Salesforce</span> */}
                 </div>
             </div>
        </div>

        {/* Right Side - Form */}
        <div className="md:w-7/12 p-8 md:p-12">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Contact Us</h2>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-gray-500 ml-1">First Name</label>
                        <div className="relative">
                            <User className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                            <input 
                                required
                                className="w-full bg-white border border-gray-200 rounded-xl px-10 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700 placeholder-gray-400"
                                placeholder="John"
                                value={formData.firstName}
                                onChange={e => setFormData({...formData, firstName: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-gray-500 ml-1">Last Name</label>
                         <div className="relative">
                            <User className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                            <input 
                                required
                                className="w-full bg-white border border-gray-200 rounded-xl px-10 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700 placeholder-gray-400"
                                placeholder="Doe"
                                value={formData.lastName}
                                onChange={e => setFormData({...formData, lastName: e.target.value})}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-gray-500 ml-1">Email Address</label>
                    <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                        <input 
                            required
                            type="email"
                            className="w-full bg-white border border-gray-200 rounded-xl px-10 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700 placeholder-gray-400"
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                </div>

                 <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-gray-500 ml-1">Phone Number</label>
                    <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                        <input 
                            type="tel"
                            className="w-full bg-white border border-gray-200 rounded-xl px-10 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700 placeholder-gray-400"
                            placeholder="+1 (555) 000-0000"
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-gray-500 ml-1">Message</label>
                    <div className="relative">
                        <MessageSquare className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                        <textarea 
                            className="w-full bg-white border border-gray-200 rounded-xl px-10 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700 placeholder-gray-400 min-h-[120px]"
                            placeholder="How can we help you?"
                            value={formData.message}
                            onChange={e => setFormData({...formData, message: e.target.value})}
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <span>Send Message</span>
                            <Send className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>
        </div>
      </div>
    </div>
  );
}
