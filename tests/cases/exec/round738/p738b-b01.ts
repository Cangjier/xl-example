// xl:title 箭头函数体是逻辑链（简写体不吃逗号那一档）
// xl:round 738
// xl:judge stdout
// xl:end
const f = (x: any) => x && 1;
const g = (x: any) => (x || 2);
const h = (x: any) => x ?? 3;
console.log(f(5), g(0), h(null));
const arr = [1, 2].map((x) => x && x * 2);
console.log(arr.join(","));
const obj = { m: (x: any) => x || "d" };
console.log(obj.m(0));
