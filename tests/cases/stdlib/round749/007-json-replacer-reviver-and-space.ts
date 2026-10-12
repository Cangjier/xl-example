// xl:title `JSON` 的 `replacer` / `reviver` / `space` 与非法输入
// xl:round 749
// xl:judge stdout
// xl:end
console.log(JSON.stringify({ a: 1, b: 2 }, ["a"]));
console.log(JSON.stringify({ a: 1, b: 2 }, (k, v) => (k === "b" ? undefined : v)));
console.log(JSON.stringify({ a: [1, 2] }, null, 2).split("\n").length);
console.log(JSON.stringify(new Date(0) as any));
console.log(JSON.parse("{\"a\":1}", (k, v) => (typeof v === "number" ? v * 2 : v)).a);
try { JSON.parse(""); } catch (e) { console.log("empty", (e as Error).constructor.name); }
console.log(JSON.parse(" [1, 2] ").length, JSON.parse('"str"'), JSON.parse("null"));
