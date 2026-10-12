// xl:title `JSON.parse` 的 `reviver` 与 `__proto__` 键
// xl:round 691
// xl:judge stdout
// xl:end
console.log(JSON.stringify(JSON.parse('{"a":1,"b":2}', (k: any, v: any) => (k === "b" ? undefined : v))));
const o: any = JSON.parse('{"__proto__": {"x": 1}}');
console.log(Object.keys(o).join(","), ({} as any).x);
