// xl:title async 函数里顺序 await 一个循环
// xl:round 304
// xl:judge stdout
// xl:end

const delay = (v: number) => Promise.resolve(v);
async function run() {
  let total = 0;
  for (const n of [1, 2, 3]) total += await delay(n);
  return total;
}
run().then((t) => console.log("total", t));
console.log("started");
