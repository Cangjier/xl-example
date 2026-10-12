// xl:title async / await：try-finally、串行、返回值
// xl:round 623
// xl:judge stdout
// xl:end

async function f() {
  try { return await Promise.resolve(1); } finally { console.log("f-finally"); }
}
async function main() {
  console.log(await f());
  const xs = [1, 2, 3];
  let sum = 0;
  for (const x of xs) sum += await Promise.resolve(x);
  console.log(sum);
}
main();
console.log("sync");
