'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Computes the SHA-256 hash of a document currently sitting in storage.
 * This is deliberately the *only* place hashing logic lives, so /anchor
 * and /verify are guaranteed to use identical hashing — any drift here
 * would silently break tamper detection.
 */
function hashFileSync(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found for hashing: ${filePath}`);
  }
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Resolves a documentId/versionId pair to a path under DOCUMENT_STORAGE_PATH.
 * Adjust this once Arunkumar's storage layout (MinIO key structure) is final —
 * this is the one function that needs to change to match it.
 */
function resolveStoredFilePath(documentId, versionId) {
  const storageRoot = process.env.DOCUMENT_STORAGE_PATH || './storage';
  return path.join(storageRoot, documentId, `${versionId}`);
}

module.exports = { hashFileSync, resolveStoredFilePath };
