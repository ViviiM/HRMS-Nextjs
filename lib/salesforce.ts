import jsforce from 'jsforce';

const {
  SALESFORCE_LOGIN_URL,
  SALESFORCE_USERNAME,
  SALESFORCE_PASSWORD,
  SALESFORCE_SECURITY_TOKEN,
} = process.env;

let conn: any = null;

export const getSalesforceConnection = async () => {
  if (conn) {
    return conn;
  }

  if (SALESFORCE_USERNAME && SALESFORCE_PASSWORD) {
    conn = new jsforce.Connection({
      loginUrl: SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
    });
    
    await conn.login(SALESFORCE_USERNAME, SALESFORCE_PASSWORD + (SALESFORCE_SECURITY_TOKEN || ''));
    return conn;
  }
  
  throw new Error("Salesforce credentials not found in environment variables.");
};

// ============================================
// SALESFORCE OBJECTS CONFIGURATION
// ============================================
export const SF_OBJECTS = {
  // Core Objects
  CONTACT: 'Contact',
  EMPLOYEE: 'Employee__c',
  
  // Employee Related
  BANK_DETAILS: 'Bank_Details__c',
  DOCUMENT: 'Document__c',
  
  // Leave Management
  LEAVE: 'Leave__c',
  LEAVE_BALANCE: 'Leave_Balance__c',
  
  // Financial
  PAYROLL: 'Payroll__c',
  PAYROLL_SUMMARY: 'Payroll_Summary__c',
  
  // Asset Management
  ASSET: 'Asset',
  ASSET_ASSIGNMENT: 'Asset_Assignment__c',
  
  // NDA & Templates
  NDA_TEMPLATE: 'NDA_Template__c',
  
  // Calendar & Holidays (Custom Metadata)
  HOLIDAY_CALENDAR: 'Holiday_Calendar__mdt',
  
  // Audit & Logging
  AUDIT_LOG: 'Audit_Log__c',
  
  // Notifications
  NOTIFICATION: 'Notification__c',
  HOLIDAY: 'Holiday__c'
} as const;

// ============================================
// ENUMS & CONSTANTS
// ============================================
export const LEAVE_TYPES = {
  CASUAL: 'Casual',
  SICK: 'Sick',
  EARNED: 'Earned',
  UNPAID: 'Unpaid'
} as const;

export const EMPLOYEE_STATUS = {
  INTERN: 'Intern',
  ACTIVE: 'Active',
  ON_NOTICE: 'On Notice',
  RESIGNED: 'Resign',
  TERMINATED: 'Fire'
} as const;

export const EMPLOYEE_ROLES = {
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
  TEAM_LEAD: 'TL',
  MANAGER: 'Manager',
  HR: 'HR',
  ADMIN: 'Admin'
} as const;

export const ASSET_STATUS = {
  AVAILABLE: 'Available',
  ASSIGNED: 'Assigned',
  IN_REPAIR: 'In Repair',
  UNDER_MAINTENANCE: 'Under Maintenance',
  LOST_STOLEN: 'Lost / Stolen',
  DISPOSED: 'Disposed'
} as const;

export const ASSET_CATEGORIES = {
  LAPTOP: 'Laptop',
  MOBILE: 'Mobile',
  HEADSET: 'Headset',
  MONITOR: 'Monitor',
  ID_CARD: 'ID Card',
  FURNITURE: 'Furniture',
  OTHER: 'Other'
} as const;

export const DOCUMENT_TYPES = {
  PERSONAL_DOCUMENTS: 'Personal Documents',
  NDA: 'NDA',
  HANDBOOK: 'Handbook',
  COMPANY_DOCUMENT: 'Company Document'
} as const;

export const DOCUMENT_CATEGORIES = {
  PAN: 'PAN',
  AADHAR: 'Aadhar',
  DL: 'DL',
  MARKSHEET: 'Marksheet',
  OFFER_LETTER: 'Offer Letter',
  NDA: 'NDA',
  HANDBOOK: 'Handbook'
} as const;

