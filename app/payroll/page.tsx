"use client";

import { useEffect, useState } from "react";
import { Download, FileText, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns"; // If needed for formatting custom dates
// Using simple cards

export default function PayrollPage() {
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayroll = async () => {
      try {
        const res = await fetch("/api/financial/payroll");
        const json = await res.json();
        if (json.success) setPayslips(json.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPayroll();
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-400">Loading payroll data...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="mb-8">
           <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Payroll</h1>
           <p className="text-slate-500 mt-1">View and download your monthly payslips</p>
       </div>

       {payslips.length === 0 ? (
           <div className="bg-white p-10 rounded-xl border border-dashed border-gray-300 text-center text-gray-400">
               No payslips available yet.
           </div>
       ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {payslips.map((slip) => (
                  <div key={slip.Id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition duration-200 overflow-hidden group">
                      <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                              <div>
                                  <h3 className="font-bold text-lg text-gray-800">{slip.Month__c} {slip.Year__c}</h3>
                                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1 flex items-center gap-1">
                                      {slip.Payment_Status__c === 'Paid' ? (
                                          <><CheckCircle className="w-3 h-3 text-green-500" /> PAID</>
                                      ) : (
                                          <><Clock className="w-3 h-3 text-amber-500" /> PENDING</>
                                      )}
                                  </div>
                              </div>
                              <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                  <FileText className="w-5 h-5" />
                              </div>
                          </div>

                          <div className="py-4 border-t border-b border-gray-50 space-y-2">
                              <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Gross Earnings</span>
                                  <span className="font-medium">₹{slip.Gross_Salary__c?.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Total Deductions</span>
                                  <span className="font-medium text-red-500">-₹{slip.Total_Deductions__c?.toLocaleString()}</span>
                              </div>
                          </div>

                          <div className="mt-4 flex justify-between items-end">
                              <div>
                                  <div className="text-xs text-gray-400 mb-0.5">Net Pay</div>
                                  <div className="text-2xl font-bold text-gray-900">₹{slip.Net_Salary__c?.toLocaleString()}</div>
                              </div>
                              
                              {slip.Payslip_URL__c ? (
                                  <a 
                                    href={slip.Payslip_URL__c} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition"
                                    title="Download PDF"
                                  >
                                      <Download className="w-5 h-5" />
                                  </a>
                              ) : (
                                  <button disabled className="p-2 bg-gray-50 text-gray-300 rounded-lg cursor-not-allowed">
                                      <Download className="w-5 h-5" />
                                  </button>
                              )}
                          </div>
                      </div>
                      
                      {slip.Payment_Date__c && (
                          <div className="bg-gray-50 px-6 py-2 text-xs text-gray-500 flex justify-between">
                              <span>Credited on</span>
                              <span className="font-medium">{slip.Payment_Date__c}</span>
                          </div>
                      )}
                  </div>
              ))}
           </div>
       )}
    </div>
  );
}
