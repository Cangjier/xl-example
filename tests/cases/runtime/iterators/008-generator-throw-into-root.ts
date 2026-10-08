// xl:title 往生成器里 throw：体内 catch 接住、还能继续 yield
// xl:judge stdout
// xl:end

function* g() {
  try { yield "a"; } catch (e: any) { yield "caught:" + e.message; }
  yield "end";
}
const it = g();
console.log(it.next().value);
console.log(it.throw(new Error("in")).value);
console.log(it.next().value, it.next().done);
