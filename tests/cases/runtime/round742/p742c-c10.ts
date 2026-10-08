// xl:title `case` 的**引用相等**：数组与对象字面量各是新的一份
// xl:round 742
// xl:judge stdout
// xl:end
const arr = [1];
const o = { a: 1 };
function f(x: any): string {
  switch (x) {
    case arr: return "arr";
    case o: return "obj";
    default: return "none";
  }
}
console.log(f(arr), f([1]), f(o), f({ a: 1 }));
