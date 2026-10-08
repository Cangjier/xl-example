// xl:title 生成器：yield 的先后、next 的返回值、提前 return
// xl:judge stdout
// xl:end

function* g() {
  yield 1;
  yield 2;
  return "done";
}
const it = g();
console.log(it.next().value, it.next().value, it.next().value, it.next().done);
