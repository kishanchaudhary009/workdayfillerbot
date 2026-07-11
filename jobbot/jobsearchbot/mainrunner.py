import json
from pathlib import Path

import tkinter as tk
from tkinter import ttk, messagebox

from google import genai

client = genai.Client(api_key="Your_Gemini_API_Key")  # Replace with your actual Gemini API key


# ----------------------------------------------
# HTML + PDF Tools
# ----------------------------------------------
from htmltopdfapi import update_html_fields, html_to_pdf


# ----------------------------------------------
# 🔧 LOAD BASE INFO
# ----------------------------------------------
def load_myinfo():
    return Path("myinfo.txt").read_text(encoding="utf-8")


def load_job_specific_info(choice):
    if choice == "SDE":
        return Path("mysdeproject.txt").read_text(encoding="utf-8")
    elif choice == "Android":
        return Path("myandroidproject.txt").read_text(encoding="utf-8")
    elif choice == "AIML":
        return Path("myaiprojects.txt").read_text(encoding="utf-8")
    return ""


# ----------------------------------------------
# 🔧 FIXED JSON PATTERN
# ----------------------------------------------
# This defines the EXACT format LLM should return. 
BASE_PATTERN_JSON = { 
    "summary": "Software developer skilled in software engineering for Java (Spring Boot), Android, and Applied AIML, who has effectively led team projects, delivered impactful presentations, and resolved complex technical challenges. ", 
    "skills": { 
        "Programming Languages": ["Python", "C++", "JavaScript"], 
        "Frameworks Libraries": ["React", "Node.js", "Express"], 
        "Databases": ["MongoDB", "MySQL"], "Tools": ["Git", "Docker", "VS Code"], 
        "Concepts": ["DSA", "OOP", "OS", "Networking"] 
        }, 
    "experience": [ 
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
    ], 
    "projects": [ 
        { 
         "name": "AI-Powered Learning Management System", 
         "tech": ["Flask", "ChromaDB", "MERN"], 
         "bullets": [ 
             "•Designed and built an LMS with context-aware assessments utilizing RAG and AI-driven feedback, including voice-cloned viva, improving assessment efficiency and delivering personalized learning experiences to users.", 
             "•Developed an immersive 3D virtual classroom by rendering GLB models in the browser using Three.js and integrating WebSockets for audio conferencing, screen sharing, and real-time position tracking, enhancing user engagement.", 
             "•Developed a responsive UI using ReactJS, integrated with an ExpressJS backend and MongoDB Atlas database, resulting in improved performance and enhanced user experience." 
             ] 
        }, { 
            "name": "Open Autonomous Dashboard", 
            "tech": ["Spring Boot", "HTML/CSS", "AWS", "Leaflet.js", "AWS RDS", "EC2", "Elastic Beanstalk"], 
            "bullets": [ 
                "•Designed and developed a public monitoring dashboard enabling real-time oversight of traffic lights, street lights, and smart waste bins, enhancing operational efficiency and data accessibility.", 
                        "•Implemented interactive map navigation using Leaflet.js to enable intuitive asset tracking.", "•Integrated AWS RDS with Spring Boot backend to manage and query structured data efficiently.", 
                        "•Deployed the application on AWS Elastic Beanstalk, leveraging EC2 and load balancing for scalable performance." 
            ] 
        } 
    ] 
}

