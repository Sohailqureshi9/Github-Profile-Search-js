const usernameInput = document.getElementById("username");
const searchBtn = document.getElementById("searchBtn");
const errorDiv = document.getElementById("error");
const profileDiv = document.getElementById("profile");
const repositoriesDiv = document.getElementById("repositories");
const recentSearchesDiv = document.getElementById("recentSearches");
const statusDiv = document.getElementById("status");
const repoSort = document.getElementById("repoSort");
const repoControls = document.getElementById("repoControls");
const themeToggle = document.getElementById("themeToggle");
const clearRecentBtn = document.getElementById("clearRecentBtn");

const RECENT_SEARCHES_KEY = "github-search-recent-users";
const MAX_RECENT_SEARCHES = 6;
const THEME_KEY = "github-search-theme";
const API_BASE_URL = "https://api.github.com/users";
const CACHE_TTL_MS = 5 * 60 * 1000;

let currentRepositories = [];
let currentProfileUrl = "";
let activeSearchController = null;

const apiCache = new Map();

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function getCachedValue(key) {
    const cached = apiCache.get(key);

    if (!cached) {
        return null;
    }

    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
        apiCache.delete(key);
        return null;
    }

    return cached.value;
}

function setCachedValue(key, value) {
    apiCache.set(key, {
        value,
        timestamp: Date.now()
    });
}

function normalizeUrl(url) {
    if (!url) {
        return "";
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
    }

    return `https://${url}`;
}

function clearState() {
    errorDiv.innerHTML = "";
    profileDiv.innerHTML = "";
    repositoriesDiv.innerHTML = "";
    repoControls.style.display = "none";
}

function showError(message) {
    errorDiv.innerHTML = `<p>${message}</p>`;
    statusDiv.textContent = "";
}

function showLoading() {
    profileDiv.innerHTML = `
        <article class="card loading-card">
            <p>Fetching profile data...</p>
        </article>
    `;
}

function readRecentSearches() {
    try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Unable to parse recent searches:", error);
        return [];
    }
}

function writeRecentSearches(usernames) {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(usernames));
}

function clearRecentSearches() {
    if (activeSearchController) {
        activeSearchController.abort();
        activeSearchController = null;
    }

    localStorage.removeItem(RECENT_SEARCHES_KEY);
    renderRecentSearches();

    clearState();
    usernameInput.value = "";
    statusDiv.textContent = "Recent searches cleared. Screen reset.";
    currentRepositories = [];
    currentProfileUrl = "";
    repoSort.value = "updated";

    const params = new URLSearchParams(window.location.search);
    params.delete("user");
    const newQuery = params.toString();
    const newUrl = newQuery ? `${window.location.pathname}?${newQuery}` : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
}

function setTheme(theme) {
    if (theme === "light") {
        document.body.classList.add("light");
    } else {
        document.body.classList.remove("light");
    }

    localStorage.setItem(THEME_KEY, theme);
}

function initializeTheme() {
    const storedTheme = localStorage.getItem(THEME_KEY);
    setTheme(storedTheme === "light" ? "light" : "dark");
}

function toggleTheme() {
    const isLight = document.body.classList.contains("light");
    setTheme(isLight ? "dark" : "light");
}

function addRecentSearch(username) {
    const normalized = username.toLowerCase();
    const current = readRecentSearches().filter((item) => item !== normalized);
    const updated = [normalized, ...current].slice(0, MAX_RECENT_SEARCHES);
    writeRecentSearches(updated);
    renderRecentSearches();
}

function renderRecentSearches() {
    const recent = readRecentSearches();
    clearRecentBtn.disabled = recent.length === 0;

    if (!recent.length) {
        recentSearchesDiv.innerHTML = "";
        return;
    }

    const chips = recent
        .map((name) => `<button type="button" class="chip" data-username="${name}">${name}</button>`)
        .join("");

    recentSearchesDiv.innerHTML = `
        <p class="recent-title">Recent searches</p>
        <div class="chip-wrap">${chips}</div>
    `;
}

function renderProfile(data) {
    const displayName = escapeHtml(data.name || data.login);
    const safeBlog = normalizeUrl(data.blog);
    const safeLogin = escapeHtml(data.login);

    currentProfileUrl = `https://github.com/${data.login}`;

    profileDiv.innerHTML = `
        <article class="card profile-card">
            <div class="profile-header">
                <img src="${data.avatar_url}" alt="${displayName}" class="avatar">
                <div class="profile-info">
                    <h2>${displayName}</h2>
                    <p class="username">@${safeLogin}</p>
                    ${data.bio ? `<p class="bio">${escapeHtml(data.bio)}</p>` : ""}
                    ${data.location ? `<p class="location">Location: ${escapeHtml(data.location)}</p>` : ""}
                </div>
            </div>

            <div class="profile-actions">
                <button class="btn secondary-btn" type="button" id="copyProfileBtn">Copy Profile Link</button>
            </div>

            <div class="stats">
                <div class="stat">
                    <span class="stat-value">${data.public_repos}</span>
                    <span class="stat-label">Repositories</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${data.followers}</span>
                    <span class="stat-label">Followers</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${data.following}</span>
                    <span class="stat-label">Following</span>
                </div>
            </div>

            ${data.company ? `<p class="detail"><strong>Company:</strong> ${escapeHtml(data.company)}</p>` : ""}
            ${safeBlog ? `<p class="detail"><strong>Website:</strong> <a href="${safeBlog}" target="_blank" rel="noopener noreferrer">${escapeHtml(data.blog)}</a></p>` : ""}
            <p class="detail"><strong>Profile:</strong> <a href="https://github.com/${safeLogin}" target="_blank" rel="noopener noreferrer">github.com/${safeLogin}</a></p>
        </article>
    `;

    const copyBtn = document.getElementById("copyProfileBtn");
    if (copyBtn) {
        copyBtn.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(currentProfileUrl);
                statusDiv.textContent = "Profile link copied to clipboard.";
            } catch (error) {
                console.error("Copy failed:", error);
                statusDiv.textContent = "Unable to copy profile link on this browser.";
            }
        });
    }
}