export const LEAVE_STATUS = {
  APPLIED: 'Applied',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  WITHDRAW: 'Withdraw'
} as const;

export const PAYROLL_STATUS = {
  GENERATED: 'Generated',
  PAID: 'Paid'
} as const;

export const ASSET_ASSIGNMENT_STATUS = {
  ASSIGNED: 'Assigned',
  RETURNED: 'Returned',
  LOST: 'Lost',
  DAMAGED: 'Damaged'
} as const;

export const DOCUMENT_STATUS = {
  UPLOADED: 'Uploaded',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected'
} as const;

export const DEPARTMENTS = {
  HR: 'HR',
  IT: 'IT',
  FINANCE: 'Finance',
  OPS: 'Ops'
} as const;

// ============================================
// TYPE INTERFACES
// ============================================

export interface SFContact {
  Id?: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Email_Verification_Status__c?: 'Verified' | 'Pending' | 'Unverified';
  Phone: string;
  Date_of_Birth__c: string;
  Gender__c: 'Male' | 'Female' | 'Other';
  MailingAddress?: string;
  MailingStreet?: string;
  MailingCity?: string;
  Emergency_Contact_Name__c: string;
  Emergency_Contact_Number__c: string;
  Emergency_Contact_Relation__c: string;
  Experience__c: number;
}

export interface SFEmployee {
  Id?: string;
  Employee_ID__c: string;
  Contact__c: string;
  Department__c: string;
  Role__c: string;
  Joining_Date__c: string;
  Leaving_Separation_Date__c?: string;
  Base_Salary__c?: number;
  CTC__c?: number;
  Status__c: string;
  Profile_Photo_URL__c?: string;
  Team_Lead__c?: string;
  Username__c?: string;
  Password__c?: string;
  Employee_Address__c?: string;
  Is_Temp_Password__c?: boolean;
  Name?: string;
  Company_Email__c?: string;
}

export interface SFBankDetails {
  Id?: string;
  Employee__c: string;
  Bank_Name__c: string;
  Bank_Branch_Name__c: string;
  Bank_Account_Number__c: string;
  IFSC__c: string;
  Primary_Account__c: boolean;
}

export interface SFDocument {
  Id?: string;
  Employee__c: string;
  Document_Type__c: string;
  Document_category__c: string;
  File_ID__c: string;
  File_URL__c: string;
  Status__c: string;
  Employee_Ids__c?: string;
  Display_To__c?: string[];
}

export interface SFLeave {
  Id?: string;
  Employee__c: string;
  Leave_Type__c: string;
  Start_Date__c: string;
  End_Date__c: string;
  Total_Days__c: number;
  Reason__c: string;
  Status__c: string;
  Approved_Date__c?: string;
  Cancel_Reason_HR__c?: string;
  Cancel_Reason_TL__c?: string;
  Sandwich__c: boolean;
  One_Plus_Two__c: boolean;
  TL_Approval__c: boolean;
  HR_Approval__c: boolean;
}

export interface SFLeaveBalance {
  Id?: string;
  Employee__c: string;
  Annual_Leave__c: number;
  Casual_Balance__c: number;
  Sick_Balance__c: number;
  Earned_Balance__c: number;
  Unpaid_Balance__c: number;
  Last_Reset_Date__c: string;
  Year__c: string;
}

export interface SFPayroll {
  Id?: string;
  Employee__c: string;
  Payroll_Month__c: string;
  Basic_Salary__c: number;
  Bonus__c: number;
  Net_Salary__c: number;
  Status__c: string;
  Payslip_URL__c?: string;
}

export interface SFPayrollSummary {
  Id?: string;
  Period_Type__c: string;
  Payroll_Month__c: string;
  Payroll_Year__c: number;
  Total_Employees__c: number;
  Total_Basic__c: number;
  Total_Bonus__c: number;
  Net_Total_Salary__c: number;
  Generated_Date__c: string;
  Generated_By__c: string;
}

