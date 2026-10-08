// xl:title new Map 的几种来源与 clear / delete 的返回值
// xl:round 371
// xl:judge stdout
// xl:end
console.log(new Map([["a", 1]]).size, new Map(Object.entries({ a: 1, b: 2 })).size);
console.log(new Map(new Map([["x", 1]])).get("x"));
const empty = new Map();
console.log(empty.delete("nope"), empty.has("nope"));
const m = new Map([["a", 1], ["b", 2]]);
console.log(m.delete("a"), m.size);
m.clear();
console.log(m.size, [...m.keys()].length, m.get("b"));
