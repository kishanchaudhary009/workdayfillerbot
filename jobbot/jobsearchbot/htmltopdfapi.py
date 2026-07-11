import json
import os
import subprocess

def update_html_fields(html_path, output_html_path, summary, skills, experience, projects):
    with open(html_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    # New partial JSON that replaces only summary/skills/experience/projects
    update_data = {
        "summary": summary,
        "skills": skills,
        "experience": experience,
        "projects": projects
    }

    # Replace inside the HTML's existing resumejson object
    # We simply locate "const resumejson = {" and inject dynamic fields

    # ...existing code...
    for key, value in update_data.items():
        replacement = json.dumps(value, indent=4)
        html_content = html_content.replace(f'"{key}": "string"', f'"{key}": {replacement}')
        html_content = html_content.replace(f'"{key}": {{}}', f'"{key}": {replacement}')
# ...existing code...
    
    with open(output_html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    print("Updated HTML generated:", output_html_path)


def html_to_pdf(html_path, pdf_path):
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

    if not os.path.exists(chrome_path):
        chrome_path = r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

    if not os.path.exists(chrome_path):
        raise FileNotFoundError("Chrome not found.")

    abs_html = os.path.abspath(html_path)
    html_url = "file:///" + abs_html.replace("\\", "/")

    cmd = [
        chrome_path,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        "--margin-top=0",
        "--margin-bottom=0",
        "--margin-left=0",
        "--margin-right=0",
        f"--print-to-pdf={pdf_path}",
        html_url
    ]

    subprocess.run(cmd, check=True)
    print("PDF saved at:", pdf_path)



# -----------------------------
#  ▶️ ONLY PASS THESE 4 FIELDS
# -----------------------------
if __name__ == "__main__":
    summary_text = "Software developer skilled in software engineering for Java (Spring Boot), Android, and Applied AIML, who has effectively led team projects, delivered impactful presentations, and resolved complex technical challenges. "

    skills_data = {
        "Programming Languages": ["Python", "C++", "JavaScript"],
        "Frameworks Libraries": ["React", "Node.js", "Express"],
        "Databases": ["MongoDB", "MySQL"],
        "Tools": ["Git", "Docker", "VS Code"],
        "Concepts": ["DSA", "OOP", "OS", "Networking"]
    }

    experience_data = [
        {
            "title": "Android Developer Intern",
            "company": "Mobishaala",
            "dates": "2024",
            "bullets": [
                "•Migrated the entire codebase from Kotlin extensions to ViewBinding, resolving compatibility issues with deprecated libraries such as Markdown mathview and YouTube Player while reducing maintenance overhead.",
                "•Developed two new applications utilizing the MVC pattern, ROOM database, and SMS-based authentication, designing intuitive interfaces with XML and achieving improvement in user onboarding efficiency.",
                "•Utilized WebSockets for real-time audio streaming of conversational voice bots powered by RAG and LLM, reducing response time by 70-80% with AudioTrack for audio streaming."
            ]
        },
        {
            "title": "AI Software Development Intern",
            "company": "Eduplus Campus",
            "dates": "2024",
            "bullets": [
                "•Built and optimized a Python-based answer sheet evaluation system, initially using line-by-line OCR for page segmentation and later upgraded to full-page OCR with Got-OCR2, reducing processing time by 30%.",
                "•Employed regex-based text parsing and NLP sentence similarity models to improve answer evaluation accuracy."
            ]
        }
    ]
    projects_data = [
        {
            "name": "AI-Powered Learning Management System",
            "tech": ["Flask", "ChromaDB", "MERN"],
            "bullets": [
                "•Designed and built an LMS with context-aware assessments utilizing RAG and AI-driven feedback, including voice-cloned viva, improving assessment efficiency and delivering personalized learning experiences to users.",
                "•Developed an immersive 3D virtual classroom by rendering GLB models in the browser using Three.js and integrating WebSockets for audio conferencing, screen sharing, and real-time position tracking, enhancing user engagement.",
                "•Developed a responsive UI using ReactJS, integrated with an ExpressJS backend and MongoDB Atlas database, resulting in improved performance and enhanced user experience."
            ]
        },
        {
            "name": "Open Autonomous Dashboard",
            "tech": ["Spring Boot", "HTML/CSS", "AWS", "Leaflet.js", "AWS RDS", "EC2", "Elastic Beanstalk"],
            "bullets": [
                "•Designed and developed a public monitoring dashboard enabling real-time oversight of traffic lights, street lights, and smart waste bins, enhancing operational efficiency and data accessibility.",
                "•Implemented interactive map navigation using Leaflet.js to enable intuitive asset tracking.",
                "•Integrated AWS RDS with Spring Boot backend to manage and query structured data efficiently.",
                "•Deployed the application on AWS Elastic Beanstalk, leveraging EC2 and load balancing for scalable performance."
            ]
        }
    ]

    update_html_fields("resumemaker2.html", "resume_temp.html",
                       summary_text, skills_data, experience_data, projects_data)
    html_to_pdf("resume_temp.html", r"C:\Users\Hp\Downloads\newcvs\resume.pdf")
