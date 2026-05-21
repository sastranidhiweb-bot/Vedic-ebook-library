import path from 'path';

function resolveFromCwd(value, fallbackParts) {
  if (value && path.isAbsolute(value)) return value;
  if (value) return path.join(process.cwd(), value);
  return path.join(process.cwd(), ...fallbackParts);
}

export function getBookStorageProvider() {
  const fromEnv = (process.env.BOOK_STORAGE_PROVIDER || '').toLowerCase();
  if (fromEnv === 'local' || fromEnv === 'catalyst') return fromEnv;
  return process.env.NODE_ENV === 'production' ? 'catalyst' : 'local';
}

export function getBooksUploadDir() {
  const provider = getBookStorageProvider();
  if (provider === 'catalyst') {
    return resolveFromCwd(
      process.env.CATALYST_BOOKS_UPLOAD_DIR || process.env.BOOKS_UPLOAD_DIR,
      ['uploads', 'books']
    );
  }
  return resolveFromCwd(process.env.BOOKS_UPLOAD_DIR, ['uploads', 'books']);
}

export function getBooksDeletedDir() {
  const provider = getBookStorageProvider();
  if (provider === 'catalyst') {
    return resolveFromCwd(
      process.env.CATALYST_BOOKS_DELETED_DIR || process.env.BOOKS_DELETED_DIR,
      ['deleted', 'books']
    );
  }
  return resolveFromCwd(process.env.BOOKS_DELETED_DIR, ['deleted', 'books']);
}

export function getBookFilePath(filename) {
  return path.join(getBooksUploadDir(), filename);
}
