import os
import sys
import pandas as pd
from serpapi import GoogleSearch
from dotenv import load_dotenv

# ✅ Unicode fix for Windows
sys.stdout.reconfigure(encoding='utf-8')

# ✅ Load API key securely
load_dotenv()
API_KEY = os.getenv("SERPAPI_KEY")

if not API_KEY:
    print("❌ Missing SERPAPI_KEY in .env file! Please set it in .env")
    exit()

print("🔍 Searching Google for LinkedIn Software Intern jobs in India (strictly past 24 hours)...")

# 🔍 Strict 24-hour filter using 'tbs=qdr:d'
params = {
    "engine": "google",
    "q": 'site:linkedin.com/jobs/view "Software Intern" India',
    "tbs": "qdr:d",   # ✅ qdr:d = past 24 hours only
    "num": 40,
    "api_key": API_KEY
}

search = GoogleSearch(params)
results = search.get_dict()

if "error" in results:
    print(f"❌ API Error: {results['error']}")
    exit()

organic_results = results.get("organic_results", [])
if not organic_results:
    print("⚠️ No jobs found in the last 24 hours for India.")
    exit()

# 🧩 Extract real jobs
companies = {}
for result in organic_results:
    title = result.get("title", "")
    link = result.get("link", "")
    snippet = result.get("snippet", "")

    if "linkedin.com/jobs/view" not in link:
        continue  # skip non-job links

    # Extract company name from title
    company_name = "Unknown"
    if "at " in title:
        company_name = title.split("at ")[-1].split(" |")[0].strip()
    elif "-" in title:
        company_name = title.split("-")[-1].strip()

    companies.setdefault(company_name, {"job_count": 0, "company_link": link})
    companies[company_name]["job_count"] += 1

# 🧩 Get approximate company info
def get_linkedin_members(company):
    params = {
        "engine": "google",
        "q": f"site:linkedin.com/company {company} employees",
        "api_key": API_KEY
    }
    res = GoogleSearch(params).get_dict()
    try:
        snippet = res["organic_results"][0].get("snippet", "")
        return snippet
    except Exception:
        return "Unknown"

print("📊 Fetching company size info...")
company_list = []
for company, data in companies.items():
    members = get_linkedin_members(company)
    company_list.append((company, data["job_count"], members, data["company_link"]))

df = pd.DataFrame(company_list, columns=["Company", "Job Count", "LinkedIn Members", "Company Link"])
df["Estimated Members"] = (
    df["LinkedIn Members"]
    .str.extract(r'(\d[\d,]*)')
    .fillna(0)
    .replace(',', '', regex=True)
    .astype(int)
)

# 🧩 Sort and keep only top 10
df = df.sort_values("Estimated Members", ascending=False).head(10)

# ✅ Save results
csv_path = os.path.join(os.getcwd(), "software_intern_jobs_india_24hr.csv")
df.to_csv(csv_path, index=False, encoding="utf-8-sig")

print("\n✅ Results saved to:", csv_path)
print(df.to_string(index=False))
