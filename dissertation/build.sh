#!/bin/bash
# Build the dissertation PDF
# Usage: ./build.sh [clean]

cd "$(dirname "$0")"

if [ "$1" = "clean" ]; then
    rm -f *.aux *.bbl *.bcf *.blg *.log *.out *.toc *.lof *.lot *.run.xml *.fls *.fdb_latexmk *.synctex.gz
    echo "Cleaned auxiliary files."
    exit 0
fi

echo "=== Pass 1: pdflatex ==="
pdflatex -interaction=nonstopmode main.tex || true

echo "=== Pass 2: biber ==="
biber main || { echo "Biber failed"; exit 1; }

echo "=== Pass 3: pdflatex ==="
pdflatex -interaction=nonstopmode main.tex || true

echo "=== Pass 4: pdflatex (final) ==="
pdflatex -interaction=nonstopmode main.tex || true

echo "=== Done: main.pdf ==="
