import "dotenv/config";
import { S3Client, CreateBucketCommand, HeadBucketCommand, S3ServiceException } from "@aws-sdk/client-s3";

async function main() {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION ?? "us-east-1";
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

  if (!bucket) throw new Error("S3_BUCKET is not set");
  if (!accessKeyId || !secretAccessKey) throw new Error("S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required");

  const client = new S3Client({ region, endpoint, forcePathStyle, credentials: { accessKeyId, secretAccessKey } });

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`Bucket "${bucket}" already exists.`);
  } catch (error) {
    if (error instanceof S3ServiceException && (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404)) {
      console.log(`Bucket "${bucket}" not found. Creating...`);
      try {
        await client.send(new CreateBucketCommand({ Bucket: bucket }));
        console.log(`Bucket "${bucket}" created successfully.`);
      } catch (createError) {
        if (createError instanceof S3ServiceException && createError.name === "BucketAlreadyOwnedByYou") {
          console.log(`Bucket "${bucket}" already owned by you.`);
        } else {
          throw createError;
        }
      }
    } else {
      throw error;
    }
  }
}

main().catch((error) => {
  console.error("Failed to ensure bucket:", error);
  process.exit(1);
});
