// xl:title for..of 与 for..in 走过的东西不一样
// xl:round 371
// xl:judge stdout
// xl:end
const arr = [10, 20, 30];
for (const v of arr) console.log("of", v);
for (const k in arr) console.log("in", k, typeof k);
const o = { a: 1, b: 2 };
for (const k in o) console.log("obj", k, o[k as "a"]);
const s = "ab";
for (const ch of s) console.log("str", ch);
for (const k in s) console.log("strk", k);
const m = new Map([["k", 1]]);
for (const [key, v] of m) console.log("map", key, v);
