import json
import re
import sys
from pathlib import Path
from urllib.parse import quote

from flask import Flask, jsonify, request, send_file
from google import genai

sys.path.append(str(Path(__file__).resolve().parent))
from htmltopdfapi import update_html_fields, html_to_pdf

app = Flask(__name__)
ROOT = Path(__file__).resolve().parent
BASE_HTML = ROOT / 'resumemaker2.html'
client = genai.Client(api_key="your_gemini_api_key")

BASE_PATTERN_JSON = {
    "summary": "Software developer skilled in software engineering for Java, Android, and Applied AIML, with strong delivery and problem-solving experience.",
    "skills": {
        "Programming Languages": ["Python", "JavaScript", "TypeScript"],
        "Frameworks Libraries": ["React", "Node.js", "Express"],
        "Databases": ["MongoDB", "MySQL"],
        "Tools": ["Git", "Docker", "VS Code"],
        "Concepts": ["DSA", "OOP", "OS", "Networking"],
    },
    "experience": [
        {
            "title": "Software Developer Intern",
            "company": "Your Company",
            "dates": "2024",
            "bullets": [
                "Built and shipped reliable products using modern engineering practices.",
                "Improved team delivery speed through thoughtful implementation and debugging."
            ],
        }
    ],
    "projects": [
        {
            "name": "Project Name",
            "tech": ["Python", "React"],
            "bullets": [
                "Delivered an end-to-end product with measurable user and technical impact.",
                "Applied strong problem-solving and collaboration skills in a real-world project."
            ],
        }
    ],
}


@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response


@app.route('/')
def home():
    return jsonify({
        'status': 'ok',
        'message': 'Resume service is running. Use /generate-resume to create a PDF.'
    })


@app.route('/generate-resume', methods=['POST', 'OPTIONS'])
def generate_resume():
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response

    payload = request.get_json(silent=True) or {}
    jd = (payload.get('jd') or '').strip()
    role = payload.get('role') or 'SDE'
    requested_file_name = sanitize_file_name(payload.get('fileName') or payload.get('filename'))

    if not jd:
        return jsonify({'error': 'Please provide a job description.'}), 400

    try:
        optimized = build_resume_payload(jd, role)
    except Exception as exc:  # pragma: no cover - surfaced to UI
        return jsonify({'error': f'Resume generation failed: {exc}'}), 500

    output_pdf = ROOT / requested_file_name
    temp_html = ROOT / 'resume_temp.html'

    update_html_fields(
        str(BASE_HTML),
        str(temp_html),
        optimized['summary'],
        optimized['skills'],
        optimized['experience'],
        optimized['projects'],
    )
    html_to_pdf(str(temp_html), str(output_pdf))

    response = jsonify({
        'downloadUrl': f'http://127.0.0.1:5000/download?file={quote(requested_file_name)}',
        'fileName': requested_file_name,
    })
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


@app.route('/download')
def download_resume():
    requested_file_name = request.args.get('file', 'resume.pdf')
    safe_file_name = sanitize_file_name(requested_file_name)
    file_path = ROOT / safe_file_name
    if not file_path.exists():
        return jsonify({'error': 'File not found.'}), 404
    return send_file(file_path, as_attachment=True, download_name=safe_file_name, mimetype='application/pdf')


def sanitize_file_name(file_name: str | None) -> str:
    cleaned_name = (file_name or 'resume').strip()
    cleaned_name = cleaned_name.replace('\\', '/').split('/')[-1]
    cleaned_name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '', cleaned_name).strip()
    cleaned_name = cleaned_name or 'resume'
    if not cleaned_name.lower().endswith('.pdf'):
        cleaned_name = f'{cleaned_name}.pdf'
    return cleaned_name


def normalize_role(role: str) -> str:
    normalized = (role or '').strip().lower()
    if normalized in {'ai', 'aiml', 'ai/ml', 'ml', 'machine learning'}:
        return 'AIML'
    if normalized in {'android', 'mobile'}:
        return 'Android'
    return 'SDE'


def load_myinfo() -> str:
    return (ROOT / 'myinfo.txt').read_text(encoding='utf-8')


def load_job_specific_info(choice: str) -> str:
    if choice == 'Android':
        return (ROOT / 'myandroidproject.txt').read_text(encoding='utf-8')
    if choice == 'AIML':
        return (ROOT / 'myaiprojects.txt').read_text(encoding='utf-8')
    return (ROOT / 'mysdeproject.txt').read_text(encoding='utf-8')


def build_prompt(jd: str, combined_info: str) -> str:
    pattern = json.dumps(BASE_PATTERN_JSON, indent=4)
    return f"""
You are an ATS Resume Optimization Expert.

STRICTLY return JSON following this pattern:
{pattern}

Rewrite ONLY:
1. summary
2. skills
3. experience
4. projects

Rules:
- Follow JSON structure exactly.
- Skills must match the JD but only use what I know.
- Experience and projects should be rewritten using JD keywords.
- In projects tech, only add 3-4 relevant technologies.
- Do not invent skills or experience.
- Do not change my job titles, companies, or dates.
- For internships, limit to 3 bullets and rank by relevance.
- For projects, limit to 3 bullets and rank by relevance.
- Summary should be concise, around 2 lines, and relevant to the JD.
- Quantify impact wherever possible.
- For Mobishaal Internship - date = 09/24 - 02/25 , for Eduplus internship - date = 07/24 - 12/24.

-------------- JOB DESCRIPTION ----------------
{jd}

------------------ MY INFO --------------------
{combined_info}

Return ONLY JSON. No explanation.
"""


def ask_gemini(prompt: str) -> dict:
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
    )
    text = response.text.strip()

    if text.startswith('```'):
        parts = text.split('```')
        if len(parts) >= 2:
            text = parts[1]
        text = text.replace('json', '', 1).strip()

    return json.loads(text)


def build_resume_payload(jd: str, role: str = 'SDE') -> dict:
    selected_role = normalize_role(role)
    base_info = load_myinfo()
    extra_info = load_job_specific_info(selected_role)
    combined_info = base_info + '\n\n' + extra_info
    optimized_json = ask_gemini(build_prompt(jd, combined_info))

    return {
        'summary': optimized_json.get('summary', ''),
        'skills': optimized_json.get('skills', {}),
        'experience': optimized_json.get('experience', []),
        'projects': optimized_json.get('projects', []),
        'role': selected_role,
    }


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
