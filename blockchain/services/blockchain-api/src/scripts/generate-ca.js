'use strict';

require('dotenv').config();

const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

/**
 * Generates a self-signed CA certificate + key for the prototype's digital
 * signature flow. Run once (npm run generate-ca).
 *
 * PROTOTYPE ONLY — a production deployment would use India's DSC/eSign
 * infrastructure instead of a self-signed root. Say this explicitly in the
 * report/pitch.
 */
function generateCA() {
  const caCertPath = process.env.CA_CERT_PATH || './ca/ca-cert.pem';
  const caKeyPath = process.env.CA_KEY_PATH || './ca/ca-key.pem';

  const dir = path.dirname(caCertPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(caCertPath) && fs.existsSync(caKeyPath)) {
    console.log('CA already exists at', caCertPath, '— skipping generation.');
    return;
  }

  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 5);

  const attrs = [
    { name: 'commonName', value: 'SentinelDMS Prototype CA' },
    { name: 'organizationName', value: 'SentinelDMS' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs); // self-signed
  cert.setExtensions([
    { name: 'basicConstraints', cA: true },
    { name: 'keyUsage', keyCertSign: true, digitalSignature: true, cRLSign: true },
  ]);

  cert.sign(keys.privateKey, forge.md.sha256.create());

  fs.writeFileSync(caCertPath, forge.pki.certificateToPem(cert));
  fs.writeFileSync(caKeyPath, forge.pki.privateKeyToPem(keys.privateKey));

  console.log('Generated prototype CA:');
  console.log('  cert:', caCertPath);
  console.log('  key: ', caKeyPath);
  console.log('Remember: this is a self-signed prototype CA, not for production use.');
}

generateCA();
