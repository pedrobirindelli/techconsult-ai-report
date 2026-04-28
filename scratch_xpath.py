from docx import Document
import sys

doc = Document()
doc.add_paragraph("Test")
child = doc.element.body[0]

try:
    x = child.xpath('.//w:drawing')
    print("Success without namespaces:", x)
except Exception as e:
    print("Error:", type(e).__name__, str(e))

ns = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'v': 'urn:schemas-microsoft-com:vml'
}

try:
    x = child.xpath('.//w:drawing', namespaces=ns)
    print("Success with explicit namespaces")
except Exception as e:
    print("Error with explicit:", type(e).__name__, str(e))
