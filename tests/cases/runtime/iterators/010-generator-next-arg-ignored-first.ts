// xl:title 生成器：第一次 next 的实参被丢掉
// xl:judge stdout
// xl:end

function* g() {
  const a = yield "start";
  console.log("got", a);
}
const it = g();
console.log(JSON.stringify(it.next(99)));
console.log(JSON.stringify(it.next(7)));
