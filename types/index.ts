// ============================================
// AUTHENTICATION & USER TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'HR' | 'Manager' | 'Employee' | 'Intern';
  department?: string;
  avatar?: string;
  lastLogin?: string;
}

// ============================================
// CONTACT OBJECT
// ============================================

export interface Contact {
  Id?: string;
  FirstName: string;
  LastName: string;
  Email: string;
  EmailVerificationStatus?: 'Verified' | 'Pending' | 'Unverified';
  Phone: string;
  DateOfBirth: string;
  Gender: 'Male' | 'Female' | 'Other';
  MailingAddress?: string;
  EmergencyContactName: string;
  EmergencyContactNumber: string;
  EmergencyContactRelation: string;
  Experience: number;
}

// ============================================
// EMPLOYEE OBJECT
// ============================================

export interface Employee {
  Id?: string;
  EmployeeId: string;
  ContactId: string;
  Contact?: Contact;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone: string;
  Department: 'HR' | 'IT' | 'Finance' | 'Ops' | string;
  Role: 'Intern' | 'Employee' | 'Manager' | 'HR' | 'Admin' | 'TL';
  JoiningDate: string;
  LeavingSeparationDate?: string;
  BaseSalary: number;
  CTC?: number;
  Status: 'Intern' | 'Active' | 'On Notice' | 'Resign' | 'Fire';
  ProfilePhotoUrl?: string;
  TeamLeadId?: string;
  Username?: string;
  BankDetails?: BankDetails;
  Documents?: Document[];
  EmergencyContacts?: EmergencyContact[];
  LeaveBalance?: LeaveBalance;
}

// Convenience / UI-friendly aliases (camelCase) for compatibility with existing components
export interface Employee {
  id: string; // alias for Id (UI expects `id` present)
  firstName: string; // alias for FirstName
  lastName: string; // alias for LastName
  email: string; // alias for Email
  phone: string; // alias for Phone
  department: Employee['Department'];
  role: Employee['Role'];
  joinDate: string; // alias for JoiningDate
  salary: number; // alias for BaseSalary
  baseSalary?: number; // UI uses baseSalary sometimes
  teamLeadId?: string;
  status: string; // allow lowercase/variants used in UI
  position?: string; // UI uses `position`
  bankDetails?: BankDetails; // camelCase alias
  documents?: Document[]; // camelCase alias
  personalDetails?: {
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    nationality?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
  };
}

// ============================================
// BANK DETAILS OBJECT
// ============================================

export interface BankDetails {
  Id?: string;
  EmployeeId: string;
  BankName: string;
  BankBranchName: string;
  BankAccountNumber: string;
  IFSC: string;
  PrimaryAccount: boolean;
}

// camelCase aliases
export interface BankDetails {
  id?: string;
  employeeId?: string;
  bankName?: string;
  bankBranchName?: string;
  bankAccountNumber?: string;
  ifsc?: string;
  primaryAccount?: boolean;
  // UI-friendly fields
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
}

// ============================================
// EMERGENCY CONTACT OBJECT
// ============================================

export interface EmergencyContact {
  Id?: string;
  EmployeeId: string;
  ContactName: string;
  Phone: string;
  Email?: string;
  Relationship: string;
  Address?: string;
}

// ============================================
// ============================================
// UI aliases for Leave
export interface Leave {
  id: string;
  employeeName?: string;
  leaveType?: Leave['LeaveType'];
  startDate: string;
  endDate: string;
  duration: number;
  reason?: string;
  status?: string;
}

// ============================================
// LEAVE BALANCE OBJECT
// (defined below with canonical and UI aliases)
// ============================================
// DOCUMENT OBJECT
// ============================================

export interface Document {
  Id?: string;
  EmployeeId: string;
  DocumentType: 'Personal Documents' | 'NDA' | 'Handbook' | 'Company Document';
  DocumentCategory: 'PAN' | 'Aadhar' | 'DL' | 'Marksheet' | 'Offer Letter' | 'NDA' | 'Handbook';
  FileId: string;
  FileUrl: string;
  Status: 'Uploaded' | 'Verified' | 'Rejected';
  EmployeeIds?: string;
  DisplayTo?: ('Intern' | 'TL' | 'Employee' | 'Manager' | 'HR' | 'Senior Employee')[];
  UploadDate?: string;
  ExpiryDate?: string;
}

