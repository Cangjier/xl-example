// xl:title 数组的洞：`forEach` / `filter` / `some` 都不理它
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [1, , 3];
const seen: any[] = [];
a.forEach((v: any, i: any) => seen.push(i + ":" + v));
console.log(seen.join(","));
console.log(JSON.stringify(a.filter(() => true)));
console.log(a.some((v: any) => v === undefined), a.every((v: any) => v !== undefined));
console.log(JSON.stringify(a.fill(0, 1, 2)));