# ----------------------------------------------
# 🔧 PROMPT BUILDER
# ----------------------------------------------
def build_prompt(jd: str, combined_info: str):
    pattern = json.dumps(BASE_PATTERN_JSON, indent=4)

    return f"""
You are an ATS Resume Optimization Expert.

STRICTLY return JSON following this pattern:
{pattern}
note , the given pattern json is only for reference, for project include the projects only from my info given below, no need to add the above ones compulsaryly.
Rewrite ONLY:
1. summary
2. skills
3. experience
4. projects

Rules:
- Follow JSON structure exactly.
- Skills must match JD but only those I know.
- Experience and projects should be rewritten using JD keywords.
- In projects tech, only add 3-4 technologies that also relvent to role.
- DO NOT invent any skills or experience.
- Do not change my job titles, companies, or dates.
Below are most imp rules and compulsary
- For Internship Limit 1 IMP internships bullets to 3, and Other to 2 bullets only, also rank them according to role in output.
- For Projects Limit both to 3 bullets only, and rank them according to role in output.
- Summary keep only 2 points which fit in 2 lines, so aroiund 20 words and concise but powerfull and relevant to JD.
- Try to qunatify impact whereever possible in all sections.

-------------- JOB DESCRIPTION ----------------
{jd}

------------------ MY INFO --------------------
{combined_info}

Return ONLY JSON. No explanation.
"""


# ----------------------------------------------
# 🔧 GEMINI CALLER
# ----------------------------------------------


def ask_gemini(prompt: str):
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    text = response.text.strip()
    print("\nGemini Response:\n", text)

    # --- FIX: Clean JSON ---
    if text.startswith("```"):
        parts = text.split("```")
        if len(parts) >= 2:
            text = parts[1]  # inside the block
        text = text.replace("json", "", 1).strip()

    # Now parse safely
    return json.loads(text)



# ----------------------------------------------
# 🔧 ATS GENERATION FUNCTION
# ----------------------------------------------
def generate_resume():
    job_type = jobtype_var.get()
    jd = jd_text.get("1.0", tk.END).strip()

    if not jd:
        messagebox.showerror("Error", "Please paste the Job Description!")
        return

    messagebox.showinfo("Processing", "Generating your ATS optimized resume...\nThis may take a few seconds.")

    # Load info
    base_info = load_myinfo()
    extra_info = load_job_specific_info(job_type)
    combined_info = base_info + "\n\n" + extra_info

    # Build prompt
    prompt = build_prompt(jd, combined_info)

    # Ask Gemini
    optimized_json = ask_gemini(prompt)

    # Save JSON
    Path("ats_out.json").write_text(
        json.dumps(optimized_json, indent=4),
        encoding="utf-8"
    )

    summary = optimized_json["summary"]
    skills = optimized_json["skills"]
    experience = optimized_json["experience"]
    projects = optimized_json["projects"]

    # Update HTML + convert to PDF
    update_html_fields(
        "resumemaker2.html",
        "resume_temp.html",
        summary,
        skills,
        experience,
        projects
    )

    html_to_pdf("resume_temp.html", r"C:\Users\Hp\Downloads\newcvs\resume.pdf")

    messagebox.showinfo("Success", "🎉 Your ATS-optimized resume is ready: resume.pdf")


# ----------------------------------------------
#  🖥️ TKINTER UI
# ----------------------------------------------
root = tk.Tk()
root.title("ATS Resume Generator")
root.geometry("700x600")
root.resizable(False, False)

# Title
title_lbl = tk.Label(root, text="ATS Resume Generator (Gemini)", font=("Arial", 20, "bold"))
title_lbl.pack(pady=10)

# Job Type Dropdown
jobtype_var = tk.StringVar()
jobtype_var.set("SDE")

job_lbl = tk.Label(root, text="Select Job Type:", font=("Arial", 12))
job_lbl.pack(pady=5)

job_dropdown = ttk.Combobox(root, textvariable=jobtype_var, values=["SDE", "Android", "AIML"], state="readonly", font=("Arial", 12))
job_dropdown.pack(pady=5)

# JD Label
jd_lbl = tk.Label(root, text="Paste Job Description:", font=("Arial", 12))
jd_lbl.pack(pady=5)

# JD Textbox
jd_text = tk.Text(root, height=18, width=80, font=("Arial", 11), wrap="word", bd=2, relief="groove")
jd_text.pack(pady=5)

# Generate Button
generate_btn = tk.Button(root, text="Generate Resume", command=generate_resume,
                         font=("Arial", 14, "bold"), bg="#4CAF50", fg="white", padx=20, pady=10)
generate_btn.pack(pady=20)

root.mainloop()
