// xl:title `new Array(3)` 的洞：`keys` / `in` / `map` 都不理它
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = new Array(3);
console.log(a.length, 0 in a, JSON.stringify(a));
console.log(JSON.stringify([...a.keys()]));
console.log(JSON.stringify(a.map(() => 1)));
console.log(JSON.stringify(a.fill(0)));
