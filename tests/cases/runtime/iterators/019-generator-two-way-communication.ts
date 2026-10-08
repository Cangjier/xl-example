// xl:title 生成器：送进去的值与产出的值两条方向
// xl:round 331
// xl:judge stdout
// xl:end

function* accumulate(): Generator<number, number, number> {
  let total = 0;
  for (let i = 0; i < 3; i++) {
    const sent: number = yield total;
    total = total + sent;
  }
  return total;
}
const it = accumulate();
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.next(5)));
console.log(JSON.stringify(it.next(10)));
console.log(JSON.stringify(it.next(100)));
