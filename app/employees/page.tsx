"use client";

import { useEffect, useState } from "react";
import { Search, Mail, Phone, Briefcase } from "lucide-react";

import { Input as AntInput, Select as AntSelect, Card, Avatar as AntAvatar, Tag, Row, Col } from "antd";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("/api/employees");
        const json = await res.json();
        console.log(json)
        if (json.success) setEmployees(json.data);
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    fetchEmployees();
  }, []);

  const filtered = employees.filter(emp => {
      const matchesSearch = emp.FirstName.toLowerCase().includes(search.toLowerCase()) || 
                            emp.Email.toLowerCase().includes(search.toLowerCase());
      const matchesDept = deptFilter === "All" || emp.Department.toLowerCase() === deptFilter.toLowerCase();
      return matchesSearch && matchesDept;
  });

  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Employee Directory</h1>
            <p className="text-slate-500 mt-1">Manage and view your team members</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
            <AntInput 
                placeholder="Search..." 
                prefix={<Search className="w-4 h-4 text-gray-400" />} 
                className="w-full md:w-64 rounded-lg"
                onChange={e => setSearch(e.target.value)}
            />
            <AntSelect 
                defaultValue="All" 
                className="w-40"
                onChange={setDeptFilter}
                options={[
                    { value: 'All', label: 'All Depts' },
                    ...departments.map(d => ({ value: d, label: d }))
                ]}
            />
        </div>
      </div>

      {loading ? (
          <div className="text-center py-20 text-gray-400">Loading directory...</div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-700">
              {filtered.map(emp => (
                  <Card key={emp.id} className="hover:shadow-lg transition-all duration-300 border-slate-100 rounded-2xl overflow-hidden group">
                      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-blue-50 to-indigo-50 group-hover:from-blue-100 group-hover:to-indigo-100 transition-colors"></div>
                      <div className="flex flex-col items-center p-4 relative pt-12">
                          <AntAvatar src={emp.photo} size={80} className="mb-4 bg-white text-blue-600 text-2xl font-bold border-4 border-white shadow-sm">
                              {emp.FirstName[0]}
                          </AntAvatar>
                          <h3 className="font-bold text-slate-800 text-lg mb-1">{emp.FirstName}</h3>
                          <div className="text-cyan-600 font-bold text-xs uppercase tracking-wider mb-2">{emp.Role}</div>
                          <Tag className="mb-6 rounded-full px-3">{emp.Department}</Tag>
                          
                          <div className="w-full space-y-3 pt-2">
                              <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                                  <a href={`mailto:${emp.Email}`} className="hover:text-blue-600 truncate">{emp.Email}</a>
                              </div>
                              {emp.phone && (
                                  <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                                      {emp.Phone}
                                  </div>
                              )}
                          </div>
                      </div>
                  </Card>
              ))}
          </div>
      )}
      
      {!loading && filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">No employees found matching your filters.</div>
      )}
    </>
  );
}
