// xl:title `Array.from` 同时给映射函数、来源是字符串与 Set
// xl:round 691
// xl:judge stdout
// xl:end
console.log(JSON.stringify(Array.from("abc", (c: any, i: any) => c + i)));
console.log(JSON.stringify(Array.from(new Set([1, 1, 2]))));
console.log(JSON.stringify(Array.from({ length: 3 }, (_: any, i: any) => i)));
