'use strict';

require('dotenv').config();

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

/**
 * Enrolls the CA admin identity and stores it in the wallet.
 * This MUST be run once before registerUser.js, and before the API service
 * can make any calls to the chaincode — fabricService.connect() will fail
 * with "Identity not found in wallet" until this has been run.
 *
 * Reads CA connection details from the Fabric connection profile
 * (FABRIC_CONNECTION_PROFILE) rather than hardcoding them, so this stays
 * correct if the org/CA names differ from the standard test-network sample.
 */
async function enrollAdmin() {
  const connectionProfilePath = process.env.FABRIC_CONNECTION_PROFILE;
  const walletPath = process.env.FABRIC_WALLET_PATH || './wallet';
  const caAdminId = process.env.FABRIC_CA_ADMIN_ID || 'admin';
  const caAdminSecret = process.env.FABRIC_CA_ADMIN_SECRET || 'adminpw';
  const mspId = process.env.FABRIC_MSP_ID || 'Org1MSP';

  if (!connectionProfilePath || !fs.existsSync(connectionProfilePath)) {
    throw new Error(
      `Connection profile not found at ${connectionProfilePath}. ` +
      `Copy it from fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json ` +
      `into the path set by FABRIC_CONNECTION_PROFILE in your .env before running this script.`
    );
  }

  const ccp = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));

  const caName = Object.keys(ccp.certificateAuthorities)[0];
  const caInfo = ccp.certificateAuthorities[caName];
  const caTLSCACerts = caInfo.tlsCACerts.pem;
  const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

  const wallet = await Wallets.newFileSystemWallet(walletPath);

  const existing = await wallet.get(caAdminId);
  if (existing) {
    console.log(`Identity "${caAdminId}" already exists in wallet — skipping enrollment.`);
    return;
  }

  const enrollment = await ca.enroll({ enrollmentID: caAdminId, enrollmentSecret: caAdminSecret });

  const identity = {
    credentials: {
      certificate: enrollment.certificate,
      privateKey: enrollment.key.toBytes(),
    },
    mspId,
    type: 'X.509',
  };

  await wallet.put(caAdminId, identity);
  console.log(`Enrolled "${caAdminId}" and stored it in the wallet at ${walletPath}`);
}

enrollAdmin().catch((err) => {
  console.error('Failed to enroll admin:', err.message);
  process.exit(1);
});
