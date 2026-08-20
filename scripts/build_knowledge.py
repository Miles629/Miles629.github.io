#!/usr/bin/env python3
"""Build a compact, public-only knowledge file for the website assistant."""
import hashlib
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from bs4 import BeautifulSoup, Comment
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
PAGES = ("index.html", "research.html", "news.html", "misc.html", "location.html", "officehours.html")
BASE_URL = os.getenv("SITE_URL", "https://miles629.github.io").rstrip("/")

def clean(text):
    return re.sub(r"\s+", " ", text).strip()

def page_data(filename):
    soup = BeautifulSoup((ROOT / filename).read_text(encoding="utf-8"), "html.parser")
    for node in soup(["script", "style", "nav", "header", "footer", "noscript", "template"]): node.decompose()
    for node in soup.select(".ama-chat"): node.decompose()
    for node in soup.find_all(string=lambda value: isinstance(value, Comment)): node.extract()
    for node in soup.select("[hidden], [aria-hidden='true']"): node.decompose()
    for node in soup.find_all(style=True):
        if re.search(r"display\s*:\s*none|visibility\s*:\s*hidden", node["style"], re.I): node.decompose()
    title = clean(soup.title.get_text(" ") if soup.title else filename) .replace(" - Caoyuan Ma", "")
    root = soup.find("main") or soup.body
    sections, current = [], {"heading": title, "parts": []}
    for element in root.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "ul", "span", "div", "a"]):
        if element.name in ("h1", "h2", "h3", "h4", "h5", "h6"):
            if current["parts"]: sections.append(current)
            current = {"heading": clean(element.get_text(" ")), "parts": []}
        elif element.name == "a":
            href, label = element.get("href", ""), clean(element.get_text(" "))
            if href and label and not href.startswith(("#", "mailto:", "javascript:")):
                current["parts"].append(f"Link: {label} ({href})")
        elif element.name in ("div", "ul"):
            # Keep only direct text: nested headings/paragraphs are handled separately.
            text = clean(" ".join(str(value) for value in element.find_all(string=True, recursive=False)))
            if text: current["parts"].append(text)
        else:
            text = clean(element.get_text(" "))
            if text: current["parts"].append(text)
    if current["parts"]: sections.append(current)
    clean_sections = []
    for number, section in enumerate(sections, 1):
        text = clean(" ".join(dict.fromkeys(section["parts"])))
        if text:
            clean_sections.append({"id": f"{Path(filename).stem}-{number}", "heading": section["heading"], "text": text})
    return {"title": title, "url": f"{BASE_URL}/{filename}", "sections": clean_sections}

def git_version():
    if os.getenv("GITHUB_SHA"): return os.environ["GITHUB_SHA"]
    try: return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    except Exception: return hashlib.sha256("".join(PAGES).encode()).hexdigest()[:12]

def cv_data():
    reader = PdfReader(str(ROOT / "assets" / "CV-Mcy.pdf"))
    text = clean(" ".join(page.extract_text() or "" for page in reader.pages))
    return {"title": "CV", "url": f"{BASE_URL}/assets/CV-Mcy.pdf", "sections": [{"id": "cv-1", "heading": "Curriculum Vitae", "text": text}]}

def main():
    pages = [page_data(page) for page in PAGES] + [cv_data()]
    payload = {"version": git_version(), "updatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"), "pages": pages}
    output = ROOT / "ai" / "site-content.json"; output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if not any(page["sections"] for page in pages): raise RuntimeError("No knowledge sections were generated")

if __name__ == "__main__": main()
