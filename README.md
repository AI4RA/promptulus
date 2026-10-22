# AI Literacy Companions

An interactive Shiny app that teaches fundamental skills for working with AI through a cast of animal characters. Each character focuses on one discipline - from deciding whether to use AI at all, to crafting effective prompts, to evaluating the results.

## Live Demo

Visit the deployed app: [https://ai4ra.github.io/promptulus/](https://ai4ra.github.io/promptulus/)

## Characters

The companions are organized into three workflow phases:

### Before AI: Planning
| Character | Animal | Skill |
|-----------|--------|-------|
| **Sequita** | Squirrel | When to Use AI - assesses whether your task needs auditability, or whether a good answer is all that matters |
| **Modulus** | Crab | Task Decomposition - breaks complex tasks into pieces with checkpoints where a human should look |

### During AI: The Four I's
| Character | Animal | Skill |
|-----------|--------|-------|
| **Telosa** | Turtle | Intent Engineering - helps you define clear goals, success criteria, and handoff points |
| **Promptulus** | Owl | Prompt Engineering - reviews and improves your prompts using proven principles |
| **Mnemos** | Elephant | Context Engineering - teaches what context to provide (and what to leave out) |
| **Dialogos** | Parrot | Conversation Management - guides multi-turn interactions |
| **Vitrea** | Frog | AI Transparency - explains how AI tools work and where your data goes |

### After AI: Quality and Reporting
| Character | Animal | Skill |
|-----------|--------|-------|
| **Veridex** | Raccoon | Evaluation - teaches how to check AI outputs |
| **Clarion** | Whale | Reporting - helps document and disclose AI-assisted work |

**Octavius** the Octopus serves as the landing page mascot, introducing the full workflow.

## Two ways to run it

- **GitHub Pages site** (`docs/`): a static, browser-only version. Each visitor enters their own Gemini API key, which stays in their browser and is sent only to Google.
- **Shiny app** (`app/`): the R version, deployable to shinyapps.io, where the key lives on the server.

Both read the same character content. The files in `app/` are the single source of truth; the Pages deploy workflow copies `app/*.md` and `app/www/*.png` into `docs/content/` and `docs/images/` at build time. To preview the site locally, run `scripts/sync_site.sh` first.

## Features

- **Interactive Learning**: Submit task descriptions or prompts and get character-specific feedback
- **Auditability Assessment**: Sequita tells you whether the method matters or only the result does
- **Principle-Based Teaching**: Each character draws from a curated set of principles, varying recommendations to expose different dimensions
- **Cross-Character References**: Characters suggest when to visit other companions for complementary skills

## Local Development

### Prerequisites

- R (version 4.0 or higher)
- RStudio (recommended)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/AI4RA/promptulus.git
   cd promptulus
   ```

2. **Get a free Gemini API key**
   - Visit [Google AI Studio](https://aistudio.google.com/apikey)
   - Click "Create API Key"
   - Copy your API key

3. **Set up your environment**

   Copy `app/.Renviron.example` to `app/.Renviron` and add your key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

   Or enter your key directly in the app's landing page.

4. **Install R dependencies**
   ```r
   # Using renv (recommended)
   renv::restore()

   # Or manually
   install.packages(c("shiny", "shinyjs", "bslib", "ellmer", "here", "rsconnect"))
   ```

5. **Run the app**
   ```r
   shiny::runApp("app")
   ```

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for the full walkthrough, including deployment.

## Deployment to shinyapps.io

```r
rsconnect::deployApp(appDir = "app", appName = "promptulus")
```

See [shinyapps.io](https://www.shinyapps.io/) for account setup. The free tier includes 25 active hours/month.

## Project Structure

```
promptulus/
├── app/                                   # Shiny app and the source of truth for content
│   ├── app.R                              # Main Shiny application
│   ├── <character>_system_prompt.md       # One per character (sequita, modulus, telosa, mnemos,
│   │                                      #   promptulus, dialogos, vitrea, veridex, clarion)
│   ├── <topic>_principles.md              # Principles table injected into each system prompt
│   └── www/                               # Character artwork (web-sized PNGs)
├── docs/                                  # GitHub Pages site (static, browser-only)
│   ├── index.html, css/, js/
│   ├── content/                           # Generated from app/*.md at deploy time (not tracked)
│   └── images/                            # Generated from app/www at deploy time (not tracked)
├── design/                                # Full-resolution artwork and GIMP sources
├── notes/                                 # Design documentation
├── scripts/
│   ├── sync_site.sh                       # Copies app content and images into docs/
│   └── renv_reinstall.R                   # Helper for rebuilding the renv library
├── .github/workflows/deploy-pages.yml     # Builds and deploys the Pages site
├── renv.lock                              # R dependency lockfile
└── README.md
```

## Technologies

- **Shiny** + **bslib**: R framework for web applications
- **ellmer**: R package for LLM interactions (Google Gemini)
- **Google Gemini**: Flash models via the Gemini API. The Pages site uses Gemini 3.8 Flash (set in `docs/js/api.js`); the Shiny app's model is set in `app/app.R`
- **shinyapps.io**: Hosting with secure environment variables

## Cost

Both versions work with Google's free Gemini API tier. Free-tier limits vary by model and change over time; see [Google's rate limits page](https://ai.google.dev/gemini-api/docs/rate-limits) and your AI Studio dashboard for current numbers.

## Contributing

Contributions welcome! See [Issues](../../issues) for current plans.

By submitting a contribution you agree that it will be licensed under the [Apache License, Version 2.0](LICENSE), the same license as the project, and you represent that you have the right to license it under those terms. Contributions keep the attribution in [NOTICE](NOTICE) intact.

## License

Copyright 2025 Nathan Layman.

Licensed under the [Apache License, Version 2.0](LICENSE). The [NOTICE](NOTICE) file carries four attributions: Nathan Layman as the author, the University of Idaho, the AI4RA project, and the National Science Foundation award that funded the work. Under Section 4(d) of the license, anyone who redistributes this software or a derivative work must keep all four. To cite the project, use [CITATION.cff](CITATION.cff).

## Acknowledgments

Promptulus: AI Literacy Companions is a project of [AI4RA](https://github.com/AI4RA) at the University of Idaho. This material is based upon work supported by the National Science Foundation under the GRANTED program, [NSF Award #2427549](https://www.nsf.gov/awardsearch/show-award?AWD_ID=2427549), "Crossing the Innovation Valley of Death: Democratizing Data and Artificial Intelligence for Research Administration." Any opinions, findings, conclusions or recommendations expressed in this material are those of the author and do not necessarily reflect the views of the National Science Foundation.
