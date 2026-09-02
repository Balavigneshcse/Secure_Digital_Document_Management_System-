# SentinelDMS — Blockchain & Security Module

Owner: Dharani Dharan (Blockchain & Security Engineer)

This folder contains the full blockchain-anchoring, digital-signature, and identity
(Keycloak) pieces of SentinelDMS, as scoped in the team working doc.

## What's in here

```
.
├── chaincode/document-anchor/     Hyperledger Fabric chaincode (JS)
├── services/blockchain-api/       Express API wrapper other services call
├── keycloak/realm-export.json     Realm + roles skeleton for sentineldms
├── docs/blockchain-api-contract.md   API contract for teammates
└── scripts/                       prove-concept + CA generation utilities
```

## Quick start

### 1. Bring up the Fabric test network

```bash
git clone https://github.com/hyperledger/fabric-samples.git
cd fabric-samples/test-network
./network.sh up createChannel -c sentinelchannel
```

**For your architecture slide / pitch deck:** the test-network sample creates
generic orgs (`Org1`, `Org2`) under the hood — that scaffolding naming doesn't
need to change. But in your diagrams, docs, and demo narration, refer to them
conceptually as **Police**, **Court**, and **ForensicLab** — that's the mapping
judges will see and evaluate against, even though the actual Fabric config
keeps the generic sample names.

### 2. Deploy the chaincode

```bash
cd fabric-samples/test-network
./network.sh deployCC \
  -ccn documentanchor \
  -ccp ../../chaincode/document-anchor \
  -ccl javascript
```

### 3. Install & run the API service

```bash
cd services/blockchain-api
npm install
cp .env.example .env      # fill in connection profile path, wallet path, etc.
cp ../../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json \
   ./config/connection-profile.json   # matches FABRIC_CONNECTION_PROFILE in .env

npm run generate-ca       # one-time: creates the prototype self-signed CA
npm run enroll-admin      # one-time: enrolls the CA admin into the wallet
npm run register-user     # one-time: registers/enrolls "appUser" — this is the
                           # identity fabricService.js actually connects with.
                           # Skipping this step means every /blockchain/* call
                           # will fail with "Identity not found in wallet".
npm start
```

The service listens on `PORT` from `.env` (default `4000`) and exposes:

- `POST /blockchain/anchor`
- `GET  /blockchain/verify/:documentId/:versionId`
- `POST /signatures/sign`
- `GET  /signatures/:documentVersionId/verify`

Full request/response shapes: [`docs/blockchain-api-contract.md`](docs/blockchain-api-contract.md).

**Wiring this into the rest of SentinelDMS (not just running it standalone)?**
See [`docs/INTEGRATION.md`](docs/INTEGRATION.md) — covers exactly what
Balavignesh's document-service needs to call and when, what Arunkumar's
schema needs to hold, how Keycloak auth ties in, and an integration-testing
checklist to run before the team's Week 4–5 integration phase.

### 4. Prove the core concept (run this before wiring up any UI)

```bash
cd services/blockchain-api
npm run poc
```

This hashes a test file, "anchors" it, tampers with the file, and shows `isValid`
flip to `false` — the core tamper-detection loop the whole module is built around.

### 5. Keycloak

```bash
docker run -d --name keycloak -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest start-dev
```

Then import `keycloak/realm-export.json` via Admin Console → Realm settings → Import,
or `kc.sh import` in newer versions. It ships with the 5 roles
(`investigating_officer`, `judicial_officer`, `forensic_expert`, `admin`, `auditor`)
and TOTP required for every role above `investigating_officer`.

## Running with Docker Compose (Keycloak + API together)

Once the Fabric network is up and you've run `generate-ca` / `enroll-admin` /
`register-user` at least once (so `wallet/`, `ca/`, and `config/` are populated),
you can bring up Keycloak and the API service together:

```bash
docker compose up --build
```

This auto-imports the realm into Keycloak and starts the API on port 4000.

**Important caveat:** by default the API container will NOT be able to reach
the Fabric peers, because `fabric-network`'s discovery service resolves peer
addresses as `localhost` (matching how `test-network` advertises them to
processes running directly on the host). A container has its own network
namespace, so `localhost` inside it isn't the same `localhost` the Fabric
peers are listening on.

Two ways to handle this:
- **Simplest for a hackathon demo:** run `blockchain-api` directly on the host
  (`npm start` from `services/blockchain-api/`) instead of in Docker, and only
  containerize Keycloak. This is what the Quick Start above assumes.
- **If you want it fully containerized:** join the `blockchain-api` service to
  Fabric's docker network (uncomment the `networks:` block in
  `docker-compose.yml`, find the actual network name via `docker network ls`
  after `./network.sh up`), and set `FABRIC_DISCOVERY_AS_LOCALHOST=false` in
  `.env`. This is the technically correct production path but adds setup time
  you likely don't need for the prototype/demo stage.

## Notes for the demo / report

- The CA in `scripts/generate-ca.js` is a **self-signed prototype CA**. Call this out
  explicitly in the pitch/report — production would integrate with India's DSC/eSign
  infrastructure instead.
- Only the SHA-256 hash of each document is ever written on-chain, never the document
  itself — keeps the chain fast and is the answer to "why blockchain, not just a
  database?" if a judge asks.