function renderRepositories(repositories) {
    if (!repositories.length) {
        repoControls.style.display = "none";
        repositoriesDiv.innerHTML = `
            <article class="card repositories-card">
                <h3>Top Repositories</h3>
                <p class="repo-empty">No public repositories found.</p>
            </article>
        `;
        return;
    }

    repoControls.style.display = "flex";

    const items = repositories
        .map((repo) => {
            const language = repo.language || "Not specified";
            return `
                <li class="repo-item">
                    <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer">${escapeHtml(repo.name)}</a>
                    <p>${repo.description ? escapeHtml(repo.description) : "No description available."}</p>
                    <div class="repo-meta">
                        <span>Language: ${escapeHtml(language)}</span>
                        <span>Stars: ${repo.stargazers_count}</span>
                        <span>Forks: ${repo.forks_count}</span>
                    </div>
                </li>
            `;
        })
        .join("");

    repositoriesDiv.innerHTML = `
        <article class="card repositories-card">
            <h3>Top Repositories</h3>
            <ul class="repo-list">${items}</ul>
        </article>
    `;
}

function sortRepositories(repositories, sortBy) {
    const sorted = [...repositories];

    if (sortBy === "stars") {
        sorted.sort((a, b) => b.stargazers_count - a.stargazers_count);
    } else if (sortBy === "forks") {
        sorted.sort((a, b) => b.forks_count - a.forks_count);
    } else {
        sorted.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    }

    return sorted.slice(0, 6);
}

function updateStatus(data) {
    const joined = data.created_at ? new Date(data.created_at).getFullYear() : "N/A";
    statusDiv.textContent = `Viewing ${data.login} | Public repos: ${data.public_repos} | GitHub since: ${joined}`;
}

async function fetchGitHubUser(username) {
    const cacheKey = `user:${username.toLowerCase()}`;
    const cached = getCachedValue(cacheKey);
    if (cached) {
        return cached;
    }

    const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(username)}`, {
        signal: activeSearchController?.signal
    });

    if (response.status === 404) {
        throw new Error("not-found");
    }

    if (response.status === 403) {
        throw new Error("rate-limit");
    }

    if (!response.ok) {
        throw new Error("request-failed");
    }

    const data = await response.json();
    setCachedValue(cacheKey, data);
    return data;
}

async function fetchTopRepositories(username) {
    const cacheKey = `repos:${username.toLowerCase()}`;
    const cached = getCachedValue(cacheKey);
    if (cached) {
        return cached;
    }

    const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`, {
        signal: activeSearchController?.signal
    });

    if (!response.ok) {
        return [];
    }

    const repositories = await response.json();
    setCachedValue(cacheKey, repositories);
    return repositories;
}

async function searchUser() {
    const username = usernameInput.value.trim();
    clearState();

    if (!username) {
        showError("Please enter a GitHub username.");
        return;
    }

    if (activeSearchController) {
        activeSearchController.abort();
    }
    activeSearchController = new AbortController();

    searchBtn.disabled = true;
    searchBtn.textContent = "Searching...";
    statusDiv.textContent = "Searching profile...";
    showLoading();

    try {
        const [userData, repositories] = await Promise.all([
            fetchGitHubUser(username),
            fetchTopRepositories(username)
        ]);

        renderProfile(userData);
        updateStatus(userData);
        currentRepositories = repositories;
        renderRepositories(sortRepositories(currentRepositories, repoSort.value));
        addRecentSearch(username);

        const params = new URLSearchParams(window.location.search);
        params.set("user", userData.login);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, "", newUrl);
    } catch (error) {
        if (error.name === "AbortError") {
            return;
        }

        profileDiv.innerHTML = "";
        repositoriesDiv.innerHTML = "";

        if (error.message === "not-found") {
            showError("User not found. Please check the username and try again.");
        } else if (error.message === "rate-limit") {
            showError("GitHub API rate limit reached. Please wait a few minutes and try again.");
        } else {
            showError("Something went wrong while fetching data. Please try again.");
        }

        console.error("GitHub search error:", error);
    } finally {
        activeSearchController = null;
        searchBtn.disabled = false;
        searchBtn.textContent = "Search";
    }
}

function bootFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const user = params.get("user");

    if (user) {
        usernameInput.value = user;
        searchUser();
    }
}

searchBtn.addEventListener("click", searchUser);
usernameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        searchUser();
    }
});

recentSearchesDiv.addEventListener("click", (event) => {
    const chipButton = event.target.closest(".chip");
    if (!chipButton) {
        return;
    }

    usernameInput.value = chipButton.dataset.username || "";
    searchUser();
});

repoSort.addEventListener("change", () => {
    if (currentRepositories.length) {
        renderRepositories(sortRepositories(currentRepositories, repoSort.value));
    }
});

themeToggle.addEventListener("click", toggleTheme);
clearRecentBtn.addEventListener("click", clearRecentSearches);

initializeTheme();
renderRecentSearches();
bootFromUrl();
