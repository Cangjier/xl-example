// xl:title `await` 后面是数组 / 字符串 / 数字字面量
// xl:round 739
// xl:judge stdout
// xl:end
async function main() {
  console.log(await "1" + 1);
  console.log(await 1 + "1");
  console.log(await [1, 2] + "");
  console.log(await { a: 1 } + "");
}
main();