// camelCase aliases
export interface Document {
  id?: string;
  employeeId?: string;
  documentType?: Document['DocumentType'];
  documentCategory?: Document['DocumentCategory'];
  fileId?: string;
  fileUrl?: string;
  status?: Document['Status'];
  uploadDate?: string;
  expiryDate?: string;
  // UI-friendly
  name?: string;
}

// ============================================
// LEAVE OBJECT
// ============================================

export interface Leave {
  Id?: string;
  EmployeeId: string;
  LeaveType: 'Casual' | 'Sick' | 'Earned' | 'Unpaid';
  StartDate: string;
  EndDate: string;
  TotalDays: number;
  Reason: string;
  Status: 'Applied' | 'Approved' | 'Rejected' | 'Cancelled' | 'Withdraw';
  ApprovedDate?: string;
  CancelReasonHR?: string;
  CancelReasonTL?: string;
  Sandwich: boolean;
  OnePlusTwo: boolean;
  TLApproval: boolean;
  HRApproval: boolean;
}

// ============================================
// LEAVE BALANCE OBJECT
// ============================================

export interface LeaveBalance {
  Id?: string;
  EmployeeId: string;
  AnnualLeave: number;
  CasualBalance: number;
  SickBalance: number;
  EarnedBalance: number;
  UnpaidBalance: number;
  LastResetDate: string;
  Year: string;
}

// Aliases for UI
export interface LeaveBalance {
  id?: string;
  employeeId?: string;
  Annual?: number;
  CasualLeave?: number; // alias for CasualBalance
  SickLeave?: number; // alias for SickBalance
  EarnedLeave?: number; // alias for EarnedBalance
  unpaidBalance?: number;
  LastUpdatedDate?: string;
}

// ============================================
// LEAVE POLICY OBJECT
// ============================================

export interface LeavePolicy {
  id: string;
  leaveType: 'Casual' | 'Sick' | 'Earned' | 'Unpaid';
  annualDays: number;
  carryForwardDays: number;
  minAdvanceNotice: number;
}

// ============================================
// PAYROLL OBJECT
// ============================================

export interface Payroll {
  Id?: string;
  EmployeeId: string;
  PayrollMonth: string;
  BasicSalary: number;
  Bonus: number;
  NetSalary: number;
  Status: 'Generated' | 'Paid';
  PayslipUrl?: string;
}

// camelCase aliases for Payroll
export interface Payroll {
  id: string;
  employeeId?: string;
  month?: string; // alias for PayrollMonth
  basicSalary?: number;
  bonus?: number;
  netSalary: number;
  status?: string;
  payslipUrl?: string;
  employeeName?: string; // convenience field used in UI
  paymentDate?: string;
  year?: string | number;
}

// ============================================
// PAYROLL SUMMARY OBJECT
// ============================================

export interface PayrollSummary {
  Id?: string;
  PeriodType: 'Month' | 'Year';
  PayrollMonth: string;
  PayrollYear: number;
  TotalEmployees: number;
  TotalBasic: number;
  TotalBonus: number;
  NetTotalSalary: number;
  GeneratedDate: string;
  GeneratedBy: string;
}

// ============================================
// ASSET OBJECT
// ============================================

export interface Asset {
  Id?: string;
  Name: string;
  Category: 'Laptop' | 'Mobile' | 'Headset' | 'Monitor' | 'ID Card' | 'Furniture' | 'Other';
  SerialNumber: string;
  PurchaseDate: string;
  Cost: number;
  Vendor?: string;
  WarrantyExpiry?: string;
  Status: 'Available' | 'Assigned' | 'In Repair' | 'Under Maintenance' | 'Lost / Stolen' | 'Disposed';
}

// camelCase aliases for Asset
export interface Asset {
  id: string;
  name?: string;
  type?: Asset['Category'];
  purchaseDate?: string;
  currentValue: number;
  status?: string;
}

// ============================================
// ASSET ASSIGNMENT OBJECT
// ============================================

