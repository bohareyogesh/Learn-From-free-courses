# Free Course & Certification Finder

**Created by Yogesh Mahesh Bohare**

A powerful, fully client-side web tool that aggregates **241 free courses and certifications** (including **76 AI/ML courses**) from **100 providers** across **24 domains** — all in one searchable, filterable interface with **AI-powered course recommendations** and **Smart Auto-Update**.

![License](https://img.shields.io/badge/license-MIT-blue)
![Courses](https://img.shields.io/badge/courses-241-brightgreen)
![AI Courses](https://img.shields.io/badge/AI_courses-76-7c3aed)
![Providers](https://img.shields.io/badge/providers-100-orange)
![Smart Update](https://img.shields.io/badge/Smart_Update-enabled-059669)

## Features

- **241 curated free courses** (76 AI/ML-focused) from top global providers (Google, Microsoft, AWS, IBM, Anthropic, OpenAI, NVIDIA, Harvard, MIT, Stanford, Coursera, edX, Khan Academy, freeCodeCamp, and 90+ more)
- **Works everywhere** — opens directly from your file system (`file://`) or via a local HTTP server, no setup required
- **AI-Powered Course Recommender** — describe what you want to learn and get personalized recommendations using OpenRouter API
- **Smart Auto-Update** — AI-powered internet-connected course discovery and validation:
  - **Find New Courses** — AI searches the internet for newly available free courses and lets you add them
  - **Validate Existing** — AI checks your database for discontinued, moved-to-paid, or broken courses and lets you remove them
  - **Auto-notification** — when online, the tool prompts you to run Smart Update every 24 hours
  - **Persistent changes** — additions and removals are saved in localStorage and survive page reloads
- **Smart search** — multi-token, debounced search across titles, providers, descriptions, and domains
- **Advanced filters** — filter by provider, domain, certificate availability, AI-focused courses, or bookmarked courses
- **Sorting** — sort by title (A→Z / Z→A) or provider
- **Bookmarks** — save courses to your personal list (persisted in localStorage)
- **Dark / Light theme** — auto-detects system preference, toggle anytime (saved across sessions)
- **Pagination** — 24 courses per page with smart page navigation
- **36 aggregator platform links** — discover thousands more courses beyond the curated list
- **Fully static** — no backend, no database required. Just open and use.
- **Responsive** — works on desktop, tablet, and mobile

## Smart Auto-Update

The tool can connect to the internet to keep your course database fresh:

1. Click the **"↻ Smart Update"** button in the filter bar
2. Choose an action:
   - **Find New Courses** — AI discovers free courses available on the internet that aren't in your database yet. Review and click "Add" to include them.
   - **Validate Existing** — AI analyzes your courses and identifies ones that may be discontinued or invalid. Review and click "Remove" to clean up.
3. Changes are stored locally in your browser and persist across sessions.

When you're online and it's been more than 24 hours since your last check, a notification bar appears suggesting a Smart Update.

> **Requires:** An OpenRouter API key (set in AI Recommender settings).

## AI Course Recommender

The tool includes an AI-powered recommendation engine that helps you find the perfect courses:

1. Click the lightning bolt button (bottom-left corner)
2. Set your OpenRouter API key in Settings (get one free at [openrouter.ai/keys](https://openrouter.ai/keys))
3. Describe what you want to learn
4. Get personalized recommendations from the 241-course database

> **Privacy:** Your API key is stored only in your browser's localStorage. It is never included in the source code or sent anywhere except OpenRouter's API.

## Covered Providers

### AI & LLM Providers
Anthropic Academy · OpenAI · NVIDIA DLI · DeepLearning.AI · fast.ai · Hugging Face · Cohere · Mistral AI · Stability AI · Weights & Biases · Google (Gemini) · Meta (PyTorch)

### Tech Giants
Google (13+ courses) · Microsoft (10+ courses) · AWS (6+ courses) · IBM (7+ courses) · Cisco · Salesforce · Meta · Oracle · SAP

### Universities
Harvard · MIT · Stanford · Yale · Princeton · University of Michigan · University of Helsinki · University of Maryland · IIT Madras · IIT Kharagpur

### Learning Platforms
Coursera · edX · Khan Academy · freeCodeCamp · Kaggle · HubSpot Academy · The Odin Project · Saylor Academy · Alison · Simplilearn · SoloLearn · Codecademy · Exercism · Scrimba · MongoDB University · Unity Learn · and more

## Domains

AI & ML · Cloud Computing · Cybersecurity · Data & Analytics · Databases · Design & Creative · DevOps · Digital Marketing · Environmental Science · Finance & Economics · Game Development · Health & Life Sciences · Humanities & Social Sciences · Information Technology · Leadership & Soft Skills · Mathematics · Mobile Development · Networking · Personal Development · Programming Languages · Project Management · Web Development · and more

## Getting Started

### Option 1: Open directly (works everywhere)

Simply open `free-course-tool/index.html` in your browser. All 241 courses load instantly via the bundled `courses-data.js` — no server required, works on any browser and any protocol (`file://` or `http://`).

### Option 2: Local HTTP server

```bash
cd free-course-tool
python -m http.server 8765
```

Then open [http://localhost:8765](http://localhost:8765) in your browser.

## Project Structure

```
free-course-tool/
├── index.html        # UI with embedded CSS (responsive design + AI modal + Smart Update modal)
├── script.js         # App logic: filtering, search, pagination, bookmarks, theme, AI recommender, Smart Update
├── courses-data.js   # All courses as a JS global variable (auto-generated from courses.json, enables file:// loading)
└── courses.json      # Course database (241 entries, canonical source)
```

### How data loading works

The app uses a 3-tier loading strategy to ensure courses load in every environment:

1. **`courses-data.js`** (Priority 1) — loads via `<script>` tag, works on `file://` and `http://`
2. **`courses.json`** (Priority 2) — loaded via `fetch()`, works on HTTP servers
3. **Embedded fallback** (Priority 3) — minimal built-in dataset as a last resort

To update the course database, edit `courses.json` and regenerate `courses-data.js`:

```bash
python -c "
import json
with open('courses.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
with open('courses-data.js', 'w', encoding='utf-8') as f:
    f.write('window.COURSE_DATABASE = ' + json.dumps(data, indent=2, ensure_ascii=False) + ';\\n')
print(f'Generated courses-data.js with {len(data)} courses')
"
```

## Course Data Schema

Each course in `courses.json` follows this structure:

```json
{
  "title": "Course Name",
  "provider": "Provider Name",
  "url": "https://...",
  "description": "What the course covers.",
  "certificate": true,
  "active": true,
  "isAI": false,
  "domains": ["Domain 1", "Domain 2"]
}
```

| Field         | Type       | Description                                |
|---------------|------------|--------------------------------------------|
| `title`       | string     | Course name                                |
| `provider`    | string     | Organization offering the course           |
| `url`         | string     | Direct link to the course                  |
| `description` | string     | Brief description                          |
| `certificate` | boolean    | Whether a certificate is offered           |
| `active`      | boolean    | Whether the course is currently available  |
| `isAI`        | boolean    | *(optional)* AI/ML focused course          |
| `domains`     | string[]   | Subject area tags                          |

## Adding New Courses

### Via Smart Update (recommended)
Click "↻ Smart Update" → "Find New Courses" to let AI discover and suggest new courses from the internet. Approved courses are saved in your browser's localStorage and persist across sessions.

### Manually
1. Edit `courses.json` and add a new entry following the schema above.
2. Regenerate `courses-data.js` using the Python command in the Project Structure section.
3. Reload the page — filters and dropdowns auto-populate from the data.

## Tech Stack

- **HTML5** + **CSS3** (custom properties, grid, flexbox, animations)
- **Vanilla JavaScript** (ES2017+, no frameworks or build tools)
- **OpenRouter API** for AI-powered course recommendations and Smart Update
- **localStorage** for bookmarks, theme, API key, user-added courses, and removed courses
- **Zero dependencies** — no npm, no build step

## Security

- API keys are stored only in the browser's localStorage
- No server-side code — the tool runs entirely client-side
- API keys are never committed to source control
- The tool only communicates with OpenRouter's API when you explicitly trigger AI features

## Author

**Yogesh Mahesh Bohare** — Creator and maintainer of Free Course & Certification Finder.

## License

MIT — free to use, modify, and distribute.
