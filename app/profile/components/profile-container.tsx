"use client";

import { useState } from "react";
// ... imports ...
import PersonalInfoTab from "./personal-info";
import EmploymentInfoTab from "./employment-info";
import BankDetailsTab from "./bank-details";
import DocumentsTab from "./documents";
import { AnimatePresence, motion } from "framer-motion";

export default function ProfilePage({ initialData }: { initialData?: any }) {
  const [activeTab, setActiveTab] = useState("personal");

  const tabs = [
    { id: "personal", label: "Personal" },
    { id: "employment", label: "Employment" },
    { id: "bank", label: "Bank Details" },
    { id: "documents", label: "Documents" },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 flex-shrink-0">
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
