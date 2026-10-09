// xl:title stringify 的 replacer 两种形态 + space
// xl:round 7
// xl:judge stdout
// xl:end

const data = { a: 1, b: { c: 2, d: [3, 4] }, e: "s" };
console.log(JSON.stringify(data, ["a", "c", "d"]));
console.log(JSON.stringify(data, (k, v) => (typeof v === "number" ? v * 10 : v)));
console.log(JSON.stringify(data, null, 2).split("\n")[1]);
console.log(JSON.stringify({ x: 1 }, null, "\t"));
console.log(JSON.stringify([1, [2]], null, 4).split("\n").join("|"));
