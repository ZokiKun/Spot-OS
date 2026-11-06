// Vercel "Ignored Build Step" (wired up in vercel.json). Exit 1 = build, exit 0 = skip.
// Production builds wait for the GitHub Actions "check" job on the same commit and
// only go ahead if it succeeded. Preview builds always go ahead.
// If GITHUB_TOKEN is set in Vercel, it is used to avoid GitHub's anonymous rate limit.

const BUILD = 1;
const SKIP = 0;
const TIMEOUT_MS = 8 * 60 * 1000;
const POLL_MS = 15 * 1000;

const {
  VERCEL_ENV,
  VERCEL_GIT_COMMIT_SHA: sha,
  VERCEL_GIT_REPO_OWNER: owner,
  VERCEL_GIT_REPO_SLUG: repo,
  GITHUB_TOKEN,
} = process.env;

if (VERCEL_ENV !== "production") {
  console.log(`Not production (${VERCEL_ENV ?? "unknown"}): building.`);
  process.exit(BUILD);
}
if (!sha || !owner || !repo) {
  console.log("No git commit info (not a git deployment): building.");
  process.exit(BUILD);
}

const url = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/check-runs?check_name=check`;
const headers = { Accept: "application/vnd.github+json", "User-Agent": "spot-os-vercel-ignore-build" };
if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

const deadline = Date.now() + TIMEOUT_MS;
while (Date.now() < deadline) {
  try {
    const res = await fetch(url, { headers });
    if (res.ok) {
      const { check_runs: runs = [] } = await res.json();
      // Newest run first, so a re-run of a failed job counts.
      const run = runs.sort((a, b) => b.id - a.id)[0];
      if (!run) {
        console.log(`Waiting for the "check" job to start on ${sha.slice(0, 7)}...`);
      } else if (run.status !== "completed") {
        console.log(`"check" is ${run.status}...`);
      } else if (run.conclusion === "success") {
        console.log(`"check" passed on ${sha.slice(0, 7)}: building.`);
        process.exit(BUILD);
      } else {
        console.log(`"check" ${run.conclusion} on ${sha.slice(0, 7)}: skipping the production deploy. ${run.html_url}`);
        process.exit(SKIP);
      }
    } else {
      console.log(`GitHub API ${res.status}; retrying...`);
    }
  } catch (err) {
    console.log(`GitHub API error (${err.message}); retrying...`);
  }
  await new Promise((r) => setTimeout(r, POLL_MS));
}

console.log(`Timed out waiting for "check" on ${sha.slice(0, 7)}: skipping the production deploy. Redeploy once it passes.`);
process.exit(SKIP);
