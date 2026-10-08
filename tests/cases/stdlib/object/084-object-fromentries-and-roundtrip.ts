// xl:title Object.fromEntries 与 entries 的往返
// xl:round 371
// xl:judge stdout
// xl:end
const pairs: [string, number][] = [["a", 1], ["b", 2]];
const o = Object.fromEntries(pairs);
console.log(JSON.stringify(o), JSON.stringify(Object.entries(o)));
console.log(JSON.stringify(Object.fromEntries(new Map([["k", "v"]]))));
console.log(JSON.stringify(Object.fromEntries([["x", undefined], ["y", null]])));
