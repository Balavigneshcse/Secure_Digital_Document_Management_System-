'use strict';

/**
 * Throwaway proof-of-concept: hashes a test file, "anchors" it (to a local
 * JSON file as a stand-in so this runs even before Fabric is deployed),
 * modifies the file, and shows verify failing.
 *
 * Run before building any UI around the real chaincode — this is the exact
 * logic /blockchain/verify runs later, just against a JSON file instead of
 * the ledger.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TEST_FILE = path.join(__dirname, 'test-doc.txt');
const LOCAL_LEDGER = path.join(__dirname, 'local-anchor-store.json');

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function main() {
  fs.writeFileSync(TEST_FILE, 'This is a test case document. Do not tamper.');

  const originalHash = hashFile(TEST_FILE);
  console.log('1. Original hash:      ', originalHash);

  const anchorRecord = { documentId: 'DOC-001', versionId: 'v1', hash: originalHash, anchoredAt: new Date().toISOString() };
  fs.writeFileSync(LOCAL_LEDGER, JSON.stringify(anchorRecord, null, 2));
  console.log('2. Anchored (local stand-in for chaincode write).');

  const preTamperCheck = hashFile(TEST_FILE) === anchorRecord.hash;
  console.log('3. Verify before tampering — isValid:', preTamperCheck);

  fs.appendFileSync(TEST_FILE, ' <tampered content>');
  console.log('4. File tampered directly on disk.');

  const currentHash = hashFile(TEST_FILE);
  const postTamperCheck = currentHash === anchorRecord.hash;
  console.log('5. Verify after tampering  — currentHash:', currentHash);
  console.log('                             storedHash: ', anchorRecord.hash);
  console.log('                             isValid:    ', postTamperCheck, '(expected: false)');

  // Cleanup
  fs.unlinkSync(TEST_FILE);
  fs.unlinkSync(LOCAL_LEDGER);

  if (postTamperCheck !== false) {
    console.error('POC FAILED: tampering was not detected. Do not proceed to chaincode until this passes.');
    process.exit(1);
  }
  console.log('\nPOC PASSED — tamper detection logic is sound.');
}

main();
