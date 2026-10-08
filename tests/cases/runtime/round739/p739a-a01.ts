// xl:title `await` 与算术运算符的紧密度
// xl:round 739
// xl:judge stdout
// xl:end
async function main() {
  console.log(await Promise.resolve(1) + 1);
  console.log(await Promise.resolve(2) * 3);
  console.log(await Promise.resolve(10) - 1);
  console.log(await Promise.resolve(1) + 2 * 3);
  console.log(await Promise.resolve(2) * 3 + 1);
}
main();
