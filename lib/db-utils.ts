import { PutCommand, QueryCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "./dynamodb";
import { getSalesforceConnection } from "./salesforce";
import { gzip } from "zlib";
import { promisify } from "util";

const gzipAsync = promisify(gzip);

// Constants
const MAX_CHUNK_SIZE = 350 * 1024; // 350KB

/**
 * Compresses and chunks data according to schema
 */
async function prepareChunks(pk: string, data: any) {
  const jsonString = JSON.stringify(data);
  const buffer = await gzipAsync(jsonString);
  const totalSize = buffer.length;
  
  if (totalSize <= MAX_CHUNK_SIZE) {
    // Single chunk logic could be different, but schema implies ALWAYS having METADATA + CHUNK(s)
    // or if small enough, maybe just METADATA? The schema example shows CHUNK#1 etc.
    // Let's stick to the schema: METADATA holding stats, CHUNK holding data.
    
    // Actually, schema said: "If total JSON > 350KB, split into chunks". 
    // If < 350KB, we can probably fit it in one item? 
    // DynamoDB item limit is 400KB.
    // Let's implement the generic chunking strategy.
    
    // For simplicity: Always create functionality to split buffer
  }

  const chunks = [];
  let offset = 0;
  let chunkIndex = 1;

  while (offset < totalSize) {
    const end = Math.min(offset + MAX_CHUNK_SIZE, totalSize);
    const chunkData = buffer.subarray(offset, end);
    
    chunks.push({
      PK: pk,
      SK: `CHUNK#${chunkIndex}`,
      data: chunkData,
      chunkSize: chunkData.length
    });
    
    offset = end;
    chunkIndex++;
  }

  const metadata = {
    PK: pk,
    SK: "METADATA",
    totalChunks: chunks.length,
    totalSize: totalSize,
    lastUpdated: Math.floor(Date.now() / 1000), // Unix timestamp
    version: "v1", // Logic for versioning can be added
  };

  return { metadata, chunks };
}

/**
 * Writes to DynamoDB (Cache)
 */
export async function writeToCache(pk: string, data: any, additionalIndexes: any = {}) {
  const { metadata, chunks } = await prepareChunks(pk, data);

  // Write Metadata
  // Include GSI attributes in Metadata or separate GSI items? 
  // Schema says GSI1PK, etc. These usually should be on the main item or all items if needed.
  // Best to put GSIs on the METADATA item if the access pattern is Query GSI -> Get Metadata -> Get Chunks
  
  const metadataItem = { ...metadata, ...additionalIndexes };

  // Write Metadata
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: metadataItem
  }));

  // Write Chunks (Batch if possible, but BatchWrite is limited to 25 items. Loop if many)
  // For standard usage, loop Promise.all
  const chunkPromises = chunks.map(chunk => 
    docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: chunk
    }))
  );

  await Promise.all(chunkPromises);
}

/**
 * Dual Write: Salesforce (Source) -> DynamoDB (Cache)
 */
export async function writeToSalesforceAndCache(
  objectName: string, 
  record: any, 
  pkPrefix: string,
  gsiData: any = {}
) {
  const conn = await getSalesforceConnection();
  
  // 1. Write to Salesforce
  const result = await conn.sobject(objectName).create(record);
  
  if (!result.success) {
    throw new Error(`Salesforce Create Failed: ${result.errors[0]}`);
  }

  const sfId = result.id;
  
  // 2. Fetch full record (to ensure we have all auto-generated fields like Auto Numbers, Formulas)
  // This is expensive but ensures consistency. 
  // Optimization: Select specific fields or everything.
  // 'SELECT FIELDS(ALL) FROM ...' is limited in SOQL. Better to select specific.
  // For now, let's just use the record we sent + ID + maybe fetch back if critical fields are missing.
  // Or just cache what we have + ID. 
  // "Every Salesforce write triggers DynamoDB update" - usually implies fetching the 'truth'.
  
  const fullRecord = await conn.sobject(objectName).retrieve(sfId);

  // 3. Write to Cache
  const pk = `${pkPrefix}#${sfId}`; // e.g. EMPLOYEE#EMP001 (If we use Salesforce ID as ID)
  // Note: Schema example used EMP001 which is the Auto Number. 
  // Retrieving the Auto Number (Employee_ID__c) is necessary if that is the PK.
  
  // Let's try to find the "Business ID" for the PK if possible.
  let cacheKeyId = sfId;
  if (pkPrefix === 'EMPLOYEE' && fullRecord.Employee_ID__c) {
    cacheKeyId = fullRecord.Employee_ID__c;
  }
  
  const pkValue = `${pkPrefix}#${cacheKeyId}`;

  await writeToCache(pkValue, fullRecord, gsiData);

  return { sfId, ...fullRecord };
}
