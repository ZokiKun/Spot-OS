# Direction 2: "Chunks"

Direction 1 (branch `main`) copied Notion: tables, property grids, hairlines, breadcrumbs and small grey labels. It worked, but every page showed everything at once.
Direction 2 (branch `direction-2`) keeps the same data, routes and features. It changes how information is presented, so that anyone can open a page and understand it within seconds.

## UX principles

1. **One screen, one question.** Each page leads with its answer, as a big number or one plain sentence. The details come after.
2. **Chunks, not lists.** Content lives in big rounded cards. Each card answers one thing and shows about 3–5 items. "Show N more" reveals the rest.
3. **Fold the rest.** Secondary information starts collapsed and shows a one-line summary. On a project page, that covers Details, Files & links, Notes and History. On a task, it covers Priority, Project and Created.
4. **Plain words.** "Stuck" replaces "Blocked", "Not started" replaces "Backlog", "Next step" replaces "Next action", "Doing" replaces "In Progress", and "Who / When" replace "Assignee / Due date".
5. **Colour means something, everywhere.**

| Colour | Meaning |
| --- | --- |
| Coral | Needs you: late, stuck, missing a next step |
| Sun | Today / in motion / in review |
| Lime | Done / healthy / all clear |
| Sky | Coming up / in progress / planning |
| Cream | Notes, reading, not started |
| Ink | The primary action, and private things (money) |

## What changed per page

| Page | Direction 1 | Direction 2 |
| --- | --- | --- |
| Shell | Sidebar with nav + active projects list | Top pill nav (desktop), floating dock (mobile), account menu in the avatar |
| Home | 4 tabs, each a long dashboard | Bento of 7 cards (Your day, Heads up, Coming up, Money, Studio, Next deadline, This month). Each card opens a focused view (`?view=attention / studio / finance / performance`). Quick-add task button. |
| Projects | Spreadsheet table + board | Project cards coloured by status. Filter pills: In motion / Stuck / Not started / Done / All. "Kind" goes in a menu. |
| Project | Property grid + 6 tabs | Hero card with round action buttons and progress ring, then a Next step card, then Steps as check rows. Details / Files & links / Notes / History are folded. |
| Tasks | Table with 9 filter tabs | Tasks grouped by Late / Today / This week / Later / No date. Pills choose whose tasks (Mine, Everyone, each person, Done). |
| Task sheet | Property list | A big "Mark as done" button, then Status / Who / When. Everything else is folded. Notes sit in a cream card. |
| Calendar | Dense month grid with text chips | Round days with three dots (deadline, due, notes). The chosen day appears as cards. |
| Library | Rows + tag cloud | Tiles coloured by type, with type pills. Project and tag filters go in a menu. |
| Reviews | 9 stacked textareas | Numbers as cards, then a 3-step guided flow (Look back → What we learned → Look ahead) |
| Spot Base | Sidebar + document | Index of page cards. Each page reads in a cream card with quick links to the others. |

## Visual system

- **Type:** Lexend, which was designed to reduce visual stress when reading. Titles are big, sit on two lines and use weight 500.
- **Shapes:** cards are 28px round. Rows, buttons and inputs are pills. Icon actions are round buttons, and the primary action is the ink "+".
- **Canvas:** warm cream in light mode and true black in dark mode. Colour cards stay the same colour in both themes and always use dark text.
- **Motion:** cards rise in one after another (`.stagger`), lift on hover (`.press`) and the check pops (`.anim-check`). All motion respects `prefers-reduced-motion`.
- **Code:** `src/components/ui/chunk.tsx` holds the primitives (`Card`, `CircleButton`, `PillButton`, `PillTabs`, `CircleCheck`, `Fold`, `Chip`, `Ring`, `BigTitle`). The tokens live in `src/app/globals.css`. Colour meaning maps live in `src/lib/constants.ts` (`PROJECT_STATUS_TONE`, `LIBRARY_TYPE_TONE`, `MEMBER_TONE`).

## Dropped on purpose

- **The project board (drag between status columns).** You now change status from the status pill on the project page.
- **The inline-editable spreadsheet cells for tasks and projects.** You now edit in the task sheet or on the project page.
- **The "Active projects" list in the sidebar.** Your projects now appear on Home and on Projects.
