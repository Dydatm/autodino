#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import argparse
import logging
from pathlib import Path


def setup_logging(verbose: bool):
    level = logging.INFO if verbose else logging.WARNING
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def sniff_dialect(path: Path):
    with path.open("r", newline="", encoding="utf-8", errors="replace") as f:
        sample = f.read(4096)
        f.seek(0)
        try:
            dialect = csv.Sniffer().sniff(sample)
            return dialect
        except Exception:
            class _Dialect(csv.excel):
                delimiter = ","
            return _Dialect()


def normalize_value(val: str):
    if val is None:
        return None
    v = val.strip()
    if not v:
        return ""
    return v.lower()


def process(input_path: Path, output_path: Path, column: str, verbose: bool):
    setup_logging(verbose)

    if not input_path.exists():
        raise FileNotFoundError(f"Fichier introuvable: {input_path}")

    dialect = sniff_dialect(input_path)

    logging.info("Lecture: %s", input_path)
    logging.info("Ecriture: %s", output_path)
    logging.info("Colonne utilisée: %s", column)

    total = 0
    kept = 0
    removed = 0
    seen = set()

    # Compter rapidement le total de lignes (hors en-tête)
    try:
        with input_path.open("r", newline="", encoding="utf-8", errors="replace") as fcount:
            total_lines = sum(1 for _ in fcount)
            total = max(0, total_lines - 1)
            print(f"DEDUP_TOTAL={total}")
    except Exception:
        pass

    with input_path.open("r", newline="", encoding="utf-8", errors="replace") as fin, \
         output_path.open("w", newline="", encoding="utf-8") as fout:

        reader = csv.DictReader(fin, dialect=dialect)
        if column not in reader.fieldnames:
            raise ValueError(
                f"La colonne '{column}' est introuvable. Colonnes disponibles: {reader.fieldnames}"
            )

        writer = csv.DictWriter(
            fout,
            fieldnames=reader.fieldnames,
            dialect=dialect,
            quoting=csv.QUOTE_MINIMAL,
            escapechar="\\"
        )
        writer.writeheader()

        processed = 0
        for idx, row in enumerate(reader, start=2):
            processed += 1
            raw_val = row.get(column, "")
            key = normalize_value(raw_val)

            if key and key in seen:
                removed += 1
                logging.info("Suppression (doublon) ligne %d: %s", idx, raw_val)
                continue

            if key:
                seen.add(key)

            writer.writerow(row)
            kept += 1

            if processed % 5000 == 0:
                logging.info("Avancement: %d lues, %d gardées, %d supprimées", processed, kept, removed)
                print(f"DEDUP_PROGRESS={processed},{kept},{removed}")

    logging.info("Terminé. Lues=%d, Gardées=%d, Supprimées=%d, Uniques=%d",
                 processed, kept, removed, len(seen))
    print(f"DEDUP_REMOVED={removed}")
    print(f"DEDUP_FINAL={kept}")


def main():
    parser = argparse.ArgumentParser(
        description="Supprime les doublons selon une colonne (garde la première occurrence)."
    )
    parser.add_argument("input", help="CSV d'entrée")
    parser.add_argument("output", help="CSV de sortie")
    parser.add_argument("--column", required=True, help="Nom de la colonne à dédupliquer")
    parser.add_argument("--verbose", action="store_true", help="Logs détaillés (INFO)")

    args = parser.parse_args()
    process(Path(args.input), Path(args.output), args.column, args.verbose)


if __name__ == "__main__":
    main()


