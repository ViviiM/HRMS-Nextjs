"use client";

import { useEffect, useState } from "react";
import { Search, Mail, Phone, Briefcase, Plus, Filter, X } from "lucide-react";
import { EmployeeForm } from "./components/employee-form";

import { Input as AntInput, Select as AntSelect, Card, Avatar as AntAvatar, Tag, Row, Col, Button, Popover, Badge, Divider } from "antd";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

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
      const matchesDept = deptFilter === "All" || emp.Department === deptFilter;
      const matchesRole = roleFilter === "All" || emp.Role === roleFilter;
      const matchesStatus = statusFilter === "All" || emp.Status === statusFilter;
      
      return matchesSearch && matchesDept && matchesRole && matchesStatus;
  });

  const departments = Array.from(new Set(employees.map(e => e.Department).filter(Boolean)));
  const roles = Array.from(new Set(employees.map(e => e.Role).filter(Boolean)));
  const statuses = ["Active", "Intern", "On Notice", "Resign", "Fire"];

  const activeFilters = [deptFilter, roleFilter, statusFilter].filter(f => f !== "All").length;

  const clearFilters = () => {
    setDeptFilter("All");
    setRoleFilter("All");
    setStatusFilter("All");
  };

  const filterContent = (
    <div className="w-72">
        <div className="flex justify-between items-center mb-3 px-1">
            <span className="font-semibold text-slate-800">Filter Employees</span>
            {activeFilters > 0 && (
                <Button type="text" size="small" className="text-blue-600 p-0 h-auto font-medium" onClick={clearFilters}>
                    Reset all
                </Button>
            )}
        </div>
        <Divider className="my-2" />
        <div className="space-y-4 py-2">
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Department</label>
                <AntSelect 
                    value={deptFilter}
                    style={{ width: '100%' }}
                    onChange={setDeptFilter}
                    options={[
                        { value: 'All', label: 'All Departments' },
                        ...departments.map(d => ({ value: d, label: d }))
                    ]}
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</label>
                <AntSelect 
                    value={roleFilter}
                    style={{ width: '100%' }}
                    onChange={setRoleFilter}
                    options={[
                        { value: 'All', label: 'All Roles' },
                        ...roles.map(r => ({ value: r, label: r }))
                    ]}
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</label>
                <AntSelect 
                    value={statusFilter}
                    style={{ width: '100%' }}
                    onChange={setStatusFilter}
                    options={[
                        { value: 'All', label: 'All Statuses' },
                        ...statuses.map(s => ({ value: s, label: s }))
                    ]}
                />
            </div>
        </div>
    </div>
  );

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Employee Directory</h1>
            <p className="text-slate-500 mt-1">Manage and view your team members</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative">
                <AntInput 
                    placeholder="Search by name or email..." 
                    prefix={<Search className="w-4 h-4 text-gray-400" />} 
                    className="w-full md:w-64 rounded-lg"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    allowClear
                />
            </div>

            <Popover 
                content={filterContent} 
                trigger="click" 
                placement="bottomRight"
                arrow={false}
                overlayClassName="filter-popover"
            >
                <Badge count={activeFilters} offset={[-5, 5]} size="small" color="blue">
                    <Button icon={<Filter className="w-4 h-4" />}>
                        Filters
                    </Button>
                </Badge>
            </Popover>

            {['HR', 'Admin'].includes(role) && (
                <Button 
                    type="primary" 
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    Add Employee
                </Button>
            )}
        </div>
      </div>

      {loading ? (
          <div className="text-center py-20 text-gray-400">Loading directory...</div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-700">
              {filtered.map(emp => (
                  <Card 
                        key={emp.id} 
                        className={`hover:shadow-lg transition-all duration-300 border-slate-100 rounded-2xl overflow-hidden group ${
                            ['HR', 'Admin','Manager'].includes(role) ? 'cursor-pointer' : ''
                        }`}
                        onClick={() => {
                            if(['HR', 'Admin','Manager'].includes(role)) {
                                router.push(`/employees/${emp.EmployeeId || emp.Id}`);
                            }
                        }}
                  >
                      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-blue-50 to-indigo-50 group-hover:from-blue-100 group-hover:to-indigo-100 transition-colors"></div>
                      <div className="flex flex-col items-center p-4 relative pt-12">
                          <AntAvatar src={emp.ProfilePhotoUrl || emp.photo} size={80} className="mb-4 bg-white text-blue-600 text-2xl font-bold border-4 border-white shadow-sm">
                              {emp.FirstName?.[0]}
                          </AntAvatar>
                          <h3 className="font-bold text-slate-800 text-lg mb-1">{emp.FirstName} </h3>
                          <div className="text-cyan-600 font-bold text-xs uppercase tracking-wider mb-2">{emp.Role}</div>
                          <Tag className="mb-6 rounded-full px-3">{emp.Department}</Tag>
                          
                          <div className="w-full space-y-3 pt-2">
                              <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                                  <a href={`mailto:${emp.Email}`} className="hover:text-blue-600 truncate" onClick={(e) => e.stopPropagation()}>{emp.Email}</a>
                              </div>
                              {emp.Phone && (
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

      {showAddModal && (
        <EmployeeForm 
            onCancel={() => setShowAddModal(false)}
            onSubmit={(data) => {
                // Determine if we are creating or updating (Form handles logic but here we might refresh list)
                // For now, assume success closes modal and re-fetches
                setShowAddModal(false); 
                fetch('/api/employees')
                    .then(res => res.json())
                    .then(json => {
                        if(json.success) setEmployees(json.data);
                    });
            }}
        />
      )}
    </>
  );
}
