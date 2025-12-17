"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Tag } from "antd";

interface Leave {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  reason: string;
}

export default function LeaveHistory({ refreshTrigger }: { refreshTrigger: number }) {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        const res = await fetch("/api/leaves");
        const json = await res.json();
        console.log('Leave History', json);

        if (json.success) {
          const formattedLeaves = json.data.map((item: any) => ({
            id: item.Id,
            type: item.LeaveType,
            startDate: item.StartDate,
            endDate: item.EndDate,
            // Assuming TotalDays is a number, or needs calculation if null
            days: item.TotalDays === null ? 0 : item.TotalDays, // Or calculate diff between StartDate and EndDate
            status: item.Status,
            reason: item.Reason,
          }));
          setLeaves(formattedLeaves);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaves();
  }, [refreshTrigger]);

  if (loading) return <div className="text-center py-4 text-gray-400">Loading history...</div>;

  if (leaves.length === 0) return <div className="text-center py-8 text-gray-500">No leave history found.</div>;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-800">Leave History</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
             <tr>
               <th className="px-6 py-3">Type</th>
               <th className="px-6 py-3">Dates</th>
               <th className="px-6 py-3">Days</th>
               <th className="px-6 py-3">Status</th>
               {/* <th className="px-6 py-3">Reason</th> */}
             </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
             {leaves.map((leave) => (
               <tr key={leave.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium">{leave.type}</td>
                  <td className="px-6 py-4 text-gray-600">
                     {format(new Date(leave.startDate), 'MMM d')} - {format(new Date(leave.endDate), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4">{leave.days}</td>
                  <td className="px-6 py-4">
                     <Tag color={
                        leave.status === 'Approved' ? 'green' :
                        leave.status === 'Rejected' ? 'red' :
                        'gold'
                     }>
                        {leave.status}
                     </Tag>
                  </td>
               </tr>
             ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
