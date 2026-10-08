// xl:title 极简 Markdown 转文本/HTML 渲染器
// xl:round 371
// xl:judge stdout
// xl:end
function escapeHtml(s: string): string {
  return s.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split('"').join("&quot;");
}
function inline(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end > 0) { out += "<b>" + escapeHtml(text.slice(i + 2, end)) + "</b>"; i = end + 2; continue; }
    }
    if (text.charAt(i) === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > 0) { out += "<code>" + escapeHtml(text.slice(i + 1, end)) + "</code>"; i = end + 1; continue; }
    }
    out += escapeHtml(text.charAt(i));
    i += 1;
  }
  return out;
}
function markdown(lines: string[]): string {
  const out: string[] = [];
  let inList = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push("  <li>" + inline(trimmed.slice(2)) + "</li>");
      continue;
    }
    if (inList) { out.push("</ul>"); inList = false; }
    if (trimmed.startsWith("# ")) out.push("<h1>" + inline(trimmed.slice(2)) + "</h1>");
    else if (trimmed.startsWith("## ")) out.push("<h2>" + inline(trimmed.slice(3)) + "</h2>");
    else if (trimmed === "") out.push("");
    else out.push("<p>" + inline(trimmed) + "</p>");
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}
const doc = ["# Title", "", "A **bold** and `code` <tag>.", "", "- one", "- two", "", "## Sub"];
console.log(markdown(doc));
console.log(escapeHtml("<a href=\"x\">&</a>"));
