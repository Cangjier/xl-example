// xl:title 类数组接收者：`slice` 的通用那一档
// xl:round 335
// xl:judge stdout
// xl:end

const like = { 0: "a", 1: "b", 2: "c", length: 3 };
console.log([].slice.call(like as any).join("-"));
console.log(Array.prototype.slice.call(like as any, 1).join("-"));
console.log([].slice.call(like as any, -2).join("-"));
console.log([].slice.call({ length: 0 } as any).length);
function args(): string {
  return ([] as any).slice.call(arguments as any, 1).join(",");
}
console.log(args("x", "y", "z"));
