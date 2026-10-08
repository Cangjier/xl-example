// xl:title `try` / `catch` 里的解构与 `finally` 的返回值
// xl:round 737
// xl:judge stdout
// xl:end
function f() {
  try { throw { a: 1, b: [2, 3] }; }
  catch ({ a, b: [x, y] }: any) { return a + x + y; }
  finally { }
}
console.log(f());
function g() { let v = ""; try { return "t"; } finally { v += "f"; console.log("fin", v); } }
console.log(g());
