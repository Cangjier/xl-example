// xl:title 生成器：throw 注入到 yield 处、finally 收尾、return 值
// xl:round 9
// xl:judge stdout
// xl:end

function* g() {
  try {
    yield 1;
    yield 2;
  } catch (e) {
    console.log("caught", e);
    yield 3;
  } finally {
    console.log("finally");
  }
  return "end";
}
const it = g();
console.log(it.next());
console.log(it.throw("boom"));
console.log(it.next());
console.log(it.next());
