// xl:title async 生成器：for await 收完再迭代
// xl:round 9
// xl:judge stdout
// xl:end

async function* gen() { yield 1; yield 2; yield 3; }
async function main() {
  let sum = 0;
  for await (const v of gen()) sum += v;
  console.log("sum", sum);
  const all = [];
  for await (const v of gen()) all.push(v * 2);
  console.log(all.join(","));
}
main();
