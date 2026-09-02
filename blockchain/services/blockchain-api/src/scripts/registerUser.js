'use strict';

require('dotenv').config();

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');

/**
 * Registers and enrolls the application identity (default: "appUser") that
 * fabricService.js actually connects with at runtime. Run this once, after
 * enrollAdmin.js.
 */
async function registerUser() {
  const connectionProfilePath = process.env.FABRIC_CONNECTION_PROFILE;
  const walletPath = process.env.FABRIC_WALLET_PATH || './wallet';
  const caAdminId = process.env.FABRIC_CA_ADMIN_ID || 'admin';
  const appIdentity = process.env.FABRIC_IDENTITY || 'appUser';
  const mspId = process.env.FABRIC_MSP_ID || 'Org1MSP';
  const affiliation = process.env.FABRIC_AFFILIATION || 'org1.department1';

  if (!connectionProfilePath || !fs.existsSync(connectionProfilePath)) {
    throw new Error(`Connection profile not found at ${connectionProfilePath}.`);
  }

  const ccp = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));
  const caName = Object.keys(ccp.certificateAuthorities)[0];
  const caInfo = ccp.certificateAuthorities[caName];
  const caTLSCACerts = caInfo.tlsCACerts.pem;
  const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

  const wallet = await Wallets.newFileSystemWallet(walletPath);

  const userExists = await wallet.get(appIdentity);
  if (userExists) {
    console.log(`Identity "${appIdentity}" already exists in wallet — skipping.`);
    return;
  }

  const adminIdentity = await wallet.get(caAdminId);
  if (!adminIdentity) {
    throw new Error(`Admin identity "${caAdminId}" not found in wallet. Run enrollAdmin.js first.`);
  }

  const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
  const adminUser = await provider.getUserContext(adminIdentity, caAdminId);

  const secret = await ca.register(
    {
      affiliation,
      enrollmentID: appIdentity,
      role: 'client',
    },
    adminUser
  );

  const enrollment = await ca.enroll({ enrollmentID: appIdentity, enrollmentSecret: secret });

  const identity = {
    credentials: {
      certificate: enrollment.certificate,
      privateKey: enrollment.key.toBytes(),
    },
    mspId,
    type: 'X.509',
  };

  await wallet.put(appIdentity, identity);
  console.log(`Registered and enrolled "${appIdentity}", stored in wallet at ${walletPath}`);
}

registerUser().catch((err) => {
  console.error('Failed to register user:', err.message);
  process.exit(1);
});
