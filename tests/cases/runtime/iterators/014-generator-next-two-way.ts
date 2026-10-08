// xl:title 生成器的双向通信：`next(v)` 的值落在上一个 `yield` 那一格
// xl:round 312
// xl:judge stdout
// xl:end

function* talk(): Generator<string, string, number> {
  const first = yield "ask";
  const second = yield "echo:" + first;
  return "done:" + second;
}
const it: any = talk();
console.log(it.next(1).value);
console.log(it.next(10).value);
console.log(JSON.stringify(it.next(20)));
const plain: any = (function* () { const got = yield 1; yield got * 2; })();
plain.next();
console.log(plain.next(21).value);
