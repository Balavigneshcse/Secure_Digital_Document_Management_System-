import uuid
import hashlib
import time
from typing import List, Dict

class Block:
    def __init__(self, index: int, previous_hash: str, timestamp: float, data: dict, hash: str):
        self.index = index
        self.previous_hash = previous_hash
        self.timestamp = timestamp
        self.data = data
        self.hash = hash

class SimulatedBlockchain:
    def __init__(self):
        self.chain: List[Block] = []
        self.create_genesis_block()

    def create_genesis_block(self):
        genesis_block = Block(0, "0", time.time(), {"info": "Genesis Block"}, self.calculate_hash(0, "0", time.time(), {"info": "Genesis Block"}))
        self.chain.append(genesis_block)

    def calculate_hash(self, index: int, previous_hash: str, timestamp: float, data: dict) -> str:
        value = str(index) + str(previous_hash) + str(timestamp) + str(data)
        return hashlib.sha256(value.encode('utf-8')).hexdigest()

    def get_latest_block(self) -> Block:
        return self.chain[-1]

    def add_block(self, data: dict) -> Block:
        latest_block = self.get_latest_block()
        index = latest_block.index + 1
        timestamp = time.time()
        previous_hash = latest_block.hash
        hash = self.calculate_hash(index, previous_hash, timestamp, data)
        new_block = Block(index, previous_hash, timestamp, data, hash)
        self.chain.append(new_block)
        return new_block

    def is_chain_valid(self) -> bool:
        for i in range(1, len(self.chain)):
            current_block = self.chain[i]
            previous_block = self.chain[i - 1]
            if current_block.hash != self.calculate_hash(current_block.index, current_block.previous_hash, current_block.timestamp, current_block.data):
                return False
            if current_block.previous_hash != previous_block.hash:
                return False
        return True

# Global instance for simulation
ledger = SimulatedBlockchain()

class BlockchainService:
    @staticmethod
    async def anchor_hash(doc_id: uuid.UUID, sha256_hash: str, metadata: dict) -> str:
        """
        Anchor document hash to Simulated Blockchain.
        Returns: Transaction ID (tx_id)
        """
        data = {
            "doc_id": str(doc_id),
            "sha256_hash": sha256_hash,
            "metadata": metadata
        }
        new_block = ledger.add_block(data)
        print(f"BLOCKCHAIN: Anchored {doc_id} in block {new_block.index} with hash {new_block.hash}")
        return new_block.hash

    @staticmethod
    async def verify_hash(doc_id: uuid.UUID) -> str:
        """
        Retrieve the original anchored hash from Simulated Blockchain.
        Returns: The original SHA-256 hash.
        """
        for block in reversed(ledger.chain):
            if block.data.get("doc_id") == str(doc_id):
                return block.data.get("sha256_hash")
        raise ValueError(f"Document {doc_id} not found on the blockchain.")
        
    @staticmethod
    def run_automated_test(iterations: int = 10) -> dict:
        """
        Run a stress test of anchoring and verifying on the blockchain.
        """
        results = []
        for i in range(iterations):
            test_doc_id = uuid.uuid4()
            test_hash = hashlib.sha256(f"test_data_{i}".encode()).hexdigest()
            
            # 1. Anchor
            data = {"doc_id": str(test_doc_id), "sha256_hash": test_hash, "metadata": {"iteration": i}}
            block = ledger.add_block(data)
            
            # 2. Verify
            found_hash = None
            for b in reversed(ledger.chain):
                if b.data.get("doc_id") == str(test_doc_id):
                    found_hash = b.data.get("sha256_hash")
                    break
                    
            results.append({
                "iteration": i + 1,
                "doc_id": str(test_doc_id),
                "anchored_hash": test_hash,
                "verified": found_hash == test_hash,
                "block_index": block.index
            })
            
        return {
            "status": "success",
            "chain_valid": ledger.is_chain_valid(),
            "total_blocks": len(ledger.chain),
            "test_results": results
        }
