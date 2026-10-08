// xl:title stringify 的 replacer：函数形态与数组形态
// xl:round 371
// xl:judge stdout
// xl:end
const o = { a: 1, b: 2, c: { d: 3 } };
console.log(JSON.stringify(o, ["a", "c", "d"]));
console.log(JSON.stringify(o, (k: string, v: unknown) => (k === "b" ? undefined : v)));
console.log(JSON.stringify(o, (k: string, v: unknown) => (typeof v === "number" ? v * 10 : v)));
console.log(JSON.stringify([1, 2], (_k: string, v: unknown) => (v === 1 ? undefined : v)));
