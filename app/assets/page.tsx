"use client";

import { useState, useEffect } from "react";
import { Tag, Button } from "antd"; // Using Antd as requested in previous convo/style
import { Laptop, Phone, Tablet, Headphones, BadgeCheck, Clock } from "lucide-react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";

export default function AssetsPage() {
  const { data: session } = useSession();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine Role View
  const role = (session?.user as any)?.role;
  const isHR = role === 'HR' || role === 'Admin';

  const fetchAssets = async () => {
    try {
       const res = await fetch("/api/assets");
       const json = await res.json();
       if(json.success) setAssets(json.data);
    } catch(e) { console.error(e); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    if(session) fetchAssets();
  }, [session]);

  if (loading) return <div className="p-10 text-center text-gray-400">Loading assets...</div>;

  const getIcon = (category: string) => {
      switch(category) {
          case 'Laptop': return <Laptop className="w-5 h-5 text-blue-500" />;
          case 'Mobile': return <Phone className="w-5 h-5 text-green-500" />;
          case 'Headset': return <Headphones className="w-5 h-5 text-purple-500" />;
          default: return <Tablet className="w-5 h-5 text-gray-500" />;
      }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-8">
         <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                {isHR ? "Asset Inventory" : "My Assets"}
            </h1>
            <p className="text-slate-500 mt-1">Track and manage allocated devices</p>
         </div>
         {isHR && (
             <Button type="primary" className="bg-blue-600 h-10 px-6 rounded-lg font-medium">Add Asset</Button>
         )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {assets.length === 0 ? (
              <div className="p-10 text-center text-gray-500">No assets found.</div>
          ) : (
              <table className="w-full text-sm text-left">
                 <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                        <th className="px-6 py-4">Asset Name</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Serial No.</th>
                        {isHR && <th className="px-6 py-4">Assigned To</th>}
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Warranty</th>
                        {isHR && <th className="px-6 py-4 text-right">Actions</th>}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {assets.map((asset: any) => (
                        <tr key={asset.Id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                                {getIcon(asset.Category__c)}
                                {asset.Name}
                            </td>
                            <td className="px-6 py-4">{asset.Category__c}</td>
                            <td className="px-6 py-4 font-mono text-xs">{asset.Serial_Number__c}</td>
                            {isHR && <td className="px-6 py-4">{asset.Assigned_To__r?.Name || '-'}</td>}
                            <td className="px-6 py-4">
                                <Tag color={
                                    asset.Status__c === 'Available' ? 'green' :
                                    asset.Status__c === 'Assigned' ? 'blue' :
                                    'red'
                                }>
                                    {asset.Status__c}
                                </Tag>
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                                {asset.Warranty_Expiry__c ? format(new Date(asset.Warranty_Expiry__c), 'MMM d, yyyy') : '-'}
                            </td>
                            {isHR && (
                                <td className="px-6 py-4 text-right">
                                    <button className="text-blue-600 hover:underline text-xs">Edit</button>
                                </td>
                            )}
                        </tr>
                    ))}
                 </tbody>
              </table>
          )}
      </div>
    </div>
  );
}
