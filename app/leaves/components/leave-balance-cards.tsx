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
                <div key={type} className="relative overflow-hidden bg-white/60 backdrop-blur-md p-5 rounded-2xl border border-white/20 shadow-sm hover:shadow-md transition-shadow group">
                    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                        {/* Could add icons here based on type */}
                        <div className={`w-16 h-16 rounded-full blur-xl ${cfg.color.replace('text-', 'bg-')}`}></div>
                    </div>
                    
                    <div className="relative z-10">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{type}</div>
                        <div className="flex items-baseline gap-1">
                            <span className={`text-3xl font-bold ${cfg.color}`}>{val}</span>
                            {cfg.total > 0 && <span className="text-sm text-gray-400 font-medium">/ {cfg.total}</span>}
                        </div>
                        
                        {cfg.total > 0 && (
                            <div className="w-full bg-gray-100 h-2 mt-3 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ease-out ${cfg.color.replace('text-', 'bg-')}`} 
                                    style={{ width: `${Math.min((val / cfg.total) * 100, 100)}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )
       })}
    </div>
  );
}
