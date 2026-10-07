/**
 * Spot Base starter pages. These are prompts for the team to fill in —
 * deliberately not invented facts about the studio.
 */
export const DEFAULT_KB_PAGES: { slug: string; title: string; icon: string; content_md: string }[] = [
  {
    slug: "who-we-are",
    title: "Who we are",
    icon: "👋",
    content_md: `Studio Spot is a multidisciplinary design studio.

> Replace this with two or three sentences a new collaborator should read first.

## In one line
_What do we do, for whom, and why does it matter?_

## Where we work
_Location, remote setup, working hours._`,
  },
  {
    slug: "what-we-do",
    title: "What we do",
    icon: "🛠️",
    content_md: `## Disciplines
- _Brand identity_
- _Digital product & web_
- _Packaging & print_

## Typical engagements
_Size, length and shape of a typical project._`,
  },
  {
    slug: "positioning",
    title: "Positioning",
    icon: "🎯",
    content_md: `## For
_Who our ideal clients are._

## Against
_What we are not, and work we turn down._

## Why us
_The honest reason clients pick us._`,
  },
  {
    slug: "personality",
    title: "Personality & voice",
    icon: "🗣️",
    content_md: `## We sound like
- _…_

## We never sound like
- _…_`,
  },
  {
    slug: "history",
    title: "History",
    icon: "📜",
    content_md: `| Year | Milestone |
| --- | --- |
| _2020_ | _Studio founded_ |`,
  },
  {
    slug: "brand",
    title: "Brand",
    icon: "🟠",
    content_md: `## Assets
Link the logo, type and colour files from **Library**.

## Rules
- _Clear space, minimum sizes, colour usage._`,
  },
  {
    slug: "philosophy",
    title: "Philosophy",
    icon: "💭",
    content_md: `_What we believe about design and how good work gets made._`,
  },
  {
    slug: "methodology",
    title: "Methodology",
    icon: "🧪",
    content_md: `## Project phases
1. _Discover_
2. _Define_
3. _Design_
4. _Deliver_

## Rituals
- _Weekly stand-up, monthly review (see Reviews)._`,
  },
  {
    slug: "team",
    title: "Team",
    icon: "👥",
    content_md: `| Name | Role | Focus |
| --- | --- | --- |
| _Name_ | _Role_ | _Focus areas_ |`,
  },
  {
    slug: "services",
    title: "Services",
    icon: "📦",
    content_md: `| Service | Typical scope | Starting price |
| --- | --- | --- |
| _Identity_ | _…_ | _…_ |`,
  },
  {
    slug: "tools",
    title: "Tools",
    icon: "🧰",
    content_md: `- **Design:** _Figma, Adobe CC_
- **Files:** Google Drive
- **Ops:** Spot OS`,
  },
  {
    slug: "file-conventions",
    title: "File conventions",
    icon: "🗂️",
    content_md: `## Naming
\`YYYY-MM-DD_client_project_deliverable_v01\`

## Drive structure
\`\`\`
Clients/
  <Client>/
    <Project>/
      01_Brief
      02_Research
      03_Design
      04_Delivery
\`\`\``,
  },
];
