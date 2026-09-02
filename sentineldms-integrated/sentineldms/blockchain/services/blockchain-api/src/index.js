'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const blockchainRoutes = require('./routes/blockchain');
const signatureRoutes = require('./routes/signatures');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'blockchain-api' });
});

app.use('/blockchain', blockchainRoutes);
app.use('/signatures', signatureRoutes);

// Basic error handler so a thrown error anywhere doesn't crash the process
// mid-demo.
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`blockchain-api listening on port ${PORT}`);
});