export interface AssetAssignment {
  Id?: string;
  AssetId: string;
  EmployeeId: string;
  AssignmentDate: string;
  ReturnDate?: string;
  Status: 'Assigned' | 'Returned' | 'Lost' | 'Damaged';
  ConditionAtAssignment: 'New' | 'Good' | 'Fair' | 'Poor';
  ReturnedCondition?: 'New' | 'Good' | 'Fair' | 'Poor' | 'Lost' | 'Damaged';
}

// ============================================
// HOLIDAY CALENDAR (CUSTOM METADATA)
// ============================================

export interface Holiday {
  DeveloperName: string;
  Label: string;
  HolidayDate: string;
  HolidayName: string;
  Year: number;
}

// ============================================
// NDA TEMPLATE (STORED AS VF PAGES)
// ============================================

export interface NDATemplate {
  DeveloperName?: string;
  Label?: string;
  TemplateContent?: string;
}

// UI-friendly NDA template fields
export interface NDATemplate {
  id?: string;
  status?: string;
  employeeName?: string;
  employeeId?: string;
  templateId?: string;
  signDate?: string;
  expiryDate?: string;
  [key: string]: any;
}

// ============================================
// AUDIT LOG OBJECT
// ============================================

export interface AuditLog {
  Id?: string;
  Action: string;
  ObjectType: string;
  RecordId: string;
  PerformedBy: string;
  Timestamp: string;
  Details: string;
  IPAddress?: string;
}

// ============================================
// NOTIFICATION OBJECT
// ============================================

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'Info' | 'Success' | 'Warning' | 'Error';
  read: boolean;
  timestamp: string;
  action?: {
    label: string;
    url: string;
  };
}

// ============================================
// TRAINING OBJECT (If Needed)
// ============================================

export interface Training {
  id: string;
  title: string;
  description: string;
  category: string;
  instructor: string;
  startDate: string;
  endDate: string;
  duration: number;
  maxParticipants: number;
  enrolledCount: number;
  status: 'scheduled' | 'ongoing' | 'completed';
}

export interface TrainingEnrollment {
  id: string;
  trainingId: string;
  employeeId: string;
  enrollmentDate: string;
  completionDate?: string;
  score?: number;
  certificateUrl?: string;
  status: 'enrolled' | 'completed' | 'dropped';
}

// Backwards-compatible type aliases used by UI components
export type LeaveRequest = Leave;
export type NDA = NDATemplate;

// ============================================
// CALENDAR EVENT OBJECT
// ============================================

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  eventType: 'Meeting' | 'Training' | 'Leave' | 'Holiday' | 'Deadline';
  category?: string;
  attendees?: string[];
}

// ============================================
// DASHBOARD STATISTICS
// ============================================

export interface DashboardStats {
  totalEmployees: number;
  activeLeaves: number;
  pendingApprovals: number;
  completedTraining: number;
  totalAssets: number;
  assignedAssets: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// FORM REQUEST TYPES
// ============================================

export interface EmployeeRegistrationRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  currentAddress: string;
  permanentAddress: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  experience: number;
  role: 'Intern' | 'Employee';
  department?: string;
  resume?: File;
  profilePhoto?: File;
}

export interface EmployeeUpdateRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  role?: string;
  status?: string;
  baseSalary?: number;
  ctc?: number;
}

export interface BankDetailsRequest {
  bankName: string;
  bankBranchName: string;
  bankAccountNumber: string;
  ifsc: string;
  primaryAccount: boolean;
}

export interface LeaveApplicationRequest {
  leaveType: 'Casual' | 'Sick' | 'Earned' | 'Unpaid';
  startDate: string;
  endDate: string;
  reason: string;
  sandwich?: boolean;
  onePlusTwo?: boolean;
}

export interface PayrollGenerationRequest {
  payrollMonth: string;
  employees: string[];
}

export interface AssetAssignmentRequest {
  assetId: string;
  employeeId: string;
  conditionAtAssignment: 'New' | 'Good' | 'Fair' | 'Poor';
}

// ============================================
// FILTER & SEARCH TYPES
// ============================================

export interface EmployeeFilters {
  department?: string;
  status?: string;
  role?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface LeaveFilters {
  status?: string;
  leaveType?: string;
  department?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AssetFilters {
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}
