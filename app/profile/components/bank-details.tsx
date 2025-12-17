"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export default function BankDetailsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, setValue } = useForm();
  
  // Fetch existing details
  useEffect(() => {
    const fetchBankData = async () => {
        try {
            const res = await fetch("/api/profile/bank");
            const json = await res.json();
            if (json.success && json.data) {
                setValue("bankName", json.data.Name);
                setValue("accountNumber", json.data.Bank_Account_Number__c);
                setValue("ifsc", json.data.IFSC__c);
                setValue("holderName", json.data.Bank_Branch_Name__c);
                setValue("pan", json.data.PAN_Number__c);
            }
        } catch(e) { console.error(e); } 
        finally { setLoading(false); }
    };
    fetchBankData();
  }, [setValue]);

  const onSubmit = async (data: any) => {
     setSaving(true);
     try {
         const res = await fetch("/api/profile/bank", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify(data)
         });
         if(res.ok) toast.success("Bank details updated successfully");
         else toast.error("Failed to update bank details");
     } catch(e) {
         toast.error("Error updating details");
     } finally {
         setSaving(false);
     }
  };

  if(loading) return <div className="p-10 text-center text-gray-400">Loading bank details...</div>;

  const inputClass = "w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border";

  return (
    <div>
       <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h3 className="text-xl font-bold text-gray-800">Bank Information</h3>
        <p className="text-sm text-gray-500">For salary processing</p>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl">
          <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                  <input {...register("holderName", { required: true })} className={inputClass} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                      <input {...register("bankName", { required: true })} className={inputClass} />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">IFSC / Sort Code</label>
                      <input {...register("ifsc", { required: true })} className={inputClass} />
                  </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input {...register("accountNumber", { required: true })} type="password" className={inputClass} /> 
                  {/* Password type for security visual, but fetched plain currently? FRD says encrypted. */}
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                  <input {...register("pan", { required: true })} className={inputClass} />
              </div>

              <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                  >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                  </button>
              </div>
          </div>
      </form>
    </div>
  );
}
