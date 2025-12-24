"use client";
import { useState, useEffect } from "react";

export default function PersonalInfoTab({ data }: { data: any }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(data || {});

  useEffect(() => { setFormData(data || {}); }, [data]);

  const handleChange = (field: string, val: string) => {
      setFormData((prev: any) => {
          // Handle nested updates for emergency
          if(field.startsWith('emergency.')) {
              const key = field.split('.')[1];
              return { ...prev, emergency: { ...prev.emergency, [key]: val } };
          }
          return { ...prev, [field]: val };
      });
  };

  const handleSave = async () => {
      setLoading(true);
      try {
          const res = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: formData.phone,
                address: formData.address,
                gender: formData.gender,
                dob: formData.dob,
                emergency: formData.emergency
            })
          });
          
          if(res.ok) {
              setEditing(false);
              // Optimistic update or Toast
              // Simple alert if toast not avail, but we have toast in other files, let's assume valid.
              // Re-using sonner or similar if available, otherwise just switch off edit.
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const Field = ({ label, value, fieldName, editable = false, type = 'text', options = [] }: any) => (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      {editing && editable ? (
          type === 'select' ? (
              <select 
                className="w-full border rounded p-1 text-sm bg-white"
                value={value || ''}
                onChange={e => handleChange(fieldName, e.target.value)}
              >
                  {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
          ) : (
            <input 
                className="w-full border rounded p-1 text-sm" 
                value={value || ''} 
                onChange={e => handleChange(fieldName, e.target.value)}
            />
          )
      ) : (
        <div className="text-gray-900 font-medium">{value || "-"}</div>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h3 className="text-xl font-bold text-gray-800">Personal Information</h3>
        {!editing ? (
             <button onClick={() => setEditing(true)} className="text-sm text-blue-600 font-medium hover:underline">Edit Details</button>
        ) : (
             <div className="flex gap-2">
                 <button onClick={() => setEditing(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                 <button onClick={handleSave} disabled={loading} className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                     {loading ? 'Saving...' : 'Save Changes'}
                 </button>
             </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
         <Field label="First Name" value={formData?.firstName} />
         <Field label="Last Name" value={formData?.lastName} />
         <Field label="Email" value={formData?.email} />
         <Field label="Phone" value={formData?.phone} fieldName="phone" editable />
         <Field label="Date of Birth" value={formData?.dob} fieldName="dob" editable type="date" />
         <Field label="Gender" value={formData?.gender} fieldName="gender" editable type="select" options={['Male', 'Female', 'Other']} />
         <div className="md:col-span-2">
            <Field label="Address" value={formData?.address} fieldName="address" editable />
         </div>
      </div>

      <div className="mt-8 pt-6 border-t">
        <h4 className="text-lg font-bold text-gray-800 mb-4">Emergency Contact</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <Field label="Contact Name" value={formData?.emergency?.name} fieldName="emergency.name" editable />
            <Field label="Contact Number" value={formData?.emergency?.number} fieldName="emergency.number" editable />
        </div>
      </div>
    </div>
  );
}
