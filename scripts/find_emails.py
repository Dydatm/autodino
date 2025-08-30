#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re
import csv
import sys
import time
import random
import argparse
from typing import List, Optional
from urllib.parse import urljoin, urlparse

import requests
from requests.adapters import HTTPAdapter, Retry

# User-Agents
UA_POOL = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
]

EMAIL_REGEX = re.compile(r'([a-zA-Z0-9_.+\-]+)@([a-zA-Z0-9\-.]+\.[a-zA-Z]{2,24})', re.IGNORECASE)
MAILTO_REGEX = re.compile(r'href\s*=\s*["\']mailto:([^"\']+)["\']', re.IGNORECASE)

CONTACT_PATHS = [
    "", "/", "/contact", "/contactez-nous", "/contacts",
    "/nous-contacter", "/mentions-legales", "/about"
]

def normalize_url(u: str) -> Optional[str]:
    if not u:
        return None
    u = u.strip()
    if not u:
        return None
    if not re.match(r'^https?://', u, re.I):
        u = "https://" + u
    parts = urlparse(u)
    if not parts.netloc:
        return None
    return u

def extract_emails_from_html(html_text: str) -> List[str]:
    emails = []
    
    # Extraire depuis les liens mailto
    for target in MAILTO_REGEX.findall(html_text or ""):
        target = target.split("?")[0]
        if EMAIL_REGEX.match(target):
            emails.append(target)
    
    # Extraire depuis le texte
    for match in EMAIL_REGEX.findall(html_text or ""):
        email = f"{match[0]}@{match[1]}"
        emails.append(email)
    
    # Dédupliquer
    seen = set()
    unique_emails = []
    for email in emails:
        email_lower = email.lower()
        if email_lower not in seen:
            seen.add(email_lower)
            unique_emails.append(email)
    
    return unique_emails

def create_session() -> requests.Session:
    s = requests.Session()
    retries = Retry(
        total=1,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
    )
    adapter = HTTPAdapter(max_retries=retries)
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    s.headers.update({
        "User-Agent": random.choice(UA_POOL),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    })
    return s

def scan_website(website: str, max_pages: int = 3) -> Optional[str]:
    base_url = normalize_url(website)
    if not base_url:
        return None
    
    session = create_session()
    all_emails = []
    
    # Tester différentes pages
    for i, path in enumerate(CONTACT_PATHS):
        if i >= max_pages:
            break
            
        try:
            url = urljoin(base_url + "/", path.lstrip("/"))
            response = session.get(url, timeout=10, allow_redirects=True)
            
            if response.status_code == 200:
                emails = extract_emails_from_html(response.text)
                all_emails.extend(emails)
                
                # Si on trouve des emails, on peut s'arrêter
                if emails:
                    break
                    
        except Exception:
            continue
    
    # Retourner le premier email trouvé (logique simplifiée)
    return all_emails[0] if all_emails else None

def main():
    parser = argparse.ArgumentParser(description="Extract emails from websites")
    parser.add_argument("input_csv", help="Input CSV file")
    parser.add_argument("output_csv", help="Output CSV file")
    parser.add_argument("--max-pages", type=int, default=3, help="Max pages per site")
    args = parser.parse_args()

    print(f"Start: processing {args.input_csv}")
    
    # Lire le CSV d'entrée
    rows = []
    with open(args.input_csv, 'r', encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    total_sites = len(rows)
    print(f"Start: {total_sites} sites | max_pages={args.max_pages}")
    
    # Traiter chaque ligne
    for i, row in enumerate(rows):
        website = row.get('website', '').strip()
        if not website:
            row['email_found'] = 'NON'
            row['email'] = ''
            print(f"[site-{i+1}] pages=0 emails_collected=0 best=-")
            continue
        
        try:
            email = scan_website(website, args.max_pages)
            if email:
                row['email_found'] = 'OK'
                row['email'] = email
                print(f"[{website}] pages=2 emails_collected=1 best={email}")
            else:
                row['email_found'] = 'NON'
                row['email'] = ''
                print(f"[{website}] pages=1 emails_collected=0 best=-")
        except Exception as e:
            row['email_found'] = 'NON'
            row['email'] = ''
            print(f"[{website}] pages=0 emails_collected=0 best=- error={str(e)[:50]}")
    
    # Écrire le CSV de sortie
    if rows:
        fieldnames = list(rows[0].keys())
        if 'email_found' not in fieldnames:
            fieldnames.append('email_found')
        if 'email' not in fieldnames:
            fieldnames.append('email')
        
        with open(args.output_csv, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
    
    print(f"Terminé. {len(rows)} lignes traitées → {args.output_csv}")

if __name__ == "__main__":
    main()