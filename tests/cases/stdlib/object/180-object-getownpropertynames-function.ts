// xl:title `Object.getOwnPropertyNames(函数)`：五格自有 + 声明序
// xl:round 692
// xl:judge stdout
// xl:end
// 合并原先**同一个判定点**的四条原子探针：
//   probe-j21（`[1]`）· probe2-d22（函数）· probe693-o06（同一件事多一个 `.sort()`）· probe703-o-a41（函数）
// `probe-j21` 的靶子是数组——**那属于 `172-object-getownpropertynames-array`**，不在这里重复。
// `probe693-o06` 与 `probe703-o-a41` 逐字节等价（`["length","name"].sort()` 与不排序同序）。
// 判定点只有一个：**函数对象有那五格自有属性，且按声明序排出** `length,name,arguments,caller,prototype`。
// 打印壳与原来那几条一致。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  function f(a: any, b: any) { return a + b; }
  console.log(show(Object.getOwnPropertyNames(f).join(",")));
  // 同一片的两个侧面：不可枚举也进这一族；`prototype` 那一格在普通函数上存在
  console.log(show(String(Object.getOwnPropertyNames(f).length)));
  console.log(show(Object.getOwnPropertyNames(f).includes("prototype")));
  // 箭头函数没有 `prototype` 那一格（对照）
  console.log(show(Object.getOwnPropertyNames((x: any) => x).join(",")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
