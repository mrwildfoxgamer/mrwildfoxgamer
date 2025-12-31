import fs from "fs";
import fetch from "node-fetch";

const USER = "mrwildfoxgamer";
const TOKEN = process.env.GITHUB_TOKEN;

// uptime
const start = new Date("2005-05-11");
const now = new Date();
const diff = now - start;
const days = Math.floor(diff / 86400000);
const years = Math.floor(days / 365);
const months = Math.floor((days % 365) / 30);

const uptime = `${years}y ${months}m ${days % 30}d`;

// GitHub API
const headers = { Authorization: `token ${TOKEN}` };

const user = await fetch(
  `https://api.github.com/users/${USER}`,
  { headers }
).then(r => r.json());

const repos = await fetch(
  `https://api.github.com/users/${USER}/repos?per_page=100`,
  { headers }
).then(r => r.json());

const stars = repos.reduce((a, r) => a + r.stargazers_count, 0);

// SVG build
let svg = fs.readFileSync("template.svg", "utf8");

svg = svg
  .replace("{{UPTIME}}", uptime)
  .replace("{{REPOS}}", user.public_repos)
  .replace("{{STARS}}", stars)
  .replace("{{COMMITS}}", "auto")
  .replace("{{TOP_LANGS}}", "Python, C++, JS")
  .replace("{{ASCII}}", fs.readFileSync("ascii.txt", "utf8"));

fs.writeFileSync("profile.svg", svg);

