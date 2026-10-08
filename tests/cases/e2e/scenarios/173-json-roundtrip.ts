// xl:title 端到端：JSON 往返 + 校验 + 错误分支
// xl:round 623
// xl:judge stdout
// xl:end

type Row = { id: number; name: string; tags: string[] };
function parseRow(text: string): Row | null {
  try {
    const v = JSON.parse(text);
    if (typeof v.id !== "number" || typeof v.name !== "string") return null;
    return { id: v.id, name: v.name, tags: Array.isArray(v.tags) ? v.tags : [] };
  } catch { return null; }
}
const ok = parseRow('{"id":1,"name":"a","tags":["x"]}');
const bad = parseRow('{"id":"1"}');
console.log(ok === null ? "null" : ok.id + ok.name + ok.tags.join("-"), bad === null);
console.log(JSON.stringify(parseRow('{"id":2,"name":"b"}')));
