import os
import random
from datetime import datetime, timedelta

DOC_TYPES = ["FIR", "chargesheet", "witness_statement", "forensic_report", "court_filing"]

NAMES = ["Ramesh Kumar", "Suresh Iyer", "Priya Sharma", "Anjali Deshmukh", "Vikram Singh", "Abdul Rehman", "Meera Reddy", "Rajesh Patel", "Sunita Devi", "Karthik N"]
POLICE_STATIONS = ["Indiranagar PS", "Koramangala PS", "Whitefield PS", "Jayanagar PS", "Malleswaram PS"]
LOCATIONS = ["MG Road", "100ft Road", "Brigade Road", "Commercial Street", "Ring Road"]
CRIMES = [
    ("Theft", "Section 379 IPC"),
    ("Assault", "Section 323 IPC"),
    ("Fraud", "Section 420 IPC"),
    ("Cyber Crime", "Section 66D IT Act"),
    ("Robbery", "Section 392 IPC")
]
JUDGES = ["Hon'ble Justice K. Rao", "Hon'ble Justice S. Menon", "Magistrate P. Kumar"]

def random_date(start_year=2020):
    start = datetime(start_year, 1, 1)
    end = datetime.now()
    return start + timedelta(days=random.randint(0, (end - start).days))

def generate_fir():
    crime, section = random.choice(CRIMES)
    return f"""FIRST INFORMATION REPORT
Under Section 154 Cr.P.C.

1. Station: {random.choice(POLICE_STATIONS)}
2. FIR No: {random.randint(100, 999)}/{random.randint(2020, 2024)}
3. Date & Time of Occurrence: {random_date().strftime('%d-%m-%Y %H:%M')}
4. Act(s) & Section(s): {section} - {crime}
5. Complainant Name: {random.choice(NAMES)}
6. Place of Occurrence: {random.choice(LOCATIONS)}

Details of the incident:
The complainant reported that an incident of {crime.lower()} occurred near {random.choice(LOCATIONS)}. Immediate police assistance is requested for investigation.
"""

def generate_chargesheet():
    crime, section = random.choice(CRIMES)
    return f"""FINAL REPORT / CHARGESHEET
Under Section 173 Cr.P.C.

1. FIR No: {random.randint(100, 999)}/{random.randint(2020, 2024)}
2. Police Station: {random.choice(POLICE_STATIONS)}
3. Name of the Accused: {random.choice(NAMES)}
4. Charges Filed Under: {section} - {crime}
5. Investigating Officer: {random.choice(NAMES)}, Sub-Inspector

Summary of Investigation:
During the investigation into the alleged {crime.lower()}, witness statements were recorded and material evidence was seized from {random.choice(LOCATIONS)}. The accused is prime facie guilty of the offenses charged.
"""

def generate_witness_statement():
    return f"""STATEMENT UNDER SECTION 161 Cr.P.C.

Statement of Witness: {random.choice(NAMES)}
Recorded By: {random.choice(NAMES)} (Investigating Officer)
Date of Recording: {random_date().strftime('%d-%m-%Y')}
Police Station: {random.choice(POLICE_STATIONS)}

Statement:
"I reside near {random.choice(LOCATIONS)}. On the day of the incident, I was present at the scene. I clearly saw the events unfold. The suspect approached the victim and a physical altercation began. I am willing to testify to these facts before the Honorable Court."
"""

def generate_forensic_report():
    return f"""STATE FORENSIC SCIENCE LABORATORY (SFSL)
REPORT OF ANALYSIS

FSL Reference No: FSL-{random.randint(1000, 9999)}
Date of Receipt: {random_date().strftime('%d-%m-%Y')}
Forwarding Authority: {random.choice(POLICE_STATIONS)}
Nature of Exhibits: Digital Device / Biological Sample

Examination Results:
The exhibits were subjected to rigorous chemical and digital analysis. The findings indicate traces consistent with the prosecution's hypothesis regarding the incident at {random.choice(LOCATIONS)}.
Conclusion: The evidence supports the presence of tampering/interference.
Analyst: Dr. {random.choice(NAMES)}
"""

def generate_court_filing():
    crime, section = random.choice(CRIMES)
    return f"""IN THE COURT OF {random.choice(JUDGES)}
BAIL APPLICATION / REMAND ORDER

Case No: {random.randint(1000, 9999)}/{random.randint(2020, 2024)}
Applicant/Accused: {random.choice(NAMES)}
Offenses: {section} - {crime}

Order Details:
The court has reviewed the petition filed by the defense counsel regarding the incident at {random.choice(LOCATIONS)}. Considering the nature of the charges and the ongoing investigation by {random.choice(POLICE_STATIONS)}, the application is hereby processed. Next hearing date is scheduled.
"""

def main():
    output_dir = "synthetic_docs"
    os.makedirs(output_dir, exist_ok=True)
    
    generators = {
        "FIR": generate_fir,
        "chargesheet": generate_chargesheet,
        "witness_statement": generate_witness_statement,
        "forensic_report": generate_forensic_report,
        "court_filing": generate_court_filing
    }
    
    # Generate 10 of each type
    for doc_type, func in generators.items():
        type_dir = os.path.join(output_dir, doc_type)
        os.makedirs(type_dir, exist_ok=True)
        for i in range(1, 11):
            content = func()
            filepath = os.path.join(type_dir, f"{doc_type}_{i:03d}.txt")
            with open(filepath, "w") as f:
                f.write(content)
    
    print(f"Successfully generated 50 synthetic documents in {os.path.abspath(output_dir)}")

if __name__ == "__main__":
    main()
