// xl:title Array.from 吃 Set 与 Map 的 entries
// xl:round 304
// xl:judge stdout
// xl:end

console.log(Array.from(new Set([3, 1, 3])).join(","));
const m = new Map([["a", 1], ["b", 2]]);
console.log(Array.from(m).map((p) => p[0] + p[1]).join(","));
console.log(Array.from("abc").join("-"));
