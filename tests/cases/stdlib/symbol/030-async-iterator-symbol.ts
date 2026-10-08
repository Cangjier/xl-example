// xl:title async 生成器带 Symbol.asyncIterator 与 for await
// xl:round 647
// xl:judge stdout
// xl:end

async function* gen() { yield 1; yield 2; }
const it = gen();
console.log(typeof it[Symbol.asyncIterator], it[Symbol.asyncIterator]() === it);
(async () => {
  let sum = 0;
  for await (const v of gen()) sum += v;
  console.log("sum", sum);
})();
