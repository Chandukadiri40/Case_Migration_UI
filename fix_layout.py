import re

file_path = 'D:/MigrationReportTool/UI/MigrationReport/src/index.css'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix layout bounding
content = content.replace(
    ".app-layout-with-sidebar {\n    display: flex;\n    min-height: 100vh;\n  }",
    ".app-layout-with-sidebar {\n    display: flex;\n    height: 100vh;\n    overflow: hidden;\n  }"
)

content = content.replace(
    ".app-main-area {\n    flex: 1;\n    display: flex;\n    flex-direction: column;\n    overflow-x: hidden;\n    background: #f5f5f5;\n  }",
    ".app-main-area {\n    flex: 1;\n    display: flex;\n    flex-direction: column;\n    overflow-x: hidden;\n    overflow-y: auto;\n    background: #f5f5f5;\n    scroll-behavior: smooth;\n  }"
)

# Enable smooth scrolling on HTML
content = content.replace(
    "html, body, #root { \n  height: 100vh; \n  overflow: hidden; /* Lock the viewport strictly to prevent app going out of screen */\n}",
    "html, body, #root { \n  height: 100vh; \n  width: 100vw; \n  overflow: hidden; /* Lock the viewport strictly to prevent app going out of screen */\n  scroll-behavior: smooth;\n}"
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("index.css updated for layout locking and smoothness!")
