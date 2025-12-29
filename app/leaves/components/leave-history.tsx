"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Tag, Button, Popconfirm, Tooltip, message } from "antd";
import { XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

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
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leaves");
      const json = await res.json();

      if (json.success) {
        const formattedLeaves = json.data.map((item: any) => ({
          id: item.Id,
          type: item.LeaveType,
          startDate: item.StartDate,
          endDate: item.EndDate,
          days: item.TotalDays ?? 0,
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

  useEffect(() => {
    fetchLeaves();
  }, [refreshTrigger]);

  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      const res = await fetch(`/api/leaves/${id}/cancel`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Cancelled by User' }) 
      });
      const result = await res.json();
      
      if (res.ok) {
        toast.success("Leave cancelled successfully");
        fetchLeaves(); // Refresh list
      } else {
        toast.error(result.error || "Failed to cancel leave");
      }
    } catch (error) {
       toast.error("Error cancelling leave");
    } finally {
       setCancelling(null);
    }
  };

  if (loading && leaves.length === 0) return (
      <div className="flex items-center justify-center p-8 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2"/> Loading history...
      </div>
  );

  if (leaves.length === 0) return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-500">No leave history found.</p>
      </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-semibold text-gray-800">Leave History</h3>
          <Button type="text" icon={<RefreshCw className="w-4 h-4" />} onClick={fetchLeaves} loading={loading} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold tracking-wider">
             <tr>
               <th className="px-6 py-3">Type</th>
               <th className="px-6 py-3">Dates</th>
               <th className="px-6 py-3">Duration</th>
               <th className="px-6 py-3">Status</th>
               <th className="px-6 py-3 text-right">Action</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
             {leaves.map((leave) => {
               const canCancel = leave.status === 'Applied' || leave.status === 'Approved' || leave.status === 'Pending';
               return (
                <tr key={leave.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{leave.type}</td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                        {format(new Date(leave.startDate), 'MMM d, yyyy')} - {format(new Date(leave.endDate), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                        {leave.days} Day{leave.days !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4">
                        <Tag 
                            color={
                                leave.status === 'Approved' ? 'success' :
                                leave.status === 'Rejected' || leave.status === 'Cancelled' ? 'error' :
                                'processing'
                            }
                            className="px-2 py-0.5 rounded-full text-xs font-medium border-0"
                        >
                            {leave.status}
                        </Tag>
                    </td>
                    <td className="px-6 py-4 text-right">
                        {canCancel && (
                            <Popconfirm
                                title="Cancel Leave"
                                description="Are you sure you want to cancel this leave?"
                                onConfirm={() => handleCancel(leave.id)}
                                okText="Yes, Cancel"
                                cancelText="No"
                                okButtonProps={{ danger: true, loading: cancelling === leave.id }}
                            >
                                <Button 
                                    size="small" 
                                    danger 
                                    className="border-red-200 text-red-600 bg-red-50 hover:bg-red-100 flex items-center gap-1 ml-auto"
                                    icon={<XCircle className="w-3 h-3"/>}
                                    loading={cancelling === leave.id}
                                >
                                    Cancel
                                </Button>
                            </Popconfirm>
                        )}
                    </td>
                </tr>
               )
             })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
