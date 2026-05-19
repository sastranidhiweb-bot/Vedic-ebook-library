import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { getBookStorageProvider, getBooksUploadDir, getBooksDeletedDir } from './storagePaths.js';

let cachedBucket = null;

function getObjectKey(filename) {
  const prefix = (process.env.BOOKS_OBJECT_PREFIX || 'books').replace(/^\/+|\/+$/g, '');
  return `${prefix}/${filename}`;
}

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function getStratusBucket() {
  if (cachedBucket) return cachedBucket;

  const bucketName = process.env.STRATUS_BUCKET_NAME || process.env.CATALYST_STRATUS_BUCKET;
  if (!bucketName) {
    throw new Error('STRATUS_BUCKET_NAME is required when BOOK_STORAGE_PROVIDER=catalyst');
  }

  let catalystSdk;
  try {
    catalystSdk = (await import('zcatalyst-sdk-node')).default;
  } catch (err) {
    throw new Error('zcatalyst-sdk-node is not installed. Run npm install in backend.');
  }

  let app;
  try {
    if (process.env.CATALYST_CONFIG) {
      app = catalystSdk.initializeApp();
    } else {
      app = catalystSdk.initializeApp({
        project_id: process.env.CATALYST_PROJECT_ID,
        project_key: process.env.CATALYST_PROJECT_KEY,
        environment: process.env.CATALYST_ENVIRONMENT || 'Development',
      });
    }
  } catch (err) {
    throw new Error(`Failed to initialize Catalyst SDK: ${err.message}`);
  }

  cachedBucket = app.stratus().bucket(bucketName);
  return cachedBucket;
}

export function getLocalBookPath(filename) {
  return path.join(getBooksUploadDir(), filename);
}

export function getLocalDeletedBookPath(filename) {
  return path.join(getBooksDeletedDir(), filename);
}

export async function saveBookFile(filename, fileBuffer, mimeType = 'application/octet-stream') {
  const provider = getBookStorageProvider();
  if (provider === 'local') {
    const uploadDir = getBooksUploadDir();
    ensureDirSync(uploadDir);
    const filePath = path.join(uploadDir, filename);
    await fsp.writeFile(filePath, fileBuffer);
    return;
  }

  const bucket = await getStratusBucket();
  const objectKey = getObjectKey(filename);
  const uploaded = await bucket.putObject(objectKey, fileBuffer, {
    overwrite: true,
    contentType: mimeType,
  });
  if (!uploaded) {
    throw new Error(`Failed to upload object to Stratus: ${objectKey}`);
  }
}

export async function getBookReadStream(filename) {
  const provider = getBookStorageProvider();
  if (provider === 'local') {
    const filePath = getLocalBookPath(filename);
    if (!fs.existsSync(filePath)) {
      throw new Error('Book file not found');
    }
    return fs.createReadStream(filePath);
  }

  const bucket = await getStratusBucket();
  const objectKey = getObjectKey(filename);
  return await bucket.getObject(objectKey);
}

export async function ensureLocalBookFile(filename) {
  const provider = getBookStorageProvider();
  const localPath = getLocalBookPath(filename);

  if (provider === 'local') {
    if (!fs.existsSync(localPath)) {
      throw new Error(`Book file not found at ${localPath}`);
    }
    return localPath;
  }

  ensureDirSync(getBooksUploadDir());
  if (fs.existsSync(localPath)) {
    return localPath;
  }

  const bucket = await getStratusBucket();
  const objectKey = getObjectKey(filename);
  const objectStream = await bucket.getObject(objectKey);

  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(localPath);
    objectStream.pipe(writer);
    objectStream.on('error', reject);
    writer.on('error', reject);
    writer.on('finish', resolve);
  });

  return localPath;
}

export async function deleteBookFile(filename) {
  const provider = getBookStorageProvider();

  const localUploadPath = getLocalBookPath(filename);
  if (fs.existsSync(localUploadPath)) {
    try {
      await fsp.unlink(localUploadPath);
    } catch {}
  }

  const localDeletedPath = getLocalDeletedBookPath(filename);
  if (fs.existsSync(localDeletedPath)) {
    try {
      await fsp.unlink(localDeletedPath);
    } catch {}
  }

  if (provider === 'catalyst') {
    const bucket = await getStratusBucket();
    const objectKey = getObjectKey(filename);
    try {
      await bucket.deleteObject(objectKey);
    } catch {}
  }
}

export async function checkBookStorageHealth() {
  const provider = getBookStorageProvider();

  try {
    if (provider === 'local') {
      const uploadDir = getBooksUploadDir();
      const deletedDir = getBooksDeletedDir();
      ensureDirSync(uploadDir);
      ensureDirSync(deletedDir);
      return {
        ok: true,
        provider,
        details: {
          uploadDir,
          deletedDir,
        },
      };
    }

    const bucket = await getStratusBucket();
    const bucketDetails = await bucket.getDetails();
    return {
      ok: true,
      provider,
      details: {
        bucketName: bucketDetails.bucket_name || process.env.CATALYST_STRATUS_BUCKET,
      },
    };
  } catch (err) {
    return {
      ok: false,
      provider,
      error: err.message,
    };
  }
}

export function streamToResponse(stream, res) {
  if (stream instanceof Readable) {
    stream.pipe(res);
    return;
  }
  throw new Error('Invalid stream returned from storage provider');
}
