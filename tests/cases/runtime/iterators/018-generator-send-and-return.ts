// xl:title 生成器：`next(v)` 送值 + 返回值随 `done`
// xl:round 330
// xl:judge stdout
// xl:end

function* counter(): Generator<number, string, number> {
  let total = 0;
  for (let i = 0; i < 3; i++) {
    const sent: number = yield total;
    total = total + (sent ?? 1);
  }
  return "sum=" + total;
}
const it = counter();
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.next(10)));
console.log(JSON.stringify(it.next(20)));
console.log(JSON.stringify(it.next(30)));
