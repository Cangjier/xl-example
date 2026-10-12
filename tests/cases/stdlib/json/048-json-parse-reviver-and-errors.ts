// xl:title JSON.parse：reviver 的 delete 语义、非法文本抛 SyntaxError
// xl:judge stdout
// xl:end

const r = JSON.parse('{"a":{"b":1},"c":2}', (k, v) => (k === "b" ? undefined : typeof v === "number" ? v * 10 : v));
console.log(JSON.stringify(r));
for (const bad of ["{'a':1}", "{a:1}", "", "undefined"]) {
  try { JSON.parse(bad); console.log("ok"); } catch (e) { console.log(bad + " -> " + (e as Error).name); }
}
