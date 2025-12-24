import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getSalesforceConnection } from "@/lib/salesforce";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        employeeId: { label: "Employee ID", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.employeeId || !credentials?.password) {
          return null;
        }

        const employeeId = credentials.employeeId;
        const password = credentials.password;
        let employeeRecord: any = null;

        // 1. Check DynamoDB First
        try {
            const { getEmployeeFromDynamo, getEmployeeByEmailFromDynamo } = await import('@/lib/dynamo-integration');
            
            // Check if input is Email
            const isEmail = employeeId.includes('@');
            let cachedUser = null;

            if (isEmail) {
                cachedUser = await getEmployeeByEmailFromDynamo(employeeId);
            } else {
                cachedUser = await getEmployeeFromDynamo(employeeId);
            }
            
            if (cachedUser) {
                 // Check Password (encrypted vs decrypt -> compare)
                 const storedPwd = cachedUser.Password || cachedUser.Password__c;
                 const { decrypt } = await import('@/lib/crypto');
                 
                 let isValid = false;
                 try {
                     // Try to decrypt assuming it is encrypted
                     const decrypted = decrypt(storedPwd);
                     isValid = (decrypted === password);
                 } catch (e) {
                     // Fallback for legacy plain text passwords so old users don't get locked out
                     // or if decrypt fails for other reasons
                     isValid = (storedPwd === password);
                 }

                 if (isValid) {
                     const sfId = cachedUser.SfId || cachedUser.Id; // Check if we stored SF ID in Dynamo
                     
                     // If SF ID is missing in Dynamo (legacy records), we MUST fetch it from Salesforce
                     // because many writes depend on it (Leaves, etc.)
                     let resolvedSfId = sfId;
                     if (!resolvedSfId) {
                        try {
                             const conn = await getSalesforceConnection();
                             // Fetch by ID or Email depending on how we found user? No, if we have cachedUser we have Employee_ID__c ideally.
                             // cachedUser.UniqueId? cachedUser.EmployeeId
                             const empIdKey = cachedUser.EmployeeId || cachedUser.Employee_ID__c; // Use ID even if they logged in with email
                             const q = `SELECT Id FROM Employee__c WHERE Employee_ID__c = '${empIdKey}' ORDER BY CreatedDate DESC LIMIT 1`;
                             const res = await conn.query(q);
                             console.log("SF ID Fetch in Auth Result", res);
                             if (res.totalSize > 0) resolvedSfId = res.records[0].Id;
                        } catch(e) { console.error("SF ID Fetch in Auth failed", e);}
                     }

                     employeeRecord = {
                         Employee_ID__c: cachedUser.EmployeeId || cachedUser.Employee_ID__c,
                         Name: cachedUser.Name,
                         Company_Email__c: cachedUser.Email,
                         Role__c: cachedUser.Role,
                         Department__c: cachedUser.Department,
                         Status__c : cachedUser.Status__c,
                         Password__c: cachedUser.Password || cachedUser.Password__c,
                         Id: resolvedSfId  // Important: Populate Id so session.sfId works
                     };
                     console.log("Auth: DynamoDB Hit", employeeRecord);
                 } else {
                    console.log("Auth: DynamoDB Password Mismatch");
                 }
            }
        } catch (e) {
            console.error("Auth DynamoDB Check Failed:", e);
        }

        // 2. Fallback to Salesforce
        if (!employeeRecord) {
          try {
            const conn = await getSalesforceConnection();
            const isEmail = employeeId.includes('@');
            
            // Query by ID or Email
            const condition = isEmail 
                ? `Company_Email__c = '${employeeId}'` // Make sure to escape if needed
                : `Employee_ID__c = '${employeeId}'`;
            
            const q = `SELECT Id, Name, Employee_ID__c, Role__c, Status__c, Password__c, Company_Email__c, Is_Temp_Password__c FROM Employee__c WHERE ${condition} ORDER BY CreatedDate DESC LIMIT 1`;
            
            const result = await conn.query(q);
            if (result.totalSize > 0) {
              employeeRecord = result.records[0];
            }
          } catch (sfError) {
             console.error("Salesforce Auth Error:", sfError);
          }
        }

        if (!employeeRecord) {
          return null; // User not found
        }
        console.log(employeeRecord);
        // FRD Status check: 'Active', 'Intern', etc.
         const allowedStatuses = ['Active', 'Intern', 'On Notice'];
         if (!allowedStatuses.includes(employeeRecord.Status__c)) {
             throw new Error("Account is not active.");
         }

        // 3. Verify Password
        // Use Password__c (hash/encrypted)
        const passwordHash = employeeRecord.Password__c || employeeRecord.Password_Hash__c; // Fallback to old name if needed
        if (!passwordHash) return null;

        const { decrypt } = await import('@/lib/crypto');
        let isValid = false;
        try {
            const decrypted = decrypt(passwordHash);
            isValid = (decrypted === credentials.password);
        } catch (e) {
             // Fallback for plain text
             isValid = (passwordHash === credentials.password);
        }

        if (!isValid) {
             throw new Error("Email id or password is incorrect");
        }

        // 4. Return User
        // Map SF Role (Intern, Employee, Manager, HR, Admin, TL) to App Role
        return {
          id: employeeRecord.Employee_ID__c, 
          name: employeeRecord.Name, // SF Name field is usually standard
          email: employeeRecord.Company_Email__c,
          role: employeeRecord.Role__c,
          department: employeeRecord.Department__c || 'HR',
          isTemporaryPassword: employeeRecord.Is_Temp_Password__c,
          sfId: employeeRecord.Id
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role;
        token.department = user.department;
        token.employeeId = user.id;
        token.isTemporaryPassword = user.isTemporaryPassword;
        token.sfId = user.sfId;
        token.email = user.email; 
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.role = token.role;
        session.user.department = token.department;
        session.user.employeeId = token.employeeId;
        session.user.sfId = token.sfId;
        session.user.email = token.email; 
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  }
};
