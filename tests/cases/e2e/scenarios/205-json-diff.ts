// xl:title 端到端：两份 JSON 的差异报告（递归 diff + 路径 + 类型变化）
// xl:round 7
// xl:judge stdout
// xl:end

function diff(a: any, b: any, path = ""): string[] {
  if (a === b) return [];
  const ta = a === null ? "null" : Array.isArray(a) ? "array" : typeof a;
  const tb = b === null ? "null" : Array.isArray(b) ? "array" : typeof b;
  if (ta !== tb) return [path + ": " + ta + " -> " + tb];
  if (ta !== "object" && ta !== "array") return [path + ": " + JSON.stringify(a) + " -> " + JSON.stringify(b)];
  const out: string[] = [];
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of [...keys].sort()) {
    const p = path + "/" + k;
    if (!(k in a)) out.push(p + ": added");
    else if (!(k in b)) out.push(p + ": removed");
    else out.push(...diff(a[k], b[k], p));
  }
  return out;
}
const left = { n: 1, s: "x", arr: [1, 2], nest: { k: true, gone: 1 } };
const right = { n: 2, s: "x", arr: [1, 2, 3], nest: { k: "true" }, fresh: null };
console.log(diff(left, right).join("\n"));
console.log(diff([1, 2], [1, 2]).length, diff(null, null).length, diff("a", 1).join("|"));
