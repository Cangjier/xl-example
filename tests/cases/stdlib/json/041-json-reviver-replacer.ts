// xl:title JSON.parse 的 reviver 与 JSON.stringify 的 replacer / space
// xl:round 623
// xl:judge stdout
// xl:end

const o = JSON.parse('{"a":1,"b":{"c":2}}', (k, v) => (typeof v === "number" ? v * 10 : v));
console.log(JSON.stringify(o));
console.log(JSON.stringify({ a: 1, b: 2 }, ["a"]));
console.log(JSON.stringify({ a: [1, 2] }, null, 2).split("\n").length);
