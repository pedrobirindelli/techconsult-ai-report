import pandas as pd
import json
import sys

def parse_excel(file_path):
    try:
        # Read the Excel file
        # We might need openpyxl if it's .xlsx
        df = pd.read_excel(file_path)
        print("Columns found:")
        print(df.columns.tolist())
        
        # Output the first few rows
        print("\nFirst 2 rows:")
        print(df.head(2).to_json(orient="records", force_ascii=False, indent=2))
        
    except Exception as e:
        print(f"Error reading Excel: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        parse_excel(sys.argv[1])
    else:
        print("Please provide the file path")
