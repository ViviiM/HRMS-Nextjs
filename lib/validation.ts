import { z } from 'zod';

export const BankDetailsSchema = z.object({
  Bank_Name__c: z.string().min(2),
  Bank_Branch_Name__c: z.string().optional(),
  Bank_Account_Number__c: z.string().min(6),
  IFSC__c: z.string().min(4),
  Primary_Account__c: z.boolean().optional(),
});

export const PayrollGenerateSchema = z.object({
  payrollMonth: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
  employeeIds: z.array(z.string()).nonempty(),
});

export const DocumentUploadSchema = z.object({
  fileBase64: z.string(),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  documentType: z.string().optional(),
  category: z.string().optional(),
});

export type BankDetailsInput = z.infer<typeof BankDetailsSchema>;
export type PayrollGenerateInput = z.infer<typeof PayrollGenerateSchema>;
export type DocumentUploadInput = z.infer<typeof DocumentUploadSchema>;
