# GitHub User Search

A portfolio-ready frontend project that searches GitHub users and presents profile insights with a modern, responsive UI.

## Overview

GitHub User Search helps users quickly explore public GitHub profiles by username.  
It fetches live data from the GitHub REST API and displays profile details, top repositories, and useful account signals in an interactive interface.

## Highlights

- Live GitHub user search
- Rich profile view (avatar, bio, company, website, followers, following)
- Top repositories section with sorting options
- Sort repositories by:
    - Recently updated
    - Most stars
    - Most forks
- Recent searches saved in local storage
- One-click copy profile link
- Theme toggle (dark/light)
- Shareable profile URL support using query params (`?user=octocat`)
- Helpful error handling for:
    - Invalid username
    - API rate limits
    - General network/request issues
- Fully responsive design for mobile and desktop

## Tech Stack

- HTML5
- CSS3 (custom properties, responsive layout, animations)
- Vanilla JavaScript (ES6+)
- GitHub REST API

## Project Structure

```text
github_search/
|-- index.html
|-- README.md
|-- .gitignore
`-- assets/
        |-- css/
        |   `-- style.css
        `-- js/
                `-- app.js
```

## Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/Sohailqureshi9/Github-Profile-Search-js.git
cd Github-Profile-Search-js
```

### 2. Run Project

Open `index.html` directly in browser, or run with VS Code Live Server for best development experience.

## Deployment

This is a static project and can be deployed easily on:

- GitHub Pages
- Netlify
- Vercel

### GitHub Pages Quick Deploy

1. Push code to your GitHub repository.
2. Go to repository Settings.
3. Open Pages section.
4. Set source branch to `main` (root).
5. Save and wait for deployment URL.

## API Reference

This project uses:

- `GET https://api.github.com/users/{username}`
- `GET https://api.github.com/users/{username}/repos`

Note: GitHub applies rate limits for unauthenticated requests.

## Why This Project Is Portfolio-Worthy

- Real-world API integration
- State handling in pure JavaScript
- Local storage persistence
- URL-driven search state
- UI/UX polish with responsive and themed design

## Author

Sohail Qureshi

## License

This project is open source and available under the MIT License.
