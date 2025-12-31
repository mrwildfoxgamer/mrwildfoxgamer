import fs from "fs";
import fetch from "node-fetch";

const USER = "mrwildfoxgamer";
const TOKEN = process.env.GITHUB_TOKEN;

// Check if TOKEN exists
if (!TOKEN) {
  console.error("ERROR: GITHUB_TOKEN environment variable is not set!");
  process.exit(1);
}

console.log("Starting SVG generation...");

// uptime
const start = new Date("2005-05-11");
const now = new Date();
const diff = now - start;
const days = Math.floor(diff / 86400000);
const years = Math.floor(days / 365);
const months = Math.floor((days % 365) / 30);

const uptime = `${years}y ${months}m ${days % 30}d`;
console.log(`Uptime calculated: ${uptime}`);

// GitHub API
const headers = { 
  Authorization: `token ${TOKEN}`,
  "User-Agent": "GitHub-Profile-SVG-Generator"
};

try {
  console.log("Fetching user data...");
  const user = await fetch(
    `https://api.github.com/users/${USER}`,
    { headers }
  ).then(r => {
    if (!r.ok) throw new Error(`GitHub API error: ${r.status}`);
    return r.json();
  });

  console.log("Fetching repositories...");
  const repos = await fetch(
    `https://api.github.com/users/${USER}/repos?per_page=100`,
    { headers }
  ).then(r => {
    if (!r.ok) throw new Error(`GitHub API error: ${r.status}`);
    return r.json();
  });

  const stars = repos.reduce((a, r) => a + r.stargazers_count, 0);
  console.log(`Stars counted: ${stars}`);

  // Count languages
  const langCount = {};
  repos.forEach(repo => {
    if (repo.language) {
      langCount[repo.language] = (langCount[repo.language] || 0) + 1;
    }
  });

  const topLangs = Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang]) => lang)
    .join(", ");

  console.log(`Top languages: ${topLangs}`);

  // Fetch commits (estimate from events)
  console.log("Fetching events for commit estimation...");
  const events = await fetch(
    `https://api.github.com/users/${USER}/events/public?per_page=100`,
    { headers }
  ).then(r => {
    if (!r.ok) throw new Error(`GitHub API error: ${r.status}`);
    return r.json();
  });

  const pushEvents = events.filter(e => e.type === "PushEvent");
  const recentCommits = pushEvents.reduce((sum, e) => sum + (e.payload.commits?.length || 0), 0);

  // Check if template exists
  if (!fs.existsSync("template.svg")) {
    console.error("ERROR: template.svg not found!");
    process.exit(1);
  }

  // SVG build
  console.log("Building SVG...");
  let svg = fs.readFileSync("template.svg", "utf8");

  // ASCII art (create default if file doesn't exist)
  let asciiArt = "";
  if (fs.existsSync("ascii.txt")) {
    asciiArt = fs.readFileSync("ascii.txt", "utf8");
  } else {
    asciiArt = `
   _____                      
  / ____|                     
 | |  __  __ _ _ __ ___   ___ _ __ 
 | | |_ |/ _\` | '_ \` _ \\ / _ \\ '__|
 | |__| | (_| | | | | | |  __/ |   
  \\_____|\\__,_|_| |_| |_|\\___|_|   
    `;
  }

  svg = svg
    .replace("{{UPTIME}}", uptime)
    .replace("{{REPOS}}", user.public_repos)
    .replace("{{STARS}}", stars)
    .replace("{{COMMITS}}", `${recentCommits}+ recent`)
    .replace("{{TOP_LANGS}}", topLangs || "N/A")
    .replace("{{ASCII}}", asciiArt);

  fs.writeFileSync("profile.svg", svg);
  console.log("✓ profile.svg generated successfully!");

} catch (error) {
  console.error("ERROR:", error.message);
  process.exit(1);
}
