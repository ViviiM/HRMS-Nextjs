"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Tag } from "antd";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface LeaveRequest {
  id: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  appliedOn: string;
}

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leaves/approvals");
      const json = await res.json();
      if (json.success) {
        setRequests(json.data);
      } else {
        if(res.status === 403) toast.error("Access Denied: Approvers Only");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: string, action: 'Approve' | 'Reject') => {
    setProcessingId(id);
    try {
        const res = await fetch("/api/leaves/approvals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leaveId: id, action })
        });
        
        if (res.ok) {
            toast.success(`Leave ${action}d successfully`);
            // Refresh list locally to avoid full reload lag
            setRequests(prev => prev.filter(r => r.id !== id));
        } else {
            const json = await res.json();
            toast.error(json.error || "Action failed");
        }
    } catch(e) {
        toast.error("Error processing request");
    } finally {
        setProcessingId(null);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Loading requests...</div>;

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Leave Approvals</h1>
        <button onClick={fetchRequests} className="text-sm text-blue-600 hover:underline">Refresh</button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 text-center">
            <h3 className="text-lg font-medium text-gray-700">No Pending Requests</h3>
            <p className="text-gray-500 text-sm mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3">Employee</th>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">Dates</th>
                            <th className="px-6 py-3">Days</th>
                            <th className="px-6 py-3">Reason</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {requests.map(req => (
                            <tr key={req.id} className="hover:bg-gray-50/50">
                                <td className="px-6 py-4 font-medium text-gray-900">{req.employeeName}</td>
                                <td className="px-6 py-4">{req.type}</td>
                                <td className="px-6 py-4 text-gray-600">
                                    {format(new Date(req.startDate), 'MMM d')} - {format(new Date(req.endDate), 'MMM d')}
                                </td>
                                <td className="px-6 py-4">{req.days}</td>
                                <td className="px-6 py-4 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                                <td className="px-6 py-4">
                                     <Tag color="blue">{req.status}</Tag>
                                </td>
                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                    {processingId === req.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin ml-auto text-gray-400" />
                                    ) : (
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => handleAction(req.id, 'Approve')}
                                                className="p-1.5 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition"
                                                title="Approve"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleAction(req.id, 'Reject')}
                                                className="p-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition"
                                                title="Reject"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>
      )}
    </div>
  );
}