export interface SFAsset {
  Id?: string;
  Name: string;
  Category__c: string;
  Serial_Number__c: string;
  Purchase_Date__c: string;
  Cost__c: number;
  Vendor__c?: string;
  Warranty_Expiry__c?: string;
  Status__c: string;
}

export interface SFAssetAssignment {
  Id?: string;
  Asset__c: string;
  Employee__c: string;
  Assignment_Date__c: string;
  Return_Date__c?: string;
  Status__c: string;
  Condition_At_Assignment__c: string;
  Returned_Condition__c?: string;
}

export interface SFHoliday {
  DeveloperName: string;
  Label: string;
  Holiday_Date__c: string;
  Holiday_Name__c: string;
  Year__c: number;
}

export interface SFNDATemplate {
  DeveloperName: string;
  Label: string;
  Template_Content__c: string;
}

export interface SFAuditLog {
  Id?: string;
  Action__c: string;
  Object_Type__c: string;
  Record_ID__c: string;
  Performed_By__c: string;
  Timestamp__c: string;
  Details__c: string;
  IP_Address__c?: string;
}

export interface SFNotification {
  Id?: string;
  User__c: string;
  Title__c: string;
  Message__c: string;
  Type__c: string;
  Is_Read__c: boolean;
  Created_At__c: string;
  Action_URL__c?: string;
  Related_Record_ID__c?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export async function createRecordInSalesforce(
  objectName: string,
  recordData: Record<string, any>
): Promise<{ id: string; success: boolean }> {
  const conn = await getSalesforceConnection();
  const result = await conn.create(objectName, recordData);
  return result;
}

export async function updateRecordInSalesforce(
  objectName: string,
  recordId: string,
  recordData: Record<string, any>
): Promise<{ success: boolean }> {
  const conn = await getSalesforceConnection();
  const result = await conn.update(objectName, recordId, recordData);
  return result;
}

export async function deleteRecordInSalesforce(
  objectName: string,
  recordId: string
): Promise<{ success: boolean }> {
  const conn = await getSalesforceConnection();
  const result = await conn.destroy(objectName, recordId);
  return result;
}

export async function queryRecords<T>(soql: string): Promise<T[]> {
  const conn = await getSalesforceConnection();
  const result = await conn.query(soql);
  return result.records as T[];
}

export async function querySingleRecord<T>(soql: string): Promise<T | null> {
  const records = await queryRecords<T>(soql);
  return records.length > 0 ? records[0] : null;
}

// ============================================
// SOQL QUERY BUILDERS
// ============================================

export function buildSOQLQuery(
  objectName: string,
  fields: string[],
  conditions?: string[],
  orderBy?: string,
  limit?: number
): string {
  let query = `SELECT ${fields.join(', ')} FROM ${objectName}`;
  
  if (conditions && conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  if (orderBy) {
    query += ` ORDER BY ${orderBy}`;
  }
  
  if (limit) {
    query += ` LIMIT ${limit}`;
  }
  
  return query;
}

export function escapeSOQL(value: string): string {
  return value.replace(/'/g, "\\'");
}

export async function executeCompositeRequest(
  subrequests: { method: string; url: string; referenceId: string; body?: any }[]
): Promise<any> {
  const conn = await getSalesforceConnection();
  
  // Construct the composite request body
  const requestBody = {
    allOrNone: false,
    compositeRequest: subrequests.map(req => ({
      method: req.method,
      url: req.url,
      referenceId: req.referenceId,
      body: req.body
    }))
  };

  // Use the generic request method since jsforce might not have a dedicated composite method exposed directly on Connection 
  // depending on version, or it's cleaner to use requestPost for custom endpoints.
  // The endpoint for composite is /services/data/vXX.X/composite
  // jsforce connection provides 'version' property.
  
  const apiVersion = conn.version || '58.0';
  const url = `/services/data/v${apiVersion}/composite`;
  
  const result = await conn.requestPost(url, requestBody);
  return result;
}
