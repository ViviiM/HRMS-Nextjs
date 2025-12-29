
"use client";

import { useEffect, useState, use } from "react"; // Added 'use' for unwrapping params
import { useRouter } from "next/navigation";
import { 
  User, Mail, Phone, MapPin, Calendar, Briefcase, 
  FileText, CreditCard, ArrowLeft, Download, CheckCircle, Clock, MessageCircle, Bell 
} from "lucide-react";
import { Tabs, Card, Tag, Button, Spin, Table, Statistic, Row, Col, Avatar, Modal, Form, Input, Select, DatePicker, InputNumber, message, Switch } from "antd";
import { EmployeeForm } from "../components/employee-form";
import { useSession } from "next-auth/react";
import dayjs from "dayjs";

const { TextArea } = Input;

// Define strict types for our data
interface LeaveBalance {
  Annual: number;
  CasualLeave: number;
  SickLeave: number;
  EarnedLeave: number;
  unpaidBalance: number;
}

interface Employee {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  personalEmail?: string;
  phone: string;
  role: string;
  department: string;
  status: string;
  ProfilePhotoUrl?: string;
  joinDate: string;
  salary?: number;
  ctc?: number;
  teamLeadId?: string;
  
  // Personal Details
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  nationality?: string;
  dob?: string;
  gender?: string;
  experience?: number;
  
