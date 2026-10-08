// xl:title `flatMap` 与稀疏数组的洞
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [1, , 3];
console.log(JSON.stringify(a.flatMap((x: any) => [x, x * 2])));
console.log(JSON.stringify(a.map((x: any) => x * 2)));
