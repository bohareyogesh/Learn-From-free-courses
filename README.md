# Free Course & Certification Finder

A powerful, fully client-side web tool that aggregates **199 free courses and certifications** from **86 providers** across **24 domains** — all in one searchable, filterable interface.

![License](https://img.shields.io/badge/license-MIT-blue)
![Courses](https://img.shields.io/badge/courses-199-brightgreen)
![Providers](https://img.shields.io/badge/providers-86-orange)

## Features

- **199 curated free courses** from top global providers (Google, Microsoft, AWS, IBM, Harvard, MIT, Coursera, edX, Khan Academy, freeCodeCamp, and 76 more)
- **Smart search** — multi-token, debounced search across titles, providers, descriptions, and domains
- **Advanced filters** — filter by provider, domain, certificate availability, AI-focused courses, or bookmarked courses
- **Sorting** — sort by title (A→Z / Z→A) or provider
- **Bookmarks** — save courses to your personal list (persisted in localStorage)
- **Dark / Light theme** — auto-detects system preference, toggle anytime (saved across sessions)
- **Pagination** — 24 courses per page with smart page navigation
- **30 aggregator platform links** — discover thousands more courses beyond the curated list
- **Fully static** — no backend, no database, no API keys required. Just open and use.
- **Responsive** — works on desktop, tablet, and mobile

## Covered Providers

Google · Microsoft · AWS · IBM · Cisco · Coursera · edX · Khan Academy · MIT OCW · Harvard · Stanford · Yale · Princeton · freeCodeCamp · Kaggle · HubSpot Academy · Salesforce · DeepLearning.AI · fast.ai · Hugging Face · MongoDB · The Odin Project · Saylor Academy · HP LIFE · Simplilearn · SoloLearn · Codecademy · Alison · Unity · Neo4j · Redis · Databricks · Snowflake · Fortinet · Palo Alto Networks · and 50+ more.

## Domains

AI & ML · Cloud Computing · Cybersecurity · Data & Analytics · Databases · DevOps · Digital Marketing · Finance & Economics · Game Development · Health & Life Sciences · Humanities & Social Sciences · Information Technology · Leadership & Soft Skills · Mathematics · Mobile Development · Networking · Personal Development · Programming Languages · Project Management · Web Development · and more.

## Getting Started

### Option 1: Open directly

Simply open `free-course-tool/index.html` in your browser. The embedded fallback dataset will load automatically.

> **Note:** Some browsers block local `fetch()` on `file://` URLs. If courses don't load, use Option 2.

### Option 2: Local HTTP server (recommended)

```bash
cd free-course-tool
python -m http.server 8765
```

Then open [http://localhost:8765](http://localhost:8765) in your browser.

## Project Structure

```
free-course-tool/
├── index.html      # UI with embedded CSS (modern responsive design)
├── script.js       # App logic: filtering, search, pagination, bookmarks, theme
└── courses.json    # Course database (199 entries)
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

1. Edit `courses.json` and add a new entry following the schema above.
2. Reload the page — filters and dropdowns auto-populate from the data.

No code changes needed.

## Tech Stack

- **HTML5** + **CSS3** (custom properties, grid, flexbox, animations)
- **Vanilla JavaScript** (ES2017+, no frameworks or build tools)
- **localStorage** for bookmarks and theme persistence
- **Zero dependencies** — no npm, no build step

## License

MIT — free to use, modify, and distribute.
