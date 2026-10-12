// xl:title 点名：JSON.stringify 的 space / replacer 与 JSON.parse 的 reviver、非法输入
// xl:judge stdout
// xl:end

console.log(JSON.stringify({ a: 1, b: [1, 2] }, null, 2));
console.log(JSON.stringify({ a: 1, b: 2 }, ["a"]));
console.log(JSON.stringify({ a: 1, b: 2 }, (k, v) => (k === "b" ? undefined : v)));
console.log(JSON.stringify({ a: undefined, b: () => 1, c: Symbol("s") }));
console.log(JSON.stringify([undefined, NaN, Infinity]));
console.log(JSON.parse('{"a":1}', (k, v) => (typeof v === "number" ? v + 1 : v)).a);
for (const bad of ["{", "", "'a'", "undefined"]) {
  try {
    JSON.parse(bad);
    console.log("parsed");
  } catch (e) {
    console.log(e.constructor.name);
  }
}
