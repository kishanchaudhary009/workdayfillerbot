import subprocess
import os

def html_to_pdf(html_path, pdf_path):
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

    if not os.path.exists(chrome_path):
        chrome_path = r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

    if not os.path.exists(chrome_path):
        raise FileNotFoundError("Chrome not found. Install Chrome or set custom path.")

    # Convert to absolute file:// URL
    abs_html = os.path.abspath(html_path)
    html_url = "file:///" + abs_html.replace("\\", "/")


    cmd = [
        chrome_path,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",   # removes header + footer
        "--margin-top=0",
        "--margin-bottom=0",
        "--margin-left=0",
        "--margin-right=0",
        f'--print-to-pdf={pdf_path}',
        html_url
    ]

    subprocess.run(cmd, check=True)
    print("PDF saved at:", pdf_path)


html_to_pdf("resumemaker.html", r"C:\Users\Hp\Downloads\newcvs\resume.pdf")
