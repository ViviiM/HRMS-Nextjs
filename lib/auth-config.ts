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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email;
        let employeeRecord: any = null;

        // 1. Try Cache (DynamoDB) First
        // try {
        //   const command = new QueryCommand({
        //     TableName: TABLE_NAME,
        //     IndexName: "GSI1", 
        //     KeyConditionExpression: "GSI1PK = :email AND GSI1SK = :sk",
        //     ExpressionAttributeValues: {
        //       ":email": email,
        //       ":sk": "EMPLOYEE"
        //     }
        //   });
          
        //   const response = await docClient.send(command);
        //   if (response.Items && response.Items.length > 0) {
        //     // Assume the main metadata item holds auth fields or it's a dedicated AUTH item
        //     // For now, if we don't have Password_Hash__c in cache (security risk if not handled well), fall back to SF.
        //     // Best practice: Store Auth info in a separate, simpler table or encrypted field.
        //     // Skipping detailed cache auth logic for safety in this iteration.
        //     // employeeRecord = response.Items[0]; 
        //   }
        // } catch (e) {
        //   console.warn("Cache miss or error:", e);
        // }

        // 2. Fallback / Source of Truth: Salesforce
        if (!employeeRecord) {
          try {
            const conn = await getSalesforceConnection();
            // Query fields matching FRD
            // Note: Use actual API names from FRD (e.g. Role__c, not Role__c if changed)
            const q = `SELECT Id, Name, Employee_ID__c, Role__c, Status__c, Password__c, Company_Email__c, Is_Temp_Password__c FROM Employee__c WHERE Company_Email__c = '${email}' LIMIT 1`;
            
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

        // FRD Status check: 'Active', 'Intern', etc.
         const allowedStatuses = ['Active', 'Intern', 'On Notice'];
         if (!allowedStatuses.includes(employeeRecord.Status__c)) {
             throw new Error("Account is not active.");
         }

        // 3. Verify Password
        // Use Password__c (hash)
        const passwordHash = employeeRecord.Password__c || employeeRecord.Password_Hash__c; // Fallback to old name if needed
        if (!passwordHash) return null;

        // const isValid = await bcrypt.compare(credentials.password, passwordHash);
        const isValid = passwordHash === credentials.password;
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
