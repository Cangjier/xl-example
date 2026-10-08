// xl:title `await` 与逻辑 / 空值合并的紧密度
// xl:round 739
// xl:judge stdout
// xl:end
async function main() {
  console.log(await Promise.resolve(0) && "T");
  console.log(await Promise.resolve(1) && "T");
  console.log(await Promise.resolve(0) || "F");
  console.log(await Promise.resolve(null) ?? "N");
  console.log(await Promise.resolve(1) && await Promise.resolve(2));
}
main();
