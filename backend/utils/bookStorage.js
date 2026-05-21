import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { getBookStorageProvider, getBooksUploadDir, getBooksDeletedDir } from './storagePaths.js';

let cachedBucket = null;
const downloadLocks = new Map();

function getObjectKey(filename) {
  const prefix = (process.env.BOOKS_OBJECT_PREFIX || 'books').replace(/^\/+|\/+$/g, '');
  return `${prefix}/${filename}`;
}

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function withDownloadLock(key, task) {
  if (downloadLocks.has(key)) {
    return downloadLocks.get(key);
  }

  const pending = (async () => {
    try {
      return await task();
    } finally {
      downloadLocks.delete(key);
    }
  })();

  downloadLocks.set(key, pending);
  return pending;
}

function isReadableStream(value) {
  return value && typeof value.pipe === 'function';
}

function isStratusNotFoundError(error) {
  const code = String(error?.code || '').toLowerCase();
  const statusCode = Number(error?.statusCode || error?.status || 0);
  const message = String(error?.message || '').toLowerCase();
  return (
    code === 'notfound' ||
    statusCode === 404 ||
    message.includes('not found') ||
    message.includes('no such key')
  );
}

async function responseToBuffer(value) {
  if (!value) {
    throw new Error('Empty object response from Stratus');
  }

  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (typeof value === 'string') {
    return Buffer.from(value);
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }

  if (value instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(value));
  }

  if (isReadableStream(value)) {
    return await new Promise((resolve, reject) => {
      const chunks = [];
      value.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      value.on('error', reject);
      value.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  if (value && typeof value === 'object' && value.body) {
    return await responseToBuffer(value.body);
  }

  throw new Error(`Unsupported Stratus object response type: ${typeof value}`);
}

function buildCatalystInitOptions() {
  const configRaw = process.env.CATALYST_CONFIG;
  if (configRaw) {
    try {
      const parsed = JSON.parse(configRaw);
      const normalized = {
        project_id: parsed.project_id || parsed.projectId,
        project_key: parsed.project_key || parsed.projectKey,
        environment: parsed.environment || parsed.env || process.env.CATALYST_ENVIRONMENT,
        project_domain: parsed.project_domain || parsed.projectDomain,
        project_secret_key: parsed.project_secret_key || parsed.projectSecretKey,
      };

      if (normalized.project_id && normalized.project_key) {
        return normalized;
      }
    } catch {
      // Let SDK handle path-based CATALYST_CONFIG or fallback to explicit vars.
    }
  }

  const projectId =
    process.env.CATALYST_PROJECT_ID ||
    process.env.CATALYST_PROJECTID ||
    process.env.PROJECT_ID;

  const projectKey =
    process.env.CATALYST_PROJECT_KEY ||
    process.env.CATALYST_PROJECTKEY ||
    process.env.PROJECT_KEY;

  if (!projectId || !projectKey) {
    return null;
  }

  return {
    project_id: projectId,
    project_key: projectKey,
    environment: process.env.CATALYST_ENVIRONMENT || process.env.NODE_ENV || 'Development',
    project_domain: process.env.CATALYST_PROJECT_DOMAIN,
    project_secret_key: process.env.CATALYST_PROJECT_SECRET_KEY,
  };
}

async function getStratusBucket(requestContext = null) {
  if (cachedBucket) return cachedBucket;

  const bucketNameRaw =
    process.env.BOOKS_BUCKET_NAME ||
    process.env.STRATUS_BUCKET_NAME ||
    process.env.CATALYST_STRATUS_BUCKET;
  const bucketName = bucketNameRaw ? String(bucketNameRaw).trim() : '';
  if (!bucketName) {
    throw new Error(
      'BOOKS_BUCKET_NAME (or STRATUS_BUCKET_NAME/CATALYST_STRATUS_BUCKET) is required when BOOK_STORAGE_PROVIDER=catalyst'
    );
  }

  let catalystSdk;
  try {
    catalystSdk = (await import('zcatalyst-sdk-node')).default;
  } catch (err) {
    throw new Error('zcatalyst-sdk-node is not installed. Run npm install in backend.');
  }

  let app;
  if (requestContext && typeof catalystSdk.initialize === 'function') {
    try {
      app = catalystSdk.initialize(requestContext);
    } catch {
      // Fallback to initializeApp paths below.
    }
  }

  const explicitOptions = buildCatalystInitOptions();
  let initError;

  if (!app && explicitOptions) {
    try {
      app = catalystSdk.initializeApp(explicitOptions);
    } catch (err) {
      initError = err;
    }
  }

  if (!app) {
    try {
      // CATALYST_CONFIG-driven bootstrap
      app = catalystSdk.initializeApp();
    } catch (err) {
      if (initError) {
        throw new Error(
          `Failed to initialize Catalyst SDK. Explicit init error: ${initError.message}. Default init error: ${err.message}`
        );
      }
      throw new Error(`Failed to initialize Catalyst SDK: ${err.message}`);
    }
  }

  if (!app || typeof app.stratus !== 'function') {
    throw new Error('Catalyst app initialized but Stratus service is unavailable in current runtime');
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

export async function saveBookFile(filename, fileBuffer, mimeType = 'application/octet-stream', requestContext = null) {

  const provider = getBookStorageProvider();
  if (provider === 'local') {
    const uploadDir = getBooksUploadDir();
    ensureDirSync(uploadDir);
    const filePath = path.join(uploadDir, filename);
    await fsp.writeFile(filePath, fileBuffer);
    return;
  }

  const bucket = await getStratusBucket(requestContext);
  const objectKey = getObjectKey(filename);
  let uploaded;
  try {
    uploaded = await bucket.putObject(objectKey, fileBuffer, {
      overwrite: true,
      contentType: mimeType,
    });
  } catch (bufferError) {
    // Some SDK/runtime combinations prefer stream upload instead of Buffer.
    const bufferStream = Readable.from(fileBuffer);
    uploaded = await bucket.putObject(objectKey, bufferStream, {
      overwrite: true,
      contentType: mimeType,
    });
    if (!uploaded) {
      throw new Error(`Failed to upload object to Stratus: ${objectKey}. Buffer error: ${bufferError.message}`);
    }
  }

  if (!uploaded) {
    throw new Error(`Failed to upload object to Stratus: ${objectKey}`);
  }
}

export async function getBookReadStream(filename, requestContext = null) {

  const provider = getBookStorageProvider();
  if (provider === 'local') {
    const filePath = getLocalBookPath(filename);
    if (!fs.existsSync(filePath)) {
      throw new Error('Book file not found');
    }
    return fs.createReadStream(filePath);
  }

  const localPath = await ensureLocalBookFile(filename, requestContext);
  return fs.createReadStream(localPath);
}

export async function ensureLocalBookFile(filename, requestContext = null) {

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
    const localStat = await fsp.stat(localPath);
    if (localStat.size > 0) {
      return localPath;
    }
    await fsp.unlink(localPath).catch(() => {});
  }

  return withDownloadLock(filename, async () => {
    if (fs.existsSync(localPath)) {
      const localStat = await fsp.stat(localPath);
      if (localStat.size > 0) {
        return localPath;
      }
      await fsp.unlink(localPath).catch(() => {});
    }

    const bucket = await getStratusBucket(requestContext);
    const objectKey = getObjectKey(filename);
    const objectResponse = await bucket.getObject(objectKey);
    const tempPath = `${localPath}.part-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    try {
      if (isReadableStream(objectResponse)) {
        await new Promise((resolve, reject) => {
          const writer = fs.createWriteStream(tempPath);
          objectResponse.pipe(writer);
          objectResponse.on('error', reject);
          writer.on('error', reject);
          writer.on('finish', resolve);
        });
      } else {
        const objectBuffer = await responseToBuffer(objectResponse);
        await fsp.writeFile(tempPath, objectBuffer);
      }

      const stagedStat = await fsp.stat(tempPath);
      if (stagedStat.size <= 0) {
        throw new Error(`Downloaded Stratus object is empty: ${objectKey}`);
      }

      await fsp.rename(tempPath, localPath);
      return localPath;
    } catch (error) {
      await fsp.unlink(tempPath).catch(() => {});
      await fsp.unlink(localPath).catch(() => {});
      throw error;
    }
  });
}

export async function deleteBookFile(filename, requestContext = null) {

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
    const bucket = await getStratusBucket(requestContext);
    const objectKey = getObjectKey(filename);
    try {
      await bucket.deleteObject(objectKey);
    } catch (error) {
      if (isStratusNotFoundError(error)) {
        console.warn(`[bookStorage] Stratus object already missing: ${objectKey}`);
      } else {
        console.error(`[bookStorage] Failed to delete Stratus object: ${objectKey}`, error);
        throw new Error(`Failed to delete book file from Stratus: ${error.message}`);
      }
    }
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
        bucketName:
          bucketDetails.bucket_name ||
          process.env.BOOKS_BUCKET_NAME ||
          process.env.STRATUS_BUCKET_NAME ||
          process.env.CATALYST_STRATUS_BUCKET,
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