  // Emergency
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  emergencyContactRelation?: string;
}

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  
  // Unwrap params using React.use()
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showEditModal, setShowEditModal] = useState(false);
  const { data: session } = useSession(); // Access session for role check logic inside component

  
  // Data States
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);
  // WhatsApp State
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  // Internal Notification State
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifForm] = Form.useForm();

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
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
           {/* Personal Info */}
           <Card title="Personal Information" className="shadow-sm rounded-xl border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoItem label="Full Name" value={`${employee.firstName} ${employee.lastName}`} icon={<User className="w-4 h-4" />} />
                  <InfoItem label="Company Email" value={employee.email} icon={<Mail className="w-4 h-4" />} />
                  <InfoItem label="Personal Email" value={employee.personalEmail} icon={<Mail className="w-4 h-4" />} />
                  <InfoItem label="Phone" value={employee.phone} icon={<Phone className="w-4 h-4" />} />
                  
                  <InfoItem label="Date of Birth" value={employee.dob} icon={<Calendar className="w-4 h-4" />} />
                  <InfoItem label="Gender" value={employee.gender} icon={<User className="w-4 h-4" />} />
                  <InfoItem label="Address" value={[employee.address, employee.city, employee.state, employee.zipCode, employee.nationality].filter(Boolean).join(', ')} icon={<MapPin className="w-4 h-4" />} />
                  
                  <InfoItem label="Emergency Contact" value={`${employee.emergencyContactName || ''} (${employee.emergencyContactRelation || ''}) - ${employee.emergencyContactNumber || ''}`} icon={<Phone className="w-4 h-4" />} />
                  <InfoItem label="Status" value={<Tag color={employee.status === 'Active' ? 'green' : 'red'}>{employee.status}</Tag>} />
              </div>
           </Card>

           {/* Employment Info */}
           <Card title="Employment Details" className="shadow-sm rounded-xl border-slate-100">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoItem label="Department" value={employee.department} icon={<Briefcase className="w-4 h-4" />} />
                  <InfoItem label="Role" value={employee.role} icon={<Briefcase className="w-4 h-4" />} />
                  <InfoItem label="Joining Date" value={employee.joinDate} icon={<Calendar className="w-4 h-4" />} />
                  <InfoItem label="Experience" value={employee.experience ? `${employee.experience} Years` : 'N/A'} icon={<Clock className="w-4 h-4" />} />
                  {['.','HR', 'Admin', 'Manager'].includes((session?.user as any)?.role || '') && (
                      <>
                        <InfoItem label="Base Salary" value={employee.salary ? `$${employee.salary.toLocaleString()}` : 'N/A'} icon={<CreditCard className="w-4 h-4" />} />
                        <InfoItem label="CTC" value={employee.ctc ? `$${employee.ctc.toLocaleString()}` : 'N/A'} icon={<CreditCard className="w-4 h-4" />} />
                      </>
                  )}
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
             type='default' 
             className="mb-4 hover:bg-slate-100 inline-flex items-center"
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
                      
                      {/* HR Actions */}
                      {['HR', 'Admin', 'Manager'].includes((session?.user as any)?.role || '') && (
                         <>
                            <Button 
                                icon={<Bell className="w-4 h-4" />} 
                                className="bg-orange-500 hover:bg-orange-600 text-white border-none"
                                onClick={() => setShowNotifModal(true)}
                            >
                                Notify
                            </Button>
                            <Button 
                                icon={<MessageCircle className="w-4 h-4" />} 
                                className="bg-green-600 hover:bg-green-700 text-white border-none"
                                onClick={() => setShowMsgModal(true)}
                            >
                                WhatsApp
                            </Button>
                            <Button icon={<CheckCircle className="w-4 h-4" />} onClick={() => setShowEditModal(true)}>Edit Profile</Button> 
                         </>
                      )}
                  </div>
              </div>
          </div>

           {/* Notification Modal */}
           <Modal
              title={<div className="flex items-center gap-2 text-orange-600"><Bell className="w-5 h-5"/> Send Portal Notification</div>}
              open={showNotifModal}
              onCancel={() => setShowNotifModal(false)}
              footer={[
                  <Button key="cancel" onClick={() => setShowNotifModal(false)}>Cancel</Button>,
                  <Button 
                    key="submit" 
                    type="primary" 
                    className="bg-orange-500 hover:bg-orange-600 border-none" 
                    loading={sendingNotif}
                    onClick={() => notifForm.submit()}
                  >
                    Send Notification
                  </Button>
              ]}
           >
              <Form
                 form={notifForm}
                 layout="vertical"
                 className="pt-4"
                 initialValues={{ type: 'Alert', actionRequired: false }}
                 onFinish={async (values) => {
                     setSendingNotif(true);
                     try {
                         const res = await fetch("/api/notifications", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                employeeId: id,
                                ...values
                            })
                         });
                         const json = await res.json();
                         if (json.success) {
                             message.success("Notification sent successfully");
                             setShowNotifModal(false);
                             notifForm.resetFields();
                         } else {
                             message.error(json.error || "Failed to send");
                         }
                     } catch(err) {
                         message.error("Failed to send notification");
                     } finally {
                         setSendingNotif(false);
                     }
                 }}
              >
                  <Form.Item name="subject" label="Subject" rules={[{ required: true, message: 'Please enter a subject' }]}>
                      <Input placeholder="e.g. Action Required: Document Missing" />
                  </Form.Item>
                  <Form.Item name="message" label="Message" rules={[{ required: true, message: 'Please enter a message' }]}>
                      <TextArea rows={3} placeholder="Enter detailed message..." />
                  </Form.Item>
                  <Row gutter={16}>
                      <Col span={12}>
                          <Form.Item name="type" label="Type">
                              <Select>
                                  <Select.Option value="Alert">Alert</Select.Option>
                                  <Select.Option value="Info">Info</Select.Option>
                                  <Select.Option value="Action">Action</Select.Option>
                              </Select>
                          </Form.Item>
                      </Col>
                      <Col span={12}>
                          <Form.Item name="actionRequired" label="Action Required?" valuePropName="checked">
                              <Switch />
                          </Form.Item>
                      </Col>
                  </Row>
              </Form>
           </Modal>

          {showEditModal && (
            <EmployeeForm 
                employee={{
                    ...employee,
                    personalDetails: {
                        address: employee.address,
                        city: employee.city,
                        state: employee.state,
                        zipCode: employee.zipCode,
                        nationality: employee.nationality,
                        dob: employee.dob ? dayjs(employee.dob) : undefined,
                        gender: employee.gender,
                        experience: employee.experience,
                        emergencyContact: employee.emergencyContactName,
                        emergencyPhone: employee.emergencyContactNumber,
                        emergencyRelation: employee.emergencyContactRelation,
                    }
                } as any}
                onCancel={() => setShowEditModal(false)}
                onSubmit={async (data) => {
                    // Call PUT API
                    try {
                        const res = await fetch(`/api/employees/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        });
                        const json = await res.json();
                        if(json.success) {
                            // Update local state
                           const updatedData = data as any;
                           setEmployee(prev => ({ ...prev!, ...updatedData, 
                               // Merge nested personalDetails back to flat structure for display
                               ...(updatedData.personalDetails ? {
                                   address: updatedData.personalDetails.address,
                                   city: updatedData.personalDetails.city,
                                   state: updatedData.personalDetails.state,
                                   zipCode: updatedData.personalDetails.zipCode,
                                   nationality: updatedData.personalDetails.nationality,
                                   dob: updatedData.personalDetails.dob,
                                   gender: updatedData.personalDetails.gender,
                                   experience: updatedData.personalDetails.experience,
                                   emergencyContactName: updatedData.personalDetails.emergencyContact,
                                   emergencyContactNumber: updatedData.personalDetails.emergencyPhone,
                                   emergencyContactRelation: updatedData.personalDetails.emergencyRelation,
                               } : {}) 
                           }));
                           setShowEditModal(false);
                        } else {
                            alert("Failed to update: " + json.error);
                        }
                    } catch(e) {
                        console.error(e);
                        alert("Update failed");
                    }
                }}
            />
          )}

          {/* WhatsApp Modal */}
          <Modal
            title={<div className="flex items-center gap-2 text-green-700"><MessageCircle className="w-5 h-5"/> Send WhatsApp Notification</div>}
            open={showMsgModal}
            onCancel={() => setShowMsgModal(false)}
            footer={[
                <Button key="cancel" onClick={() => setShowMsgModal(false)}>Cancel</Button>,
                <Button 
                    key="send" 
                    type="primary" 
                    className="bg-green-600 hover:bg-green-700" 
                    loading={sendingMsg}
                    onClick={async () => {
                        if(!msgText.trim()) return message.error("Please enter a message");
                        setSendingMsg(true);
                        try {
                             const res = await fetch("/api/notifications/whatsapp", {
                                 method: "POST",
                                 headers: { "Content-Type": "application/json" },
                                 body: JSON.stringify({
                                     employeeId: id,
                                     template: "hr_notification",
                                     variables: [employee?.firstName || 'Employee', msgText]
                                 })
                             });
                             const json = await res.json();
                             if(json.success) {
                                 message.success("WhatsApp message sent!");
                                 setShowMsgModal(false);
                                 setMsgText("");
                             } else {
                                 message.error(json.error || "Failed to send");
                             }
                        } catch(e) { message.error("Error sending message"); }
                        finally { setSendingMsg(false); }
                    }}
                >
                    Send Message
                </Button>
            ]}
         >
            <div className="py-4">
                <div className="mb-4 bg-green-50 p-4 rounded-xl border border-green-100 text-green-800 text-sm">
                    <strong>Template:</strong> HR Notification<br/>
                    <div className="mt-1 opacity-75 italic">"Hi {employee?.firstName}, [Your Message]"</div>
                </div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message Content</label>
                <TextArea 
                    rows={4} 
                    className="rounded-xl"
                    placeholder="Enter the notification details here..." 
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                />
            </div>
         </Modal>

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
