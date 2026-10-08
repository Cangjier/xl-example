// xl:title 括号化之后 `await` 吃的是整段（与不括对照）
// xl:round 739
// xl:judge stdout
// xl:end
async function main() {
  console.log(await (Promise.resolve(1) + 1));
  console.log(await (1 + 1));
  console.log(await (Promise.resolve(1)) + 1);
}
main();
