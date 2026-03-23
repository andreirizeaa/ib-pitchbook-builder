#!/bin/bash
echo "Starting dev server..."
npm run dev > dev.log 2>&1 &
DEV_PID=$!

echo "Waiting for http://localhost:8000 to be ready..."
npx wait-on http-get://localhost:8000 -t 60000

echo "Running Cypress screenshots spec..."
npx cypress run --spec cypress/e2e/screenshots.cy.ts

echo "Organizing screenshots..."
mkdir -p dissertation/screenshots/web-app
cp cypress/screenshots/screenshots.cy.ts/* dissertation/screenshots/web-app/ 2>/dev/null || echo "No screenshots found to copy"

echo "Cleaning up..."
npm run predev

echo "All done!"
