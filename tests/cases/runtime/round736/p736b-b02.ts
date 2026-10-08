// xl:title `JSON.stringify` 的 replacer 函数与 `toJSON` 的次序
// xl:round 736
// xl:judge stdout
// xl:end
const o: any = { a: 1, toJSON() { return { a: 10 }; } };
console.log(JSON.stringify(o, (k: any, v: any) => (k === "a" ? 99 : v)));
const seen: string[] = [];
JSON.stringify({ x: { y: 1 } }, function (this: any, k: any, v: any) { seen.push(k + ":" + typeof v); return v; });
console.log(seen.join("|"));
