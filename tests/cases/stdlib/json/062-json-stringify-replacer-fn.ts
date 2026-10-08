// xl:title `JSON.stringify` 的 `replacer` **函数**与 `space` 数字
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { a: 1, b: { c: 2 } };
console.log(JSON.stringify(o, (k: any, v: any) => (k === "c" ? undefined : v)));
console.log(JSON.stringify({ a: [1] }, null, 4));
console.log(JSON.stringify([undefined, function () {}]));
