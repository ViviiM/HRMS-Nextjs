import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const AWS_REGION = process.env.AWS_REGION || "us-east-1";
export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || "hrms-documents-bucket";

export const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function uploadToS3(buffer: Buffer, originalName: string, folder: 'profileimages' | 'documents' | 'others' = 'others', contentType: string): Promise<{ url: string, key: string }> {
    const sanitizedFileName = originalName.replace(/\s+/g, '-').replace(/[^\w.-]/g, '');
    const uniqueFileName = `${uuidv4()}-${sanitizedFileName}`;
    const key = `${folder}/${uniqueFileName}`;

    const command = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key, // Removed duplicated folder prefix
        Body: buffer,
        ContentType: contentType,
    });

    try {
        await s3Client.send(command);
        // Return Public URL
        return { 
            url: `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`, 
            key 
        };
    } catch (error) {
        console.error(`S3 Upload Error for ${key}:`, error);
        throw new Error("Failed to upload file to S3");
    }
}
