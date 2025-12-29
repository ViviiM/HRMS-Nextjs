import { PutCommand, QueryCommand, UpdateCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb, DYNAMO_TABLE_NAME } from "./dynamodb";

// ============================================
// DYNAMODB SCHEMA HELPERS
// ============================================

export const DYNAMO_KEYS = {
  EMPLOYEE: (empId: string) => ({
    pk: `EMP#${empId}`,
    sk: `METADATA#${empId}`
  }),
  BANK_DETAILS: (empId: string) => ({
    pk: `EMP#${empId}`,
    sk: `BANK#DETAILS`
  }),
  DOCUMENT: (empId: string, docType: string, docId: string) => ({
    pk: `EMP#${empId}`,
    sk: `DOC#${docType}#${docId}`
  }),
  LEAVE_BALANCE: (empId: string, year: string) => ({
    pk: `EMP#${empId}`,
    sk: `LEAVE_BAL#${year}`
  }),
  LEAVE_REQUEST: (empId: string, startDate: string, id: string) => ({
    pk: `EMP#${empId}`,
    sk: `LEAVE#${startDate}#${id}`
  }),
  PAYROLL: (empId: string, year: string, month: string) => ({
    pk: `EMP#${empId}`,
    sk: `PAYROLL#${year}#${month}`
  }),
  NOTIFICATION: (empId: string, id: string) => ({
    pk: `EMP#${empId}`,
    sk: `NOTIF#${id}`
  })
};

// ============================================
// DYNAMODB OPERATIONS
// ============================================

export async function createEmployeeInDynamo(employeeData: any) {
  const { pk, sk } = DYNAMO_KEYS.EMPLOYEE(employeeData.EmployeeId);
  const email = employeeData.Email || employeeData.Company_Email__c;
  
  const item = {
    Employee_Id: pk,
    SortKey: sk,
    EntityType: 'Employee',
    // GSI Keys: For fetching ALL employees efficiently
    GSI_PK: 'ENTITY#EMPLOYEE', 
    GSI_SK: pk, 
    ...employeeData,
    CreatedAt: new Date().toISOString()
  };

  try {
    // 1. Write Main Record
    await dynamoDb.send(new PutCommand({
      TableName: DYNAMO_TABLE_NAME,
      Item: item
    }));
    
    // 2. Write Email Lookup Record (if email exists)
    // allowing fast lookup by email via Generic GSI
    if (email) {
        const lookupItem = {
            Employee_Id: pk,
            SortKey: `LOOKUP#EMAIL`,
            GSI_PK: `EMAIL#${email}`,
            GSI_SK: pk, // Store Reference
            EntityType: 'Email Lookup',
            ReferenceId: employeeData.EmployeeId
        };
        await dynamoDb.send(new PutCommand({
            TableName: DYNAMO_TABLE_NAME,
            Item: lookupItem
        }));
    }

    return { success: true };
  } catch (error) {
    console.error("DynamoDB Create Employee Error:", error);
    throw new Error(`DynamoDB Create Failed: ${(error as Error).message}`);
  }
}

// QUERY HELPER (Uses GSI to Query all Employees instead of Scan)
export async function getAllEmployeesFromDynamo() {
    try {
        const result = await dynamoDb.send(new QueryCommand({
            TableName: DYNAMO_TABLE_NAME,
            IndexName: 'GSI', // Name of the Global Secondary Index
            KeyConditionExpression: "GSI_PK = :pk",
            ExpressionAttributeValues: {
                ":pk": "ENTITY#EMPLOYEE"
            }
        }));
        return result.Items || [];
    } catch (error) {
        console.error("DynamoDB Query Employees (GSI) Error:", error);
        // Fallback to Scan if Index doesn't exist yet or fails, to keep app running
        // Or rethrow. Let's fallback to scan for robustness during migration.
        try {
             console.log("Fallback to Scan...");
             const { ScanCommand } = await import("@aws-sdk/lib-dynamodb");
             const scanResult = await dynamoDb.send(new ScanCommand({
                 TableName: DYNAMO_TABLE_NAME,
                 FilterExpression: "EntityType = :etype",
                 ExpressionAttributeValues: { ":etype": "Employee" }
             }));
             return scanResult.Items || [];
        } catch(scanErr) {
             throw scanErr;
        }
    }
}

export async function createLeaveBalanceInDynamo(empId: string, year: string, balanceData: any) {
  const { pk, sk } = DYNAMO_KEYS.LEAVE_BALANCE(empId, year);
  
  const item = {
    Employee_Id: pk,
    SortKey: sk,
    EntityType: 'Leave Balance',
    ...balanceData,
    CreatedAt: new Date().toISOString()
  };

  try {
    await dynamoDb.send(new PutCommand({
      TableName: DYNAMO_TABLE_NAME,
      Item: item
    }));
    return { success: true };
  } catch (error) {
    console.error("DynamoDB Create Leave Balance Error:", error);
    throw new Error(`DynamoDB Leave Balance Failed: ${(error as Error).message}`);
  }
}

