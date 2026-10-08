// xl:title 生成器：yield* 的双向传值（next(v) 送进被代理生成器、return 提前收尾）
// xl:round 7
// xl:judge stdout
// xl:end

function* inner() {
  const got = yield "a";
  yield "inner-saw:" + got;
  return "inner-ret";
}
function* outer() {
  const back = yield* inner();
  yield "outer-saw:" + back;
}
const it = outer();
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.next("first")));
console.log(JSON.stringify(it.next("second")));
console.log(JSON.stringify(it.next()));
