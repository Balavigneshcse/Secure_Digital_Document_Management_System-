'use strict';

const { Contract } = require('fabric-contract-api');

/**
 * DocumentAnchorContract
 *
 * Anchors document hashes on the ledger so tampering with a stored file
 * becomes provably detectable. Only hashes + metadata are written on-chain —
 * never the document itself.
 *
 * World-state key scheme: `${documentId}_${versionId}`
 * Audit history for a document is derived via getHistoryForKey per version key,
 * plus a documentId -> [versionKeys] index so getAuditHistory can enumerate
 * every version of a document.
 */
class DocumentAnchorContract extends Contract {

  _versionKey(documentId, versionId) {
    return `${documentId}_${versionId}`;
  }

  _indexKey(documentId) {
    return `INDEX_${documentId}`;
  }

  /**
   * Anchor a document version's hash on the ledger.
   *
   * @param {Context} ctx
   * @param {string} documentId
   * @param {string} versionId
   * @param {string} hash        SHA-256 hex digest of the document content
   * @param {string} uploaderId
   * @param {string} timestamp   ISO-8601 string
   */
  async anchorDocumentHash(ctx, documentId, versionId, hash, uploaderId, timestamp) {
    if (!documentId || !versionId || !hash || !uploaderId) {
      throw new Error('documentId, versionId, hash and uploaderId are all required');
    }

    const key = this._versionKey(documentId, versionId);

    const existing = await ctx.stub.getState(key);
    if (existing && existing.length > 0) {
      throw new Error(
        `Version ${versionId} of document ${documentId} is already anchored. ` +
        `Anchor a new versionId instead of overwriting an existing anchor.`
      );
    }

    const record = {
      documentId,
      versionId,
      hash,
      uploaderId,
      timestamp: timestamp || new Date().toISOString(),
      txId: ctx.stub.getTxID(),
    };

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(record)));

    // Maintain a documentId -> versionKeys index so getAuditHistory can enumerate
    // every version without needing a rich-query capable state DB.
    const indexKey = this._indexKey(documentId);
    const existingIndexBuf = await ctx.stub.getState(indexKey);
    const versionKeys = existingIndexBuf && existingIndexBuf.length > 0
      ? JSON.parse(existingIndexBuf.toString())
      : [];

    if (!versionKeys.includes(key)) {
      versionKeys.push(key);
      await ctx.stub.putState(indexKey, Buffer.from(JSON.stringify(versionKeys)));
    }

    return JSON.stringify({
      txId: record.txId,
      anchoredAt: record.timestamp,
    });
  }

  /**
   * Return the stored hash + anchoring metadata for a specific document version.
   * The caller (blockchain-api service) is responsible for recomputing the
   * current file's hash and comparing it against `hash` here to decide isValid.
   */
  async verifyDocumentHash(ctx, documentId, versionId) {
    const key = this._versionKey(documentId, versionId);
    const buf = await ctx.stub.getState(key);

    if (!buf || buf.length === 0) {
      throw new Error(`No anchor found for document ${documentId} version ${versionId}`);
    }

    return buf.toString();
  }

  /**
   * Return every anchor event recorded for a document across all its versions,
   * ordered as they were anchored.
   */
  async getAuditHistory(ctx, documentId) {
    const indexKey = this._indexKey(documentId);
    const indexBuf = await ctx.stub.getState(indexKey);

    if (!indexBuf || indexBuf.length === 0) {
      return JSON.stringify([]);
    }

    const versionKeys = JSON.parse(indexBuf.toString());
    const history = [];

    for (const key of versionKeys) {
      const buf = await ctx.stub.getState(key);
      if (buf && buf.length > 0) {
        history.push(JSON.parse(buf.toString()));
      }
    }

    history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return JSON.stringify(history);
  }
}

module.exports = DocumentAnchorContract;