export async function getEmployeeFromDynamo(empId: string) {
  const { pk, sk } = DYNAMO_KEYS.EMPLOYEE(empId);
  try {
    const result = await dynamoDb.send(new QueryCommand({
      TableName: DYNAMO_TABLE_NAME,
      KeyConditionExpression: "Employee_Id = :pk AND SortKey = :sk",
      ExpressionAttributeValues: {
        ":pk": pk,
        ":sk": sk
      }
    }));
    return result.Items?.[0] || null;
  } catch (error) {
    console.error("DynamoDB Get Employee Error:", error);
    return null;
  }
}

export async function getEmployeeByEmailFromDynamo(email: string) {
    try {
        // Query GSI for the Email Lookup Item
        const result = await dynamoDb.send(new QueryCommand({
            TableName: DYNAMO_TABLE_NAME,
            IndexName: 'GSI',
            KeyConditionExpression: "GSI_PK = :pk",
            ExpressionAttributeValues: {
                ":pk": `EMAIL#${email}`
            }
        }));

        if (result.Items && result.Items.length > 0) {
            const lookup = result.Items[0];
            // If we stored the whole object in lookup, return it.
            // But we only stored reference. Now fetch the actual employee.
            if (lookup.ReferenceId) {
                return await getEmployeeFromDynamo(lookup.ReferenceId);
            }
        }
        return null;
    } catch (error) {
        console.error("DynamoDB Get Employee By Email Error:", error);
        return null;
    }
}

