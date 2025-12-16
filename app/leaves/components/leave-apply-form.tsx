"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner"; 

export default function LeaveApplyForm({ onSuccess }: { onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();
  
  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...data,
            // Format is handled by input date value (yyyy-MM-dd)
            startDate: data.startDate,
            endDate: data.endDate
        })
      });
      
      const result = await res.json();
      
      if (res.ok) {
        toast.success("Leave application submitted!");
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.error || "Failed to submit leave");
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border";

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
      <h3 className="text-lg font-bold mb-4">Apply for Leave</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        
        {/* Leave Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
          <select 
             {...register("leaveType", { required: true })}
             className={inputClass}
          >
             <option value="">Select Type</option>
             <option value="Casual">Casual Leave</option>
             <option value="Sick">Sick Leave</option>
             <option value="Earned">Earned Leave</option>
             <option value="Unpaid">Unpaid Leave</option>
          </select>
          {errors.leaveType && <span className="text-red-500 text-xs">Required</span>}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
           <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input 
                type="date" 
                {...register("startDate", { required: true })}
                className={inputClass}
                min={new Date().toISOString().split('T')[0]}
              />
               {errors.startDate && <span className="text-red-500 text-xs">Required</span>}
           </div>

           <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input 
                type="date" 
                {...register("endDate", { required: true })}
                className={inputClass}
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.endDate && <span className="text-red-500 text-xs">Required</span>}
           </div>
        </div>

        {/* Reason */}
        <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
           <textarea 
             {...register("reason", { required: true, minLength: 10 })}
             className={`${inputClass} min-h-[80px]`}
             placeholder="Please explain why..."
           />
           {errors.reason && <span className="text-red-500 text-xs">Reason is required (min 10 chars)</span>}
        </div>

        {/* Half Day Checkbox */}
        <div className="flex items-center">
            <input 
              type="checkbox" 
              id="halfDay" 
              {...register("halfDay")}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="halfDay" className="ml-2 text-sm text-gray-700">Half Day?</label>
        </div>

        <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center disabled:opacity-50"
            disabled={loading}
        >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
        </button>

      </form>
    </div>
  );
}
