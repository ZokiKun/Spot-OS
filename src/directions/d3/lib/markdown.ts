import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

/** Render trusted, team-authored Markdown (Spot Base). Raw HTML is escaped. */
export function renderMarkdown(md: string): string {
  const escaped = md.replace(/<(?!\/?(br|hr)\b)/gi, "&lt;");
  return marked.parse(escaped, { async: false }) as string;
}

/** Browser-only: convert editor HTML (Tiptap subset) to Markdown for export. */
export function htmlToMarkdown(html: string): string {
  if (typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");

  const inline = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? "").replace(/([*_`])/g, "\\$1");
    if (!(node instanceof HTMLElement)) return "";
    const inner = Array.from(node.childNodes).map(inline).join("");
    switch (node.tagName) {
      case "STRONG":
      case "B":
        return `**${inner}**`;
      case "EM":
      case "I":
        return `_${inner}_`;
      case "S":
        return `~~${inner}~~`;
      case "CODE":
        return `\`${node.textContent ?? ""}\``;
      case "A":
        return `[${inner}](${node.getAttribute("href") ?? ""})`;
      case "IMG":
        return `![${node.getAttribute("alt") ?? ""}](${node.getAttribute("src") ?? ""})`;
      case "BR":
        return "  \n";
      default:
        return inner;
    }
  };

  const block = (el: Element, depth = 0): string => {
    const indent = "  ".repeat(depth);
    switch (el.tagName) {
      case "H1":
        return `# ${inline(el)}`;
      case "H2":
        return `## ${inline(el)}`;
      case "H3":
        return `### ${inline(el)}`;
      case "P":
        return inline(el);
      case "BLOCKQUOTE":
        return Array.from(el.children)
          .map((c) => `> ${block(c)}`)
          .join("\n");
      case "PRE":
        return `\`\`\`\n${el.textContent ?? ""}\n\`\`\``;
      case "HR":
        return "---";
      case "IMG":
        return inline(el);
      case "UL":
      case "OL": {
        const isTask = el.getAttribute("data-type") === "taskList";
        return Array.from(el.children)
          .map((li, i) => {
            const marker = isTask
              ? `- [${li.getAttribute("data-checked") === "true" ? "x" : " "}]`
              : el.tagName === "OL"
                ? `${i + 1}.`
                : "-";
            const content = li.querySelector(":scope > div") ?? li;
            const parts = Array.from(content.children);
            const text = parts.filter((c) => c.tagName === "P").map((p) => inline(p)).join(" ");
            const nested = parts
              .filter((c) => c.tagName === "UL" || c.tagName === "OL")
              .map((c) => block(c, depth + 1))
              .join("\n");
            return `${indent}${marker} ${text}${nested ? `\n${nested}` : ""}`;
          })
          .join("\n");
      }
      default:
        return inline(el);
    }
  };

  return Array.from(doc.body.children)
    .map((el) => block(el))
    .join("\n\n")
    .trim();
}
