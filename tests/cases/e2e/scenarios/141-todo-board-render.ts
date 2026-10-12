// xl:title 看板渲染：分组、排序、宽度对齐
// xl:round 371
// xl:judge stdout
// xl:end
type Card = { id: number; title: string; status: "todo" | "doing" | "done"; points: number; tags: string[] };
const cards: Card[] = [
  { id: 1, title: "write parser", status: "done", points: 3, tags: ["core"] },
  { id: 2, title: "fix bug", status: "doing", points: 1, tags: ["bug", "urgent"] },
  { id: 3, title: "add docs", status: "todo", points: 2, tags: [] },
  { id: 4, title: "refactor", status: "doing", points: 5, tags: ["core"] },
  { id: 5, title: "ship", status: "todo", points: 8, tags: ["release"] },
];
const columns: Card["status"][] = ["todo", "doing", "done"];
function renderColumn(status: string, list: Card[]): string[] {
  const width = Math.max(status.length + 2, ...list.map((c) => c.title.length + 6), 8);
  const header = "+" + "-".repeat(width) + "+";
  const out = [header, "| " + (status + " (" + list.length + ")").padEnd(width - 1) + "|", header];
  for (const c of list.slice().sort((a, b) => b.points - a.points)) {
    out.push("| " + ("#" + c.id + " " + c.title).padEnd(width - 1) + "|");
  }
  const points = list.reduce((a, b) => a + b.points, 0);
  out.push("| " + ("points: " + points).padEnd(width - 1) + "|", header);
  return out;
}
for (const status of columns) {
  for (const line of renderColumn(status, cards.filter((c) => c.status === status))) console.log(line);
  console.log("");
}
const tagCounts = new Map<string, number>();
for (const c of cards) for (const t of c.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
console.log([...tagCounts.entries()].sort().map(([t, n]) => t + "=" + n).join(","));
console.log(cards.reduce((a, b) => a + b.points, 0));
