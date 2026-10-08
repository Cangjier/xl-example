// xl:title 展开字符串、展开类数组、展开带 `length` 的对象
// xl:round 691
// xl:judge stdout
// xl:end
console.log(JSON.stringify([..."ab"]));
console.log(JSON.stringify(Array.from({ 0: "a", 1: "b", length: 2 } as any)));
function f(...xs: any[]): number { return xs.length; }
console.log(f(..."abc"));
