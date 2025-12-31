import fs from "fs";
import fetch from "node-fetch";

const USER = "mrwildfoxgamer";
const TOKEN = process.env.GITHUB_TOKEN;

console.log("=".repeat(50));
console.log("GitHub Profile SVG Generator (Fixed)");
console.log("=".repeat(50));

if (!TOKEN) {
  console.error("❌ ERROR: GITHUB_TOKEN environment variable is not set!");
  process.exit(1);
}

// ---------------------------------------------------------
// 1. CALCULATE UPTIME
// ---------------------------------------------------------
const start = new Date("2006-05-11");
const now = new Date();
const diff = now - start;
const daysTotal = Math.floor(diff / 86400000);
const years = Math.floor(daysTotal / 365);
const months = Math.floor((daysTotal % 365) / 30);
const days = Math.floor((daysTotal % 365) % 30);

const uptime = `${years}y ${months}m ${days}d`; 
console.log(`✓ Uptime calculated: ${uptime}`);

const headers = { 
  Authorization: `bearer ${TOKEN}`,
  "User-Agent": "GitHub-Profile-SVG-Generator"
};

async function main() {
  try {
    // ---------------------------------------------------------
    // 2. FETCH COMMITS (Via GraphQL for accuracy)
    // ---------------------------------------------------------
    console.log(`\nFetching accurate commit count (GraphQL)...`);
    
    // FIXED: changed stargazersCount -> stargazerCount
    const gqlQuery = {
      query: `
        query {
          user(login: "${USER}") {
            contributionsCollection {
              totalCommitContributions
            }
            repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: {field: UPDATED_AT, direction: DESC}) {
              totalCount
              nodes {
                name
                stargazerCount
                primaryLanguage {
                  name
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      `
    };

    const gqlResponse = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers,
      body: JSON.stringify(gqlQuery)
    });

    if (!gqlResponse.ok) throw new Error(`GraphQL Error: ${gqlResponse.statusText}`);
    
    const gqlData = await gqlResponse.json();
    if (gqlData.errors) throw new Error(`GraphQL Query Error: ${JSON.stringify(gqlData.errors)}`);

    const userData = gqlData.data.user;
    
    // Set Commits
    const totalCommits = userData.contributionsCollection.totalCommitContributions;
    console.log(`✓ Total Commits (Past Year): ${totalCommits}`);

    // ---------------------------------------------------------
    // 3. FETCH REPOS & LANGUAGES (With Pagination support)
    // ---------------------------------------------------------
    console.log("\nProcessing repositories...");
    
    let allRepos = userData.repositories.nodes;
    let hasNextPage = userData.repositories.pageInfo.hasNextPage;
    let endCursor = userData.repositories.pageInfo.endCursor;

    while (hasNextPage) {
      console.log(`  > Fetching more repositories...`);
      // FIXED: changed stargazersCount -> stargazerCount
      const nextQuery = {
        query: `
          query {
            user(login: "${USER}") {
              repositories(first: 100, after: "${endCursor}", ownerAffiliations: OWNER, isFork: false) {
                nodes {
                  name
                  stargazerCount
                  primaryLanguage {
                    name
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        `
      };
      
      const nextRes = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers,
        body: JSON.stringify(nextQuery)
      });
      const nextData = await nextRes.json();
      const nextRepos = nextData.data.user.repositories;
      
      allRepos = allRepos.concat(nextRepos.nodes);
      hasNextPage = nextRepos.pageInfo.hasNextPage;
      endCursor = nextRepos.pageInfo.endCursor;
    }

    // Calculate Stats
    // FIXED: Updated property access to match GraphQL result (stargazerCount)
    const repoCount = allRepos.length;
    const starCount = allRepos.reduce((acc, repo) => acc + repo.stargazerCount, 0);

    console.log(`✓ Total Repos (Sources only): ${repoCount}`);
    console.log(`✓ Total Stars: ${starCount}`);

    // Calculate Languages
    const langMap = {};
    allRepos.forEach(repo => {
      if (repo.primaryLanguage && repo.primaryLanguage.name) {
        const lang = repo.primaryLanguage.name;
        langMap[lang] = (langMap[lang] || 0) + 1;
      }
    });

    const topLangs = Object.entries(langMap)
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .slice(0, 5) // Take top 5
      .map(entry => entry[0])
      .join(", ");

    console.log(`✓ Top Languages: ${topLangs}`);

    // ---------------------------------------------------------
    // 4. GENERATE SVG
    // ---------------------------------------------------------
    if (!fs.existsSync("template.svg")) {
      throw new Error("template.svg not found!");
    }

    let svg = fs.readFileSync("template.svg", "utf8");

    svg = svg
      .replace(/\{\{UPTIME\}\}/g, uptime)
      .replace(/\{\{REPOS\}\}/g, repoCount)
      .replace(/\{\{STARS\}\}/g, starCount)
      .replace(/\{\{COMMITS\}\}/g, totalCommits)
      .replace(/\{\{TOP_LANGS\}\}/g, topLangs || "No Code Found");

    fs.writeFileSync("profile.svg", svg);
    
    console.log("\n" + "=".repeat(50));
    console.log("✅ SUCCESS! profile.svg updated.");
    console.log("=".repeat(50));

  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    process.exit(1);
  }
}

main();
