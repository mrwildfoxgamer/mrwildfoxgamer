import fs from "fs";
import fetch from "node-fetch";

const USER = "mrwildfoxgamer";
const TOKEN = process.env.GITHUB_TOKEN;

console.log("=".repeat(50));
console.log("GitHub Profile SVG Generator");
console.log("=".repeat(50));

// Check if TOKEN exists
if (!TOKEN) {
  console.error("❌ ERROR: GITHUB_TOKEN environment variable is not set!");
  console.error("Set it with: export GITHUB_TOKEN='your_token_here'");
  process.exit(1);
}

console.log("✓ GitHub Token found");

// uptime
const start = new Date("2006-05-11");
const now = new Date();
const diff = now - start;
const days = Math.floor(diff / 86400000);
const years = Math.floor(days / 365);
const months = Math.floor((days % 365) / 30);

const uptime = `${years}y ${months}m ${days % 30}d`;
console.log(`✓ Uptime calculated: ${uptime}`);

// GitHub API
const headers = { 
  Authorization: `token ${TOKEN}`,
  "User-Agent": "GitHub-Profile-SVG-Generator"
};

async function main() {
  try {
    // Fetch user data
    console.log(`\nFetching data for user: ${USER}...`);
    const userResponse = await fetch(
      `https://api.github.com/users/${USER}`,
      { headers }
    );

    if (!userResponse.ok) {
      throw new Error(`GitHub API error: ${userResponse.status} - ${userResponse.statusText}`);
    }

    const user = await userResponse.json();
    console.log(`✓ User data fetched: ${user.login}`);
    console.log(`  - Public repos: ${user.public_repos}`);

    // Fetch repositories
    console.log("\nFetching repositories...");
    const reposResponse = await fetch(
      `https://api.github.com/users/${USER}/repos?per_page=100&sort=updated`,
      { headers }
    );

    if (!reposResponse.ok) {
      throw new Error(`GitHub API error: ${reposResponse.status} - ${reposResponse.statusText}`);
    }

    const repos = await reposResponse.json();
    const stars = repos.reduce((a, r) => a + r.stargazers_count, 0);
    console.log(`✓ Repositories fetched: ${repos.length}`);
    console.log(`  - Total stars: ${stars}`);

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

    console.log(`✓ Top languages: ${topLangs || "N/A"}`);

    // Fetch recent events for commit estimation
    console.log("\nFetching recent activity...");
    const eventsResponse = await fetch(
      `https://api.github.com/users/${USER}/events/public?per_page=100`,
      { headers }
    );

    let commits = "1000+";
    if (eventsResponse.ok) {
      const events = await eventsResponse.json();
      const pushEvents = events.filter(e => e.type === "PushEvent");
      const recentCommits = pushEvents.reduce((sum, e) => sum + (e.payload.commits?.length || 0), 0);
      commits = `${recentCommits}+ recent`;
      console.log(`✓ Recent commits estimated: ${commits}`);
    } else {
      console.log(`⚠ Could not fetch events, using default commit count`);
    }

    // Check if template exists
    console.log("\nChecking for template file...");
    if (!fs.existsSync("template.svg")) {
      console.error("❌ ERROR: template.svg not found!");
      console.error("Please create template.svg in the current directory");
      process.exit(1);
    }
    console.log("✓ template.svg found");

    // ASCII art - convert to SVG text elements
    let asciiArt = "";
    if (fs.existsSync("ascii.txt")) {
      const asciiContent = fs.readFileSync("ascii.txt", "utf8");
      console.log("✓ ascii.txt loaded");
      
      // Split into lines and convert to SVG <tspan> elements
      const lines = asciiContent.split('\n');
      asciiArt = lines.map((line, index) => {
        // Escape XML special characters
        const escapedLine = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
        return `<tspan x="20" dy="${index === 0 ? '0' : '1.2em'}">${escapedLine}</tspan>`;
      }).join('\n');
    } else {
      console.log("⚠ ascii.txt not found, using default ASCII art");
      const defaultAscii = [
        "  __  __ ____  _       _ _     _ ______         ",
        " |  \\/  |  _ \\| |     (_) |   | |  ____|        ",
        " | \\  / | |_) | |      _| | __| | |__ _____  __ ",
        " | |\\/| |  _ <| | /\\ | | |/ _` |  __/ _ \\ \\/ / ",
        " | |  | | |_) | |/  \\| | | (_| | | | (_) >  <  ",
        " |_|  |_|____/|_/_/\\_\\_|_|\\__,_|_|  \\___/_/\\_\\ "
      ];
      asciiArt = defaultAscii.map((line, index) => {
        return `<tspan x="20" dy="${index === 0 ? '0' : '1.2em'}">${line}</tspan>`;
      }).join('\n');
    }

    // Read and process template
    console.log("\nGenerating SVG...");
    let svg = fs.readFileSync("template.svg", "utf8");

    // Replace all placeholders
    svg = svg
      .replace(/\{\{UPTIME\}\}/g, uptime)
      .replace(/\{\{REPOS\}\}/g, user.public_repos)
      .replace(/\{\{STARS\}\}/g, stars)
      .replace(/\{\{COMMITS\}\}/g, commits)
      .replace(/\{\{TOP_LANGS\}\}/g, topLangs || "N/A")
      .replace(/\{\{ASCII\}\}/g, asciiArt);

    // Write output
    fs.writeFileSync("profile.svg", svg);
    console.log("✓ profile.svg generated successfully!");
    
    // Show summary
    console.log("\n" + "=".repeat(50));
    console.log("Summary:");
    console.log("=".repeat(50));
    console.log(`Uptime:       ${uptime}`);
    console.log(`Repositories: ${user.public_repos}`);
    console.log(`Stars:        ${stars}`);
    console.log(`Commits:      ${commits}`);
    console.log(`Languages:    ${topLangs || "N/A"}`);
    console.log("=".repeat(50));
    console.log("\n✅ Done! Check profile.svg");

  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error("\nStack trace:");
    console.error(error.stack);
    process.exit(1);
  }
}

main();
