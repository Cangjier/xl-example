// xl:title 两侧都是 `await` / 三段算术
// xl:round 739
// xl:judge stdout
// xl:end
async function main() {
  console.log(await Promise.resolve(1) + await Promise.resolve(2));
  console.log(await Promise.resolve(1) + 1 + 1);
  console.log(1 + await Promise.resolve(1));
  console.log("a" + await Promise.resolve("b"));
}
main();
