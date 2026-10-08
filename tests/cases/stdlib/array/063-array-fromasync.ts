// xl:title Array.fromAsync：异步可迭代对象收成数组
// xl:round 323
// xl:judge stdout
// xl:end

async function* page() { yield 1; yield 2; yield 3; }
async function main() {
  const xs = await Array.fromAsync(page());
  console.log(xs.join(","));
  console.log((await Array.fromAsync([1, 2], (v) => Promise.resolve(v * 2))).join(","));
}
main();
