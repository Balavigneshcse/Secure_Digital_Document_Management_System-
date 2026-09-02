"""
Week 5 — Demo Dataset Preparation Script
=========================================
Loads the Karnataka Police FIR CSV dataset into the FAISS semantic search index.

Run this ONCE before demo day:
    python data/load_karnataka_fir_dataset.py

What it does:
- Reads FIR_Details_Data.csv from the data folder
- Converts each row into a natural language paragraph
- Bulk embeds and indexes them into FAISS
- The search and chatbot endpoints become incredibly rich for the demo

Usage:
    python data/load_karnataka_fir_dataset.py --limit 500
    (use --limit to control how many records to load; default 1000)
"""

import sys
import os
import argparse

# Add parent dir to path so we can import the search engine
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd
from search.engine import SemanticSearchEngine


def row_to_text(row) -> str:
    """Convert a Karnataka FIR CSV row into a natural language paragraph."""
    parts = []
    if pd.notna(row.get("District_Name")):
        parts.append(f"District: {row['District_Name']}.")
    if pd.notna(row.get("UnitName")):
        parts.append(f"Police Unit: {row['UnitName']}.")
    if pd.notna(row.get("FIR_Year")):
        parts.append(f"Year: {int(row['FIR_Year'])}.")
    if pd.notna(row.get("Month")):
        parts.append(f"Month: {row['Month']}.")
    if pd.notna(row.get("CrimeGroup_Name")):
        parts.append(f"Crime Group: {row['CrimeGroup_Name']}.")
    if pd.notna(row.get("CrimeHead_Name")):
        parts.append(f"Crime: {row['CrimeHead_Name']}.")
    if pd.notna(row.get("Place_of_Offence")):
        parts.append(f"Place of Offence: {row['Place_of_Offence']}.")
    if pd.notna(row.get("VICTIM_COUNT")):
        parts.append(f"Victim Count: {int(row['VICTIM_COUNT'])}.")
    if pd.notna(row.get("Accused_Count")):
        parts.append(f"Accused Count: {int(row['Accused_Count'])}.")
    if pd.notna(row.get("Chargesheeted_Count")):
        parts.append(f"Charge-sheeted: {int(row['Chargesheeted_Count'])}.")
    if pd.notna(row.get("Conviction_Count")):
        parts.append(f"Convictions: {int(row['Conviction_Count'])}.")
    return " ".join(parts) if parts else "FIR record with no details."


def main(csv_path: str, limit: int):
    print(f"\n[Dataset Loader] Reading {csv_path} ...")

    try:
        df = pd.read_csv(csv_path, encoding="latin1", nrows=limit)
    except FileNotFoundError:
        print(f"ERROR: File not found at {csv_path}")
        print("Please download the Karnataka FIR dataset from Kaggle and place it in the data/ folder.")
        sys.exit(1)

    print(f"[Dataset Loader] Loaded {len(df)} rows. Converting to documents...")

    documents = []
    for i, (_, row) in enumerate(df.iterrows()):
        text = row_to_text(row)
        district = str(row.get("District_Name", "unknown")).strip().lower().replace(" ", "_")
        year = str(int(row["FIR_Year"])) if pd.notna(row.get("FIR_Year")) else "unknown"

        documents.append({
            "documentId": f"karnataka_fir_{i:06d}",
            "text": text,
            "caseId": f"karnataka_{district}_{year}",  # RBAC: grouped by district+year
            "documentType": "FIR",
        })

    print(f"[Dataset Loader] Bulk indexing {len(documents)} documents into FAISS...")
    engine = SemanticSearchEngine()
    engine.bulk_index(documents)

    stats = engine.get_stats()
    print(f"\n✅ Done! FAISS Index Stats:")
    print(f"   Total Documents : {stats['totalDocuments']}")
    print(f"   By Type         : {stats['byDocumentType']}")
    print(f"\nYour search and chatbot are now supercharged with real Karnataka FIR data!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Load Karnataka FIR dataset into FAISS")
    parser.add_argument(
        "--csv",
        default=os.path.join(os.path.dirname(__file__), "FIR_Details_Data.csv"),
        help="Path to the FIR_Details_Data.csv file",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=1000,
        help="Number of rows to load (default: 1000 for dev, use 50000 for demo day)",
    )
    args = parser.parse_args()
    main(args.csv, args.limit)
