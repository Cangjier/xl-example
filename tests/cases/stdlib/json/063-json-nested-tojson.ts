// xl:title `JSON.stringify` 里嵌套对象的 `toJSON` 与数组里的 `toJSON`
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { d: { toJSON() { return "D"; } }, arr: [{ toJSON() { return 1; } }] };
console.log(JSON.stringify(o));
console.log(JSON.stringify({ a: 1 }, null, "\t"));
