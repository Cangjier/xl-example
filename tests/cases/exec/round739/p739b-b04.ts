// xl:title 降级层：两侧 `await` 的加法
// xl:round 739
// xl:judge stdout
// xl:end
async function main() {
  const v = await Promise.resolve(1) + await Promise.resolve(2);
  console.log(v);
}
main();
