# Setup Guide

## Getting Your Gemini API Key

### 1. Visit Google AI Studio
Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

### 2. Sign in with Google
Use your Google account to sign in.

### 3. Create API Key
- Click "Create API Key"
- Select "Create API key in new project" (or choose an existing project)
- Copy the generated API key

### 4. Keep it secure!
- Never commit your API key to git
- `.env` and `.Renviron` files are already in `.gitignore` to prevent this
- Don't share your API key publicly

## Local Development Setup

### Quick Start
```bash
# 1. Copy the example env file
cp .env.example .env

# 2. Edit .env and add your API key
# Replace 'your_api_key_here' with your actual key from Google AI Studio

# 3. Install R packages
# Open R or RStudio and run:
renv::restore()
# or, without renv:
install.packages(c("shiny", "shinyjs", "bslib", "ellmer", "here", "rsconnect", "dotenv"))

# 4. Run the app
# In R console from project root:
shiny::runApp("app")
```

The project `.Rprofile` loads `.env` through the `dotenv` package when you start R from the repository root. You can also skip the file and paste your key into the app's landing page.

### Previewing the GitHub Pages site locally

The site in `docs/` reads the character content and artwork from `docs/content/` and `docs/images/`. Those folders are generated from `app/` and are not tracked in git, so sync them first:

```bash
scripts/sync_site.sh
cd docs && python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000). Edit the files in `app/`, rerun the sync script, and reload.

## shinyapps.io Deployment

Deploy your app to shinyapps.io to keep your API key secure on the server.

### Prepare for Deployment

Before deploying, set up your `.Renviron` file in the app folder:

```bash
# Copy the example file
cp app/.Renviron.example app/.Renviron

# Edit app/.Renviron and add your API key
# GEMINI_API_KEY=your_actual_api_key_here
```

**Important**: The `app/.Renviron` file will be deployed with your app to shinyapps.io and is how your app accesses the API key on the server.

### Create Account

1. Go to [shinyapps.io](https://www.shinyapps.io/)
2. Sign up for a free account
3. Free tier includes:
   - 5 applications max
   - 25 active hours/month
   - 1 GB RAM per app

### Configure rsconnect

1. Log in to [shinyapps.io](https://www.shinyapps.io/)
2. Click your name (top right), then **Tokens**
3. Click **Show** then **Show Secret**
4. Copy the entire command and run it in R:

   ```r
   rsconnect::setAccountInfo(name='your-name',
                             token='YOUR_TOKEN',
                             secret='YOUR_SECRET')
   ```

### Deploy

```r
# From the project root directory
rsconnect::deployApp(appDir = "app", appName = "promptulus")
```

First deployment takes a few minutes. Your app will be live at:
```
https://your-name.shinyapps.io/promptulus/
```

### Update Your App

After making changes:

```r
rsconnect::deployApp(appDir = "app", appName = "promptulus")
```

### Manage Apps

- **Dashboard**: [shinyapps.io/admin](https://www.shinyapps.io/admin/)
- **Logs**: Click your app, then the Logs tab
- **Usage**: Monitor active hours remaining
- **Archive**: Free up slots for new apps

## GitHub Pages Deployment

The site deploys automatically. A push to `main` that touches `docs/`, `app/*.md`, or `app/www/` runs `.github/workflows/deploy-pages.yml`, which copies the content and artwork from `app/` into `docs/` and publishes the result. No repository secret is needed: visitors supply their own Gemini API key in the browser.

To enable it on a fork, open the repository Settings, then Pages, and set the source to **GitHub Actions**.

## Troubleshooting

### "GEMINI_API_KEY not set" error locally
- Make sure you created the `.env` file (copy from `.env.example`)
- Make sure you added your actual API key (not the placeholder text)
- Restart your R session after editing `.env`

### The GitHub Pages site did not update
- Check the Actions tab for the "Deploy to GitHub Pages" run and its logs
- Confirm Pages is enabled with "GitHub Actions" as the source
- The workflow only runs when `docs/`, `app/*.md`, or `app/www/` change; use "Run workflow" on the Actions tab to force a deploy

### App loads but doesn't respond
- Check browser console for errors (F12 in most browsers)
- API key might be invalid or expired
- You might have hit a free-tier rate limit

### Rate limits
Free-tier limits differ by model and change over time. Check [Google's rate limits page](https://ai.google.dev/gemini-api/docs/rate-limits) and the usage view in AI Studio for the current numbers. If you hit a limit, wait a few minutes and try again, or switch to a model with a higher free-tier allowance.

## Security Note

**GitHub Pages site**: runs entirely in the browser. Each visitor enters their own API key, which is kept in that browser session and sent only to Google's Gemini API. No key is stored in the repository or on a server.

**Shiny app**: the key is read from `app/.Renviron` on the server and never reaches the browser.

In both cases, do not enter sensitive, confidential, or personally identifiable information into the characters unless your institution has an agreement with Google that covers it. The inputs are processed by a third-party AI service.

## Next Steps

Once your app is running:
1. Try submitting different tasks and prompts to each character
2. Iterate based on the feedback
3. Customize a character by editing its `*_principles.md` table in `app/`
4. Change how a character behaves by editing its `*_system_prompt.md` in `app/`

## Getting Help

If you run into issues:
1. Check the troubleshooting section above
2. Review the GitHub Actions logs if the site did not deploy
3. Check the browser console if the app loads but does not work
