"use client";

import { useState } from "react";
import LeaveApplyForm from "./components/leave-apply-form";
import LeaveHistory from "./components/leave-history";
import LeaveBalanceCards from "./components/leave-balance-cards";

export default function LeavesPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Leave Management</h1>
        <p className="text-slate-500 mt-1">Apply for leaves and track your balances</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Apply Form */}
        <div className="lg:col-span-1">
           <LeaveApplyForm onSuccess={handleSuccess} />
        </div>

        {/* Right: History & Balances */}
        <div className="lg:col-span-2 space-y-6">
           <LeaveBalanceCards refreshTrigger={refreshKey} />

           <LeaveHistory refreshTrigger={refreshKey} />
        </div>
      </div>
    </div>
  );
}
