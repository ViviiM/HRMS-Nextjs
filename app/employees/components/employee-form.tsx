import { useState, useEffect } from "react"
import { Modal, Form, Input, Select, DatePicker, Upload, Button, Tabs, message, InputNumber } from "antd"
import { UploadOutlined, InboxOutlined } from "@ant-design/icons"
import type { UploadFile } from "antd/es/upload/interface"
import dayjs from "dayjs"
import type { Employee } from "@/types"

interface EmployeeFormProps {
  employee?: Employee
  onSubmit: (data: Employee) => void
  onCancel: () => void
}

const { Option } = Select
const { Dragger } = Upload

export function EmployeeForm({ employee, onSubmit, onCancel }: EmployeeFormProps) {
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState("basic")
  const [teamLeads, setTeamLeads] = useState<any[]>([])
  
  // Fetch potential Team Leads (all employees for now)
  useEffect(() => {
    fetch('/api/employees')
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                setTeamLeads(data.data.map((e: any) => ({
                    label: `${e.FirstName} ${e.LastName || ''}`, 
                    value: e.Id || e.EmployeeId 
                })));
            }
        })
        .catch(err => console.error("Failed to fetch employees", err));
  }, []);

  // Initialize form values
  const initialValues = employee ? {
    ...employee,
    joinDate: employee.JoiningDate ? dayjs(employee.JoiningDate) : (employee.joinDate ? dayjs(employee.joinDate) : dayjs()),
    teamLeadId: employee.TeamLeadId
  } : {
    status: "active",
    joinDate: dayjs(),
    documents: [] as UploadFile[],
  }

  const handleFinish = (values: any) => {
    // Transform values back to expected format
    const formattedData: Employee = {
      ...values,
      id: employee?.id,
      joinDate: values.joinDate ? values.joinDate.format("YYYY-MM-DD") : undefined,
    }

    if(values.documents) {
         formattedData.documents = values.documents.fileList ? values.documents.fileList.map((f: any) => ({
             id: f.uid,
             name: f.name,
             type: 'other',
             url: f.url || '', 
             uploadDate: new Date().toISOString().split('T')[0],
             verified: false
         })) : []
    }
    
    // Add new fields (flattened for API)
    formattedData.teamLeadId = values.teamLeadId;
    formattedData.baseSalary = values.baseSalary;
    formattedData.role = values.role;
    formattedData.department = values.department;
    (formattedData as any).ctc = values.ctc;

    // Use values.personalDetails directly as API expects it nested
    if (values.personalDetails) {
        (formattedData as any).personalDetails = {
            ...values.personalDetails,
            dob: values.personalDetails.dob ? values.personalDetails.dob.format("YYYY-MM-DD") : undefined,
        };
    }
    
    if (values.title) (formattedData as any).title = values.title;
    if (values.leavingDate) (formattedData as any).leavingDate = values.leavingDate.format("YYYY-MM-DD");

    onSubmit(formattedData)
    // Message handled by parent or here? The original code had message.success
    message.success(employee ? "Employee updated successfully!" : "Employee created successfully!")
  }

  const items = [
    {
      key: "basic",
      label: "Basic Info", // Company Email Editable Here
      children: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="John" />
          </Form.Item>
          <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Required' }]}>
             <Input placeholder="Doe" />
          </Form.Item>
          <Form.Item name="email" label="Company Email" rules={[{ required: true, type: 'email' }]}>
             <Input placeholder="john@company.com" />
          </Form.Item>
          <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
             <Input placeholder="+1-555-0101" />
          </Form.Item>
          
          <Form.Item name="department" label="Department" rules={[{ required: true }]}>
            <Select 
                showSearch 
                placeholder="Search or Select Department"
                optionFilterProp="children"
                filterOption={(input, option) => (option!.children as unknown as string).toLowerCase().includes(input.toLowerCase())}
            >
              <Option value="Engineering">Engineering</Option>
              <Option value="Sales">Sales</Option>
              <Option value="HR">HR</Option>
              <Option value="Marketing">Marketing</Option>
              <Option value="Finance">Finance</Option>
              <Option value="Operations">Operations</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
             <Select 
                showSearch
                placeholder="Search or Select Role"
                optionFilterProp="children"
                filterOption={(input, option) => (option!.children as unknown as string).toLowerCase().includes(input.toLowerCase())}
             >
                <Option value="Intern">Intern</Option>
                <Option value="Employee">Employee</Option>
                <Option value="TL">Team Lead</Option>
                <Option value="Manager">Manager</Option>
                <Option value="HR">HR</Option>
                <Option value="Admin">Admin</Option>
             </Select>
          </Form.Item>

          <Form.Item name="teamLeadId" label="Team Lead">
            <Select
                showSearch
                placeholder="Search Team Lead"
                optionFilterProp="label"
                options={teamLeads}
                allowClear
            />
          </Form.Item>

          <Form.Item name="joinDate" label="Join Date" rules={[{ required: true }]}>
             <DatePicker className="w-full" format="YYYY-MM-DD" />
          </Form.Item>
          
          <Form.Item name="salary" label="Base Salary" rules={[{ required: true }]}>
             <InputNumber
                className="w-full"
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value!.replace(/\$\s?|(,*)/g, '')}
             />
          </Form.Item>

          <Form.Item name="ctc" label="CTC (Annual)" rules={[{ required: true }]}>
             <InputNumber
                className="w-full"
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value!.replace(/\$\s?|(,*)/g, '')}
             />
          </Form.Item>
          
          <Form.Item name="title" label="Job Title/Designation">
             <Input placeholder="Senior Software Engineer" />
          </Form.Item>
          
          <Form.Item name="status" label="Status">
            <Select>
              <Option value="Active">Active</Option>
              <Option value="Intern">Intern</Option>
              <Option value="On Notice">On Notice</Option>
              <Option value="Resign">Resigned</Option>
              <Option value="Fire">Terminated</Option>
            </Select>
          </Form.Item>

          <Form.Item name="leavingDate" label="Separation Date">
             <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="If applicable" />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "personal",
      label: "Personal Details",
      children: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Added Personal Email - Read Only */}
           <Form.Item name="personalEmail" label="Personal Email">
             <Input placeholder="john.doe@gmail.com" disabled />
           </Form.Item>

           <Form.Item name={['personalDetails', 'address']} label="Address">
             <Input placeholder="123 Main St" />
           </Form.Item>
           <Form.Item name={['personalDetails', 'city']} label="City">
             <Input placeholder="New York" />
           </Form.Item>
           <Form.Item name={['personalDetails', 'state']} label="State">
             <Input placeholder="NY" />
           </Form.Item>
           <Form.Item name={['personalDetails', 'zipCode']} label="Zip Code">
             <Input placeholder="10001" />
           </Form.Item>
            <Form.Item name={['personalDetails', 'nationality']} label="Nationality">
              <Input placeholder="American" />
            </Form.Item>
            
            <Form.Item name={['personalDetails', 'dob']} label="Date of Birth" rules={[{ required: true }]}>
              <DatePicker className="w-full" format="YYYY-MM-DD" />
            </Form.Item>

            <Form.Item name={['personalDetails', 'gender']} label="Gender" rules={[{ required: true }]}>
              <Select placeholder="Select Gender">
                <Option value="Male">Male</Option>
                <Option value="Female">Female</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>

            <Form.Item name={['personalDetails', 'experience']} label="Experience (Years)">
               <InputNumber min={0} max={50} className="w-full" />
            </Form.Item>
           <Form.Item name={['personalDetails', 'emergencyContact']} label="Emergency Contact">
             <Input placeholder="Name" />
           </Form.Item>
            <Form.Item name={['personalDetails', 'emergencyPhone']} label="Emergency Phone">
              <Input placeholder="+1..." />
            </Form.Item>
            <Form.Item name={['personalDetails', 'emergencyRelation']} label="Emergency Relation">
              <Input placeholder="Spouse, Parent, etc." />
            </Form.Item>
        </div>
      ),
    },
    {
      key: "bank",
      label: "Bank Details",
      children: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <Form.Item name={['bankDetails', 'accountHolderName']} label="Account Holder">
             <Input />
           </Form.Item>
           <Form.Item name={['bankDetails', 'bankName']} label="Bank Name">
             <Input />
           </Form.Item>
           <Form.Item name={['bankDetails', 'accountNumber']} label="Account Number">
             <Input />
           </Form.Item>
           <Form.Item name={['bankDetails', 'ifscCode']} label="IFSC / Routing">
             <Input />
           </Form.Item>
        </div>
      ),
    },
    {
       key: "documents",
       label: "Documents",
       children: (
         <div className="space-y-4">
            <Form.Item name="documents" valuePropName="fileList" getValueFromEvent={(e: any) => {
                if (Array.isArray(e)) return e;
                return e && e.fileList;
            }}>
              <Dragger name="files" multiple={true} action="" beforeUpload={() => false}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Click or drag file to this area to upload</p>
                <p className="ant-upload-hint">
                  Support for a single or bulk upload. Strict prohibit from uploading company data or other band files
                </p>
              </Dragger>
            </Form.Item>
         </div>
       )
    }
  ]

  return (
    <Modal
      title={employee ? "Edit Employee" : "New Employee Registration"}
      open={true}
      onCancel={onCancel}
      footer={null}
      width={800}
      centered
      className="employee-modal"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleFinish}
        className="flex flex-col h-[70vh]"
      >
        <div className="flex-1 overflow-y-auto px-1">
            <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={items}
            className="mb-6"
            />
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 bg-white z-10">
           <Button onClick={onCancel}>Cancel</Button>
           <Button type="primary" htmlType="submit">
             {employee ? "Update Employee" : "Register Employee"}
           </Button>
        </div>
      </Form>
    </Modal>
  )
}
