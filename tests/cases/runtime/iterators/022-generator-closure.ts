// xl:title 生成器持有闭包状态并跨 next 保留
// xl:round 623
// xl:judge stdout
// xl:end

function make() {
  let n = 0;
  return function* () { while (true) { n += 1; yield n; } };
}
const it = make()();
console.log(it.next().value, it.next().value, it.next().value);
