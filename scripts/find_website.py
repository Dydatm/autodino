#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import argparse
import logging
from pathlib import Path

def setup_logging(verbose: bool):
    level = logging.INFO if verbose else logging.WARNING
    logging.basicConfig(level=level, format='%(asctime)s [%(levelname)s] %(message)s')

def process(input_path: Path, output_path: Path, company_col: str, address_col: str, verbose: bool):
    setup_logging(verbose)
    if not input_path.exists():
        raise FileNotFoundError(f"Fichier introuvable: {input_path}")

    with input_path.open('r', newline='', encoding='utf-8', errors='replace') as fin, \
         output_path.open('w', newline='', encoding='utf-8') as fout:
        reader = csv.DictReader(fin)
        fieldnames = list(reader.fieldnames or [])
        if company_col not in fieldnames or address_col not in fieldnames:
            raise ValueError(f"Colonnes manquantes. Dispo: {fieldnames}")
        if 'website' not in fieldnames:
            fieldnames.append('website')
        writer = csv.DictWriter(fout, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL, escapechar='\\')
        writer.writeheader()

        total = 0
        for row in reader:
            total += 1
            company = (row.get(company_col) or '').strip()
            address = (row.get(address_col) or '').strip()
            # Ici on met une logique simplifiée. À brancher sur une API ou un moteur si besoin.
            guess = ''
            if company:
                slug = company.lower().replace(' ', '').replace("'", '')
                guess = f"www.{slug}.com"
            row['website'] = guess
            writer.writerow(row)
            if total % 1000 == 0:
                print(f"FIND_PROGRESS={total}")

        print(f"FIND_TOTAL={total}")

def main():
    p = argparse.ArgumentParser(description='Trouver un site web à partir de nom entreprise + adresse (démo).')
    p.add_argument('input')
    p.add_argument('output')
    p.add_argument('--company', required=True)
    p.add_argument('--address', required=True)
    p.add_argument('--verbose', action='store_true')
    args = p.parse_args()
    process(Path(args.input), Path(args.output), args.company, args.address, args.verbose)

if __name__ == '__main__':
    main()


