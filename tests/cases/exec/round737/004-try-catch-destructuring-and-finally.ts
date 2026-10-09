// xl:title `try` / `catch` 形参里的解构与 `finally` 的返回值
// xl:round 737
// xl:judge stdout
// xl:end
// 第 802 轮改名（原 `p737b-b05`；正文一字未动）。
// 判定点只有一个：**`catch` 的形参位是一个完整的解构目标**（嵌套数组解构都能用），
// 而 `finally` 只跑收尾、不动已经算好的返回值（它自己的副作用照旧发生）。
function f() {
  try { throw { a: 1, b: [2, 3] }; }
  catch ({ a, b: [x, y] }: any) { return a + x + y; }
  finally { }
}
console.log(f());
function g() { let v = ""; try { return "t"; } finally { v += "f"; console.log("fin", v); } }
console.log(g());
