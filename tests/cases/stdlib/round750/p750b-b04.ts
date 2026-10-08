// xl:title `JSON`：`toJSON` / 嵌套 / 键次序 / 大数与 `undefined`
// xl:round 750
// xl:judge stdout
// xl:end
console.log(JSON.stringify({ b: 1, a: 2, 2: 3, 1: 4 }));
console.log(JSON.stringify({ d: { toJSON: () => "T" } }));
console.log(JSON.stringify([undefined, () => {}, Symbol("s") as any]));
console.log(JSON.stringify({ a: [1, { b: 2 }] }));
console.log(JSON.stringify(1e21), JSON.stringify(0.1), JSON.stringify("\u00e9"));
console.log(JSON.stringify(new Map([["a", 1]]) as any), JSON.stringify(new Set([1]) as any));
console.log(JSON.parse(JSON.stringify({ a: [1, 2] })).a.length);
