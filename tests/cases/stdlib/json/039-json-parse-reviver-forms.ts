// xl:title parse 的 reviver：自底向上、删除项、根的那一次
// xl:round 371
// xl:judge stdout
// xl:end
const seen: string[] = [];
JSON.parse('{"a":{"b":1},"c":2}', (k, v) => { seen.push(k); return v; });
console.log(seen.join(","));
console.log(JSON.stringify(JSON.parse('{"a":1,"b":2}', (k, v) => (k === "b" ? undefined : v))));
console.log(JSON.stringify(JSON.parse('{"a":1}', (k, v) => (k === "" ? { root: v } : v))));
