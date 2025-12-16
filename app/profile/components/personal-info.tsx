"use client";

export default function PersonalInfoTab({ data }: { data: any }) {
  const Field = ({ label, value }: { label: string, value: string }) => (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      <div className="text-gray-900 font-medium">{value || "-"}</div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h3 className="text-xl font-bold text-gray-800">Personal Information</h3>
        <button className="text-sm text-blue-600 font-medium hover:underline">Edit Details</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
         <Field label="First Name" value={data?.firstName} />
         <Field label="Last Name" value={data?.lastName} />
         <Field label="Email" value={data?.email} />
         <Field label="Phone" value={data?.phone} />
         <Field label="Date of Birth" value={data?.dob} />
         <Field label="Gender" value={data?.gender} />
         <div className="md:col-span-2">
            <Field label="Address" value={data?.address} />
         </div>
      </div>

      <div className="mt-8 pt-6 border-t">
        <h4 className="text-lg font-bold text-gray-800 mb-4">Emergency Contact</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <Field label="Contact Name" value={data?.emergency?.name} />
            <Field label="Contact Number" value={data?.emergency?.number} />
        </div>
      </div>
    </div>
  );
}
