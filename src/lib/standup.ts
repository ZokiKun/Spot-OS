/**
 * The daily stand-up note on Calendar: one heading per person with a checklist of what they're
 * doing that day. Edit the list here when the team changes.
 */
export const STANDUP_PEOPLE = ["Ayush", "Zoki", "Shah"];
export const STANDUP_TITLE = "Stand-up";

const EMPTY_CHECKLIST = '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul>';

/** Editor HTML for a blank stand-up: each name as a heading, an empty checklist under it. */
export const standupHtml = (people: string[] = STANDUP_PEOPLE) => people.map((name) => `<h3>${name}</h3>${EMPTY_CHECKLIST}`).join("");

export const isStandup = (note: { title: string }) => note.title.trim().toLowerCase().replace(/[^a-z]/g, "") === "standup";
