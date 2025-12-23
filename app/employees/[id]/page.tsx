"use client";

import { useEffect, useState, use } from "react"; // Added 'use' for unwrapping params
import { useRouter } from "next/navigation";
import { 
  User, Mail, Phone, MapPin, Calendar, Briefcase, 
  FileText, CreditCard, ArrowLeft, Download, CheckCircle, Clock 
} from "lucide-react";
import { Tabs, Card, Tag, Button, Spin, Table, Statistic, Row, Col, Avatar } from "antd";

// Define strict types for our data
interface LeaveBalance {
  Annual: number;
  CasualLeave: number;
  SickLeave: number;
  EarnedLeave: number;
  unpaidBalance: number;
}

interface Employee {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: string;
  ProfilePhotoUrl?: string;
  joinDate: string;
}

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  
  // Unwrap params using React.use()
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Data States
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [empRes, docRes, bankRes, balRes, leavesRes] = await Promise.all([
           fetch(`/api/employees/${id}`),
           fetch(`/api/employees/${id}/documents`),
           fetch(`/api/employees/${id}/bank`),
           fetch(`/api/leaves/balance/${id}`),
           fetch(`/api/leaves?employeeId=${id}`)
        ]);

        const empData = await empRes.json();
        const docData = await docRes.json();
        const bankData = await bankRes.json();
        const balData = await balRes.json();
        const leavesData = await leavesRes.json();

        if (empData.success) setEmployee(empData.data);
        if (docData.success) setDocuments(docData.data);
        if (bankData.success) setBankDetails(bankData.data);
        if (balData.success) setLeaveBalance(balData.data);
         // Note: leaves api might return { success: true, data: [] } or just [] depending on implementation
         // Checking standard response wrapper:
        if (leavesData.success) setLeaveHistory(leavesData.data);

      } catch (error) {
        console.error("Failed to load employee details", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  if (loading) {
      return <div className="flex h-screen items-center justify-center"><Spin size="large" /></div>;
  }

  if (!employee) {
      return <div className="text-center py-20">Employee not found</div>;
  }

  const items = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <div className="space-y-6 animate-in fade-in duration-500">
           {/* Personal Info */}
           <Card title="Personal Information" className="shadow-sm rounded-xl border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoItem label="Full Name" value={`${employee.firstName} ${employee.lastName}`} icon={<User className="w-4 h-4" />} />
                  <InfoItem label="Email" value={employee.email} icon={<Mail className="w-4 h-4" />} />
                  <InfoItem label="Phone" value={employee.phone} icon={<Phone className="w-4 h-4" />} />
                  <InfoItem label="Status" value={<Tag color={employee.status === 'Active' ? 'green' : 'red'}>{employee.status}</Tag>} />
              </div>
           </Card>

           {/* Employment Info */}
           <Card title="Employment Details" className="shadow-sm rounded-xl border-slate-100">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoItem label="Department" value={employee.department} icon={<Briefcase className="w-4 h-4" />} />
                  <InfoItem label="Role" value={employee.role} icon={<Briefcase className="w-4 h-4" />} />
                  <InfoItem label="Joining Date" value={employee.joinDate} icon={<Calendar className="w-4 h-4" />} />
               </div>
           </Card>
        </div>
      ),
    },
    {
      key: 'leaves',
      label: 'Leaves & Balance',
      children: (
        <div className="space-y-6 animate-in fade-in duration-500">
           {/* Balance Cards */}
           <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}><StatisticCard title="Annual Leave" value={leaveBalance?.Annual} color="bg-blue-50 text-blue-700" /></Col>
              <Col xs={12} sm={6}><StatisticCard title="Casual Leave" value={leaveBalance?.CasualLeave} color="bg-green-50 text-green-700" /></Col>
              <Col xs={12} sm={6}><StatisticCard title="Sick Leave" value={leaveBalance?.SickLeave} color="bg-orange-50 text-orange-700" /></Col>
              <Col xs={12} sm={6}><StatisticCard title="Loss of Pay" value={leaveBalance?.unpaidBalance} color="bg-red-50 text-red-700" /></Col>
           </Row>

           {/* Leave History */}
           <Card title="Leave History" className="shadow-sm rounded-xl border-slate-100">
              <Table 
                 dataSource={leaveHistory} 
                 rowKey="Id"
                 pagination={{ pageSize: 5 }}
                 columns={[
                    { title: 'Type', dataIndex: 'Leave_Type__c', key: 'type' },
                    { title: 'From', dataIndex: 'Start_Date__c', key: 'start' },
                    { title: 'To', dataIndex: 'End_Date__c', key: 'end' },
                    { title: 'Days', dataIndex: 'Total_Days__c', key: 'days' },
                    { 
                      title: 'Status', 
                      dataIndex: 'Status__c', 
                      key: 'status',
                      render: (status) => (
                         <Tag color={
                            status === 'Approved' ? 'green' : 
                            status === 'Rejected' ? 'red' : 
                            'blue'
                         }>{status}</Tag>
                      )
                    },
                 ]}
              />
           </Card>
        </div>
      ),
    },
    {
      key: 'documents',
      label: 'Documents',
      children: (
         <div className="animate-in fade-in duration-500">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {documents.map(doc => (
                     <div key={doc.Id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:shadow-md transition bg-white">
                         <div className="flex items-center gap-3">
                             <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                 <FileText className="w-5 h-5" />
                             </div>
                             <div>
                                 <p className="font-semibold text-slate-800">{doc.Name}</p>
                                 <p className="text-xs text-slate-500">{doc.Document_Type__c}</p>
                             </div>
                         </div>
                         <a href={doc.File_URL__c} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full transition">
                             <Download className="w-5 h-5" />
                         </a>
                     </div>
                 ))}
                 {documents.length === 0 && <p className="text-slate-400 col-span-2 text-center py-10">No documents found.</p>}
             </div>
         </div>
      ),
    },
    {
       key: 'bank',
       label: 'Bank Details',
       children: (
         <div className="animate-in fade-in duration-500">
            <Card className="shadow-sm rounded-xl border-slate-100 bg-gradient-to-br from-white to-slate-50">
                {bankDetails ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 p-4">
                        <InfoItem label="Bank Name" value={bankDetails.Name} icon={<CreditCard className="w-4 h-4" />} />
                        <InfoItem label="Account Number" value={bankDetails.Bank_Account_Number__c} code />
                        <InfoItem label="IFSC Code" value={bankDetails.IFSC__c} code />
                        <InfoItem label="Account Holder" value={bankDetails.Bank_Branch_Name__c} />
                        <InfoItem label="PAN Number" value={bankDetails.Pan_Number__c} />
                    </div>
                ) : (
                    <p className="text-slate-400 text-center py-10">No bank details added.</p>
                )}
            </Card>
         </div>
       )
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/30 p-2 md:p-6">
       <div className="max-w-6xl mx-auto">
          <Button 
             icon={<ArrowLeft className="w-4 h-4" />} 
             type="text" 
             className="mb-4 hover:bg-slate-100"
             onClick={() => router.back()}
          >
             Back to Directory
          </Button>

          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8 relative">
              <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
              <div className="px-8 pb-8 flex flex-col md:flex-row items-center md:items-end -mt-12 gap-6">
                  <div className="relative">
                      <Avatar 
                        size={120} 
                        src={employee.ProfilePhotoUrl} 
                        className="border-4 border-white shadow-md bg-white text-4xl"
                      >
                          {employee.firstName?.[0]}
                      </Avatar>
                      <div className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-2 border-white ${employee.status === 'Active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  </div>
                  
                  <div className="flex-1 text-center md:text-left mb-2">
                       <h1 className="text-3xl font-bold text-slate-900">{employee.firstName} {employee.lastName}</h1>
                       <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-slate-500 mt-2">
                           <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {employee.role}</span>
                           <span className="hidden md:inline">•</span>
                           <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {employee.department}</span>
                       </div>
                  </div>

                  <div className="flex gap-3">
                      <Button type="primary" icon={<Mail className="w-4 h-4" />} href={`mailto:${employee.email}`}>Email</Button>
                      {/* <Button icon={<MoreHorizontal className="w-4 h-4" />} /> */}
                  </div>
              </div>
          </div>

          {/* Tabs Content */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[500px] p-6">
              <Tabs 
                 activeKey={activeTab} 
                 onChange={setActiveTab} 
                 items={items}
                 className="custom-tabs"
              />
          </div>
       </div>
    </div>
  );
}

function InfoItem({ label, value, icon, code }: { label: string, value: any, icon?: React.ReactNode, code?: boolean }) {
    if (!value) return null;
    return (
        <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                {icon} {label}
            </span>
            <div className={`text-base font-medium text-slate-800 ${code ? 'font-mono bg-slate-50 inline-block px-2 py-0.5 rounded border border-slate-100' : ''}`}>
                {value}
            </div>
        </div>
    );
}

function StatisticCard({ title, value, color }: { title: string, value?: number, color: string }) {
    return (
        <div className={`p-5 rounded-xl border border-transparent ${color.replace('text-', 'border-').replace('50', '200')} ${color}`}>
            <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">{title}</p>
            <p className="text-3xl font-bold">{value || 0}</p>
        </div>
    );
}
