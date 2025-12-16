import { Tag } from "antd";

export default function EmploymentInfoTab({ data }: { data: any }) {
  const Field = ({ label, value }: { label: string, value: any }) => (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      <div className="text-gray-900 font-medium">{value || "-"}</div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h3 className="text-xl font-bold text-gray-800">Employment Details</h3>
        <Tag color={data?.status === 'Active' ? 'green' : 'orange'}>
            {data?.status?.toUpperCase()}
        </Tag>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
         <Field label="Employee ID" value={data?.employeeId} />
         <Field label="Company Email" value={data?.companyEmail} />
         <Field label="Department" value={data?.department} />
         <Field label="Designation / Role" value={data?.role} />
         <Field label="Joining Date" value={data?.joiningDate} />
         <Field label="Team Lead" value={data?.teamLead} />
      </div>
    </div>
  );
}
