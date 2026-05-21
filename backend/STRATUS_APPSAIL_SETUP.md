# Stratus Setup in AppSail and Implementation Notes

This document explains:
- How to configure Zoho Catalyst AppSail for persistent book storage with Stratus.
- What code changes were implemented in backend for local and production storage modes.

## 1) Why this setup is needed

Local file paths like uploads/books work in development, but AppSail container filesystem can be reset on restart or redeploy.

To keep uploaded books persistent in production, storage is switched to Catalyst Stratus object storage.

## 2) Storage modes implemented

The backend now supports two modes using BOOK_STORAGE_PROVIDER:

- local: reads and writes from local folders.
- catalyst: reads and writes using Catalyst Stratus bucket APIs.

Mode selection:
- If BOOK_STORAGE_PROVIDER is set, that value is used.
- If not set, production defaults to catalyst, otherwise local.

## 3) AppSail configuration steps

1. Open Catalyst Console.
2. Select project.
3. Go to AppSail.
4. Open your backend service.
5. Go to Configuration -> Environment Variables.
6. Add the environment variables listed below.
7. Redeploy or restart the service.

## 4) Required environment variables in AppSail

Core storage variables:

- BOOK_STORAGE_PROVIDER=catalyst
- BOOKS_BUCKET_NAME=<your_bucket_name>
- BOOKS_OBJECT_PREFIX=books

Recommended for your setup:

- BOOKS_BUCKET_NAME=sastranidhi-storage
- BOOKS_OBJECT_PREFIX=books
- BOOK_STORAGE_PROVIDER=catalyst

Compatibility fallback keys (use only if needed):

- STRATUS_BUCKET_NAME=<your_bucket_name>
- CATALYST_STRATUS_BUCKET=<your_bucket_name>

Catalyst SDK initialization (use one of the two approaches):

Approach A (recommended in AppSail):
- CATALYST_CONFIG=<json-string-with-project-config>

Approach B (explicit project keys):
- CATALYST_PROJECT_ID=<project_id>
- CATALYST_PROJECT_KEY=<project_key>
- CATALYST_ENVIRONMENT=Production

Application variables:

- MONGODB_URI=<mongodb_connection>
- JWT_SECRET=<jwt_secret>
- CASHFREE_CLIENT_ID=<cashfree_client_id>
- CASHFREE_CLIENT_SECRET=<cashfree_client_secret>
- CORS_ORIGIN=<frontend_origin>

Notes:
- The deployment zip excludes .env, so AppSail Environment Variables are required.
- Do not store production secrets in committed files.
- In Catalyst UI, enter key and value in separate fields (do not type KEY=VALUE as one string).
- If Catalyst blocks a key as reserved, prefer BOOKS_BUCKET_NAME.

## 5) Optional local development variables

Use these in local backend .env for local file storage mode:

- BOOK_STORAGE_PROVIDER=local
- BOOKS_UPLOAD_DIR=uploads/books
- BOOKS_DELETED_DIR=deleted/books

## 6) Health check endpoint for storage

A new endpoint is available:

- GET /api/health/storage

Behavior:
- Returns 200 with provider details when storage is healthy.
- Returns 503 when storage is misconfigured or unreachable.

Use this endpoint immediately after deploy to verify Stratus connectivity.

## 7) What was implemented in code

### 7.1 New storage service

File: utils/bookStorage.js

Responsibilities:
- Initialize Stratus bucket connection in catalyst mode.
- Save uploaded files to local filesystem or Stratus.
- Stream files from local filesystem or Stratus.
- Delete files in local filesystem and Stratus.
- Ensure local temp file exists for text extraction flows.
- Provide storage health check function.

### 7.2 Path and provider helpers

File: utils/storagePaths.js

Responsibilities:
- Resolve effective storage provider.
- Resolve local upload/deleted directories from environment.

### 7.3 Books controller integration

File: src/controllers/books.js

Updated flows:
- Upload uses saveBookFile.
- Content streaming uses getBookReadStream.
- Delete uses deleteBookFile and removes DB references from categories.

Deletion behavior now:
- Removes book from all category trees.
- Deletes related reading progress.
- Permanently deletes book record.
- Deletes physical object/file from configured storage.

### 7.4 Cache integration

Files:
- utils/optimizedContentCache.js
- utils/contentCache.js

Update:
- Extraction now uses ensureLocalBookFile so catalyst objects are staged locally only when required for parsing.

### 7.5 Server health route

File: src/server.js

Added:
- GET /api/health/storage using checkBookStorageHealth.

## 8) Deployment checklist

1. Build backend zip excluding local artifacts and .env.
2. Upload zip to AppSail.
3. Set all required environment variables in AppSail.
4. Restart or redeploy AppSail service.
5. Validate:
   - /api/health returns OK
   - /api/health/storage returns OK with provider=catalyst
6. Upload a test book and verify it appears in the app.
7. Delete a test book and verify it is removed and unlinked from category tree.

## 9) Troubleshooting

If /api/health/storage returns error:

- Missing bucket variable:
  - Ensure BOOKS_BUCKET_NAME is set (or use STRATUS_BUCKET_NAME/CATALYST_STRATUS_BUCKET fallback).

- SDK initialization error:
  - Ensure either CATALYST_CONFIG is valid JSON, or explicit project vars are set.

- Access/permission error:
  - Confirm AppSail project identity has access to the configured Stratus bucket.

- Object not found during read:
  - Verify BOOKS_OBJECT_PREFIX consistency across upload and read.

## 10) Current object key format

Objects are stored as:

- <BOOKS_OBJECT_PREFIX>/<filename>

Default prefix is books.

Example:

- books/1715860000000_sample.pdf
