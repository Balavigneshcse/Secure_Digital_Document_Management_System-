'use strict';

const express = require('express');
const router = express.Router();

const signatureService = require('../services/signatureService');

/**
 * POST /signatures/sign
 * body: { documentVersionId, userId, certificateId }
 *
 * certificateId is accepted for API-contract compatibility with a future
 * real DSC/eSign integration, but the prototype CA auto-issues/reuses a
 * per-user certificate rather than requiring a pre-existing certificateId.
 */
router.post('/sign', (req, res) => {
  const { documentVersionId, userId } = req.body;

  if (!documentVersionId || !userId) {
    return res.status(400).json({ error: 'documentVersionId and userId are required' });
  }

  try {
    const { signatureValue, signedAt } = signatureService.sign(documentVersionId, userId);
    return res.status(201).json({ signatureValue, signedAt });
  } catch (err) {
    console.error('[signatures/sign] error:', err.message);
    return res.status(500).json({ error: 'Failed to sign document version', detail: err.message });
  }
});

/**
 * GET /signatures/:documentVersionId/verify
 */
router.get('/:documentVersionId/verify', (req, res) => {
  const { documentVersionId } = req.params;

  try {
    const result = signatureService.verify(documentVersionId);
    return res.json(result);
  } catch (err) {
    console.error('[signatures/verify] error:', err.message);
    return res.status(500).json({ error: 'Failed to verify signature', detail: err.message });
  }
});

module.exports = router;
