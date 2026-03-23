# Dissertation Writing Rules

## Writing Style

All writing in this directory MUST follow Andrei's style guide. The key rules:

- **No first person.** Never use "I", "we", "my", "our". Rephrase with active voice or passive where needed.
- **Active voice by default.** Passive only when the actor is unknown or irrelevant.
- **Short sentences.** 15-25 words typical. One idea per sentence.
- **Simple words.** "use" not "utilise", "show" not "demonstrate", "because" not "due to the fact that". See full list in style guide below.
- **British English.** -ise, -our, -re spellings. Single quotes. Oxford comma. Day Month Year dates.
- **Lead with the point.** Topic sentence first, then evidence.
- **Honest about limitations.** No hedging, no puffery. State things directly.
- **Conversational but professional.** It should sound like a competent person explaining, not a textbook.

## Words to NEVER Use

utilise, facilitate, leverage (verb), paradigm, synergy, holistic, robust, encompass, subsequently, prior to, in order to, due to the fact that, aforementioned, elucidate, promulgate, it is important to note that, it should be noted that, serves to, functions to, plays a role in, has the ability to, is able to

## Transitions to Prefer

This is because, That said, On top of that, The key point is, In other words, Put simply, More specifically, For example, However, At the same time, In practice, The result is, This means that

## Transitions to Avoid

Furthermore, Moreover, Nevertheless, Notwithstanding, Henceforth, Thereby, Wherein, Whereby

## Humanizer Pass

Before finalising any text, check for and remove:
- Inflated significance ("serves as a testament", "pivotal moment")
- Superficial -ing analyses ("highlighting", "underscoring", "showcasing")
- Promotional language ("vibrant", "groundbreaking", "breathtaking")
- Rule of three patterns
- Em dash overuse
- Negative parallelisms ("not just X, but Y")
- AI vocabulary (delve, landscape, tapestry, interplay, intricate)
- Vague attributions ("experts believe", "industry reports suggest")
- Generic positive conclusions

## LaTeX Compilation

**CRITICAL: Always build after EVERY change, BEFORE responding to the user.** Never say "done" without a successful build.

Full build (with references):
```bash
cd /Users/andreirizea/ai-pitchdeck-builder/dissertation && ./build.sh
```

Quick build (no reference updates):
```bash
cd /Users/andreirizea/ai-pitchdeck-builder/dissertation && pdflatex -interaction=nonstopmode main.tex
```

## Structure

The dissertation follows the IOT635 assessment brief structure:
1. Cover Sheet
2. Abstract
3. Table of Contents
4. Introduction, Scope and Context
5. Methodology and Project Plan
6. Preliminary Research and Design Documentation
7. Project Implementation and Outcomes
8. Evaluation and Conclusions
9. References (Harvard/author-year via biblatex)
10. Appendices (including KSB Mapping)

## Tech Stack (Actual)

The report must reflect what was actually built:
- **Backend:** TypeScript, Express.js, Node.js
- **Frontend:** Next.js (React), TypeScript
- **Office Add-in:** Vite + React + Office.js (PowerPoint taskpane add-in)
- **LLM:** OpenAI GPT-4o (content planning), GPT-4o-mini (AI chat)
- **PPTX Generation:** PptxGenJS
- **Template Parsing:** JSZip + xml2js (XML extraction from .pptx)
- **Slide Previews:** LibreOffice headless + pdftoppm
- **Database:** Supabase (PostgreSQL)
- **Data Sources:** Yahoo Finance (yahoo-finance2), SEC EDGAR
- **Auth:** Supabase Auth with cookie-based sessions
- **Monorepo:** Turborepo with shared-types package
- **CI/CD:** GitHub Actions
- **Deployment:** Vercel (web), Render (service)
