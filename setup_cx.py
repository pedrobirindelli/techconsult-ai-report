import sys
from cx_Freeze import setup, Executable

# Dependencies are automatically detected, but it might need fine tuning.
build_exe_options = {
    "build_exe": "build_v2",
    "packages": ["os", "flask", "google", "docx", "pandas", "requests", "bs4", "PyPDF2", "openpyxl"],
    "include_files": [("dist", "dist"), (".env", ".env")],
    "excludes": ["tkinter", "PyQt5", "PySide2", "IPython", "jupyter"]
}

base = "gui" if sys.platform == "win32" else None

setup(
    name="TechConsult-AI",
    version="1.0",
    description="TechConsult AI Report Generator",
    options={"build_exe": build_exe_options},
    executables=[Executable("standalone.py", base=base, target_name="TechConsult-AI.exe")]
)
