"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function LeaveBalanceCards({ refreshTrigger }: { refreshTrigger: number }) {
  const [balances, setBalances] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const res = await fetch("/api/leaves/balance");
        const json = await res.json();
        if (json.success) {
           setBalances(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchBalances();
  }, [refreshTrigger]);

  if (loading) return <div className="text-gray-400 text-sm">Loading balances...</div>;

  const data = balances || { Casual: 0, Sick: 0, Earned: 0, Unpaid: 0 };

  // Helper/Config
  const config: Record<string, { total: number, color: string }> = {
     Casual: { total: 12, color: "text-blue-600" },
     Sick: { total: 10, color: "text-red-600" },
     Earned: { total: 15, color: "text-green-600" },
     Unpaid: { total: 0, color: "text-gray-600" } // Denom is infinite or 0? Usually just tracked.
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
       {Object.keys(config).map(type => {
            const val = data[type];
            const cfg = config[type];
            return (
                <div key={type} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div className="text-xs text-gray-500 uppercase font-semibold">{type}</div>
                    <div className="mt-2 text-2xl font-bold text-gray-800">
                        {val}
                        {cfg.total > 0 && <span className="text-sm text-gray-400 font-normal">/{cfg.total}</span>}
                    </div>
                    {/* Add progress bar? */}
                    {cfg.total > 0 && (
                        <div className="w-full bg-gray-100 h-1.5 mt-2 rounded-full overflow-hidden">
                            <div 
                                className={`h-full bg-current ${cfg.color} opacity-80`} 
                                style={{ width: `${Math.min((val / cfg.total) * 100, 100)}%` }}
                            />
                        </div>
                    )}
                </div>
            )
       })}
    </div>
  );
}
