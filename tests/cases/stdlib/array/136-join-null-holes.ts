// xl:title `join` 把洞与 `null` / `undefined` 都当空串
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [1, , null, undefined, 5];
console.log(a.join("-"));
console.log(a.join());
console.log([1, 2].join(""));
console.log(JSON.stringify([].join("-")));
