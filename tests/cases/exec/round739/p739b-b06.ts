// xl:title 降级层：`await` 与下标 / 成员链
// xl:round 739
// xl:judge stdout
// xl:end
const box = { v: [Promise.resolve(5)] };
async function main() {
  console.log(await box.v[0] + 1);
}
main();
