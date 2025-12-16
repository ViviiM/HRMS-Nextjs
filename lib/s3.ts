import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const AWS_REGION = process.env.AWS_REGION || "us-east-1";

export const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || "hrms-documents-bucket";

export async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // ACL: 'public-read' // Only if bucket allows public read, otherwise rely on pre-signed URLs or backend proxy
    });

    await s3Client.send(command);
    
    // Return Public URL (assuming bucket is public or CDN)
    return `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}