export async function updateEmployeeInDynamo(empId: string, updateData: any) {
  const { pk, sk } = DYNAMO_KEYS.EMPLOYEE(empId);
  
  // Clean updateData
  const validKeys = Object.keys(updateData).filter(k => updateData[k] !== undefined);
  if (validKeys.length === 0) return { success: true }; 

  const updateExpression = "SET " + validKeys.map((k, i) => `#${k} = :${k}`).join(", ");
  const expressionAttributeNames = validKeys.reduce((acc, k) => ({ ...acc, [`#${k}`]: k }), {});
  const expressionAttributeValues = validKeys.reduce((acc, k) => ({ ...acc, [`:${k}`]: updateData[k] }), {});

  try {
    await dynamoDb.send(new UpdateCommand({
      TableName: DYNAMO_TABLE_NAME,
      Key: {
        Employee_Id: pk,
        SortKey: sk
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
    }));
    return { success: true };
  } catch (error) {
    console.error("DynamoDB Update Error:", error);
    throw new Error(`DynamoDB Update Failed: ${(error as Error).message}`);
  }
}

// BANK DETAILS HELPERS

export async function getBankDetailsFromDynamo(empId: string) {
  const { pk, sk } = DYNAMO_KEYS.BANK_DETAILS(empId);
  try {
    const result = await dynamoDb.send(new QueryCommand({
      TableName: DYNAMO_TABLE_NAME,
      KeyConditionExpression: "Employee_Id = :pk AND SortKey = :sk",
      ExpressionAttributeValues: {
        ":pk": pk,
        ":sk": sk
      }
    }));
    return result.Items?.[0] || null;
  } catch (error) {
    console.error("DynamoDB Get Bank Error:", error);
    return null;
  }
}

export async function updateBankDetailsInDynamo(empId: string, bankData: any) {
    const { pk, sk } = DYNAMO_KEYS.BANK_DETAILS(empId);
    
    // We can just use PutCommand to overwrite/upsert for simplicity, or Update
    const item = {
        Employee_Id: pk,
        SortKey: sk,
        EntityType: 'Bank Details',
        ...bankData,
        UpdatedAt: new Date().toISOString()
    };

    try {
        await dynamoDb.send(new PutCommand({
            TableName: DYNAMO_TABLE_NAME,
            Item: item
        }));
        return { success: true };
    } catch (error) {
        console.error("DynamoDB Bank Update Error:", error);
        throw new Error("Failed to update bank details in DynamoDB");
    }
}



export async function createLeaveRequestInDynamo(leaveData: any) {
    // Expected leaveData to have EmployeeId, StartDate, Id (SF ID ideally or UUID)
    const { pk, sk } = DYNAMO_KEYS.LEAVE_REQUEST(leaveData.EmployeeId, leaveData.StartDate, leaveData.Id);
    
    const item = {
        Employee_Id: pk,
        SortKey: sk,
        EntityType: 'Leave Request',
        ...leaveData,
        CreatedAt: new Date().toISOString()
    };

    try {
        await dynamoDb.send(new PutCommand({
            TableName: DYNAMO_TABLE_NAME,
            Item: item
        }));
        return { success: true };
    } catch (error) {
         console.error("DynamoDB Create Leave Error:", error);
         // Don't throw for now to prevent blocking main flow if Dynamo fails but SF succeeded
         return { success: false, error };
    }
}

export async function updateLeaveStatusInDynamo(leaveData: { EmployeeId: string, StartDate: string, Id: string, Status: string, CancelReason?: string }) {
    const { pk, sk } = DYNAMO_KEYS.LEAVE_REQUEST(leaveData.EmployeeId, leaveData.StartDate, leaveData.Id);
    
    const updateExpression = "SET #status = :status" + (leaveData.CancelReason ? ", #reason = :reason" : "");
    const expressionAttributeNames: any = { "#status": "Status" };
    const expressionAttributeValues: any = { ":status": leaveData.Status };
    
    if (leaveData.CancelReason) {
        expressionAttributeNames["#reason"] = "CancelReason";
        expressionAttributeValues[":reason"] = leaveData.CancelReason;
    }

    try {
        await dynamoDb.send(new UpdateCommand({
            TableName: DYNAMO_TABLE_NAME,
            Key: {
                Employee_Id: pk,
                SortKey: sk
            },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues
        }));
        return { success: true };
    } catch (error) {
        console.error("DynamoDB Update Leave Status Error:", error);
        return { success: false, error }; // Don't crash
    }
}



export async function createNotificationInDynamo(notificationData: any) {
    const { pk, sk } = DYNAMO_KEYS.NOTIFICATION(notificationData.EmployeeId, notificationData.Id);
    
    // Default GSI for IsRead? Maybe overkill unless we query *only* unread.
    // Client filtering is fine for < 100 notifications.
    
    const item = {
        Employee_Id: pk,
        SortKey: sk,
        EntityType: 'Notification',
        ...notificationData,
        CreatedAt: new Date().toISOString()
    };

    try {
        await dynamoDb.send(new PutCommand({
            TableName: DYNAMO_TABLE_NAME,
            Item: item
        }));
        return { success: true };
    } catch (error) {
        console.error("DynamoDB Create Notification Error:", error);
        return { success: false, error };
    }
}

export async function getNotificationsFromDynamo(empId: string) {
    const pk = `EMP#${empId}`;
    try {
        const result = await dynamoDb.send(new QueryCommand({
            TableName: DYNAMO_TABLE_NAME,
            KeyConditionExpression: "Employee_Id = :pk AND begins_with(SortKey, :sk)",
            ExpressionAttributeValues: {
                ":pk": pk,
                ":sk": "NOTIF#"
            },
            ScanIndexForward: false // Newest first
        }));
        return result.Items || [];
    } catch (error) {
        console.error("DynamoDB Get Notifications Error:", error);
        return null; // Return null to signal error/fallback needed
    }
}

export async function updateNotificationInDynamo(empId: string, notifId: string, updates: any) {
    const { pk, sk } = DYNAMO_KEYS.NOTIFICATION(empId, notifId);
    
    const validKeys = Object.keys(updates).filter(k => updates[k] !== undefined);
    if (validKeys.length === 0) return { success: true }; 

    const updateExpression = "SET " + validKeys.map((k, i) => `#${k} = :${k}`).join(", ");
    const expressionAttributeNames = validKeys.reduce((acc, k) => ({ ...acc, [`#${k}`]: k }), {});
    const expressionAttributeValues = validKeys.reduce((acc, k) => ({ ...acc, [`:${k}`]: updates[k] }), {});

    try {
        await dynamoDb.send(new UpdateCommand({
            TableName: DYNAMO_TABLE_NAME,
            Key: {
                Employee_Id: pk,
                SortKey: sk
            },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues
        }));
        return { success: true };
    } catch (error) {
         console.error("DynamoDB Update Notification Error:", error);
         throw error;
    }
}

export async function batchCreateNotificationsInDynamo(notifications: any[]) {
    if (notifications.length === 0) return { success: true };

    // Helper to chunk array
    const chunkArray = (arr: any[], size: number) => {
        const result = [];
        for (let i = 0; i < arr.length; i += size) {
            result.push(arr.slice(i, i + size));
        }
        return result;
    };

    const batches = chunkArray(notifications, 25);
    
    try {
        const promises = batches.map(batch => {
            const requestItems = batch.map(n => {
                const { pk, sk } = DYNAMO_KEYS.NOTIFICATION(n.EmployeeId, n.Id);
                return {
                    PutRequest: {
                        Item: {
                            Employee_Id: pk,
                            SortKey: sk,
                            EntityType: 'Notification',
                            ...n,
                            CreatedAt: new Date().toISOString()
                        }
                    }
                };
            });

            return dynamoDb.send(new BatchWriteCommand({
                RequestItems: {
                    [DYNAMO_TABLE_NAME]: requestItems
                }
            }));
        });

        await Promise.all(promises);
        return { success: true };
    } catch (error) {
        console.error("DynamoDB Batch Write Error:", error);
        return { success: false, error };
    }
}
