import json
import docx
import tempfile
import os

from docx import Document
from backend import reconstruct_doc

json_data = [
    {"type": "heading1", "text": "Test Heading"},
    {"type": "paragraph", "text": "This is a paragraph."},
    {"type": "table", "headers": ["Col 1", "Col 2"], "rows": [["1", "2"]]}
]

doc = docx.Document()
doc.save("test_template.docx")

reconstruct_doc(json_data, "test_template.docx", "test_output.docx", ".")
print("Done. File exists:", os.path.exists("test_output.docx"))
