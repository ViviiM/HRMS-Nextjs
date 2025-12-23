"use client";

import { useState, useRef } from "react"; // Ensure useRef is imported
import { Camera, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "antd"; 

import PersonalInfoTab from "./personal-info";
import EmploymentInfoTab from "./employment-info";
import BankDetailsTab from "./bank-details";
import DocumentsTab from "./documents";
import { AnimatePresence, motion } from "framer-motion";

export default function ProfilePage({ initialData }: { initialData?: any }) {
  const [activeTab, setActiveTab] = useState("personal");
  const [photoUrl, setPhotoUrl] = useState(initialData?.employment?.photoUrl || "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: "personal", label: "Personal" },
    { id: "employment", label: "Employment" },
    { id: "bank", label: "Bank Details" },
    { id: "documents", label: "Documents" },
  ];

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validation
    if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
    }
    
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch("/api/profile/photo", {
            method: "POST",
            body: formData
        });
        const json = await res.json();
        
        if (res.ok) {
            setPhotoUrl(json.url);
            toast.success("Profile photo updated");
        } else {
            toast.error(json.error || "Failed to upload photo");
        }
    } catch (error) {
        toast.error("An error occurred");
    } finally {
        setUploadingPhoto(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 flex-shrink-0 space-y-6">
            
            {/* Profile Photo Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center relative group">
                <div className="relative">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg relative bg-gray-100 flex items-center justify-center">
                        {photoUrl ? (
                            <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-16 h-16 text-gray-400" />
                        )}
                        {uploadingPhoto && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-md transition-transform hover:scale-110 active:scale-95"
                        disabled={uploadingPhoto}
                    >
                        <Camera className="w-4 h-4" />
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={handlePhotoUpload} 
                    />
                </div>
                <h2 className="mt-4 font-bold text-lg text-gray-800">{initialData?.personal?.firstName} {initialData?.personal?.lastName}</h2>
                <p className="text-sm text-gray-500">{initialData?.employment?.role || 'Employee'}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full text-left px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition ${activeTab === tab.id ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-l-blue-600' : 'text-gray-600'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>

        <div className="flex-1">
            <AnimatePresence mode="wait">
             <motion.div
               key={activeTab}
               initial={{ opacity: 0, x: 10 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -10 }}
               transition={{ duration: 0.2 }}
               className="bg-white rounded-xl shadow-sm border border-gray-100 p-8"
             >
                {activeTab === "personal" && <PersonalInfoTab data={initialData?.personal} />}
                {activeTab === "employment" && <EmploymentInfoTab data={initialData?.employment} />}
                {activeTab === "bank" && <BankDetailsTab />}
                {activeTab === "documents" && <DocumentsTab />}
             </motion.div>
            </AnimatePresence>
        </div>
    </div>
  );
}
