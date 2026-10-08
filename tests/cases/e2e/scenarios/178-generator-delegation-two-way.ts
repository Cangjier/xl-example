// xl:title 端到端：yield* 委派 + 双向传值 + return 值透传
// xl:round 639
// xl:judge stdout
// xl:end

function* inner(): Generator<number, string, number> {
  const first = yield 1;
  const second = yield first + 1;
  return "inner:" + second;
}
function* outer(): Generator<number, void, number> {
  const got = yield* inner();
  console.log(got);
  yield 100;
}
const it = outer();
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.next(10)));
console.log(JSON.stringify(it.next(20)));
console.log(JSON.stringify(it.next()));
