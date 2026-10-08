// xl:title `await` 嵌套在实参 / 返回值 / 承诺套承诺里
// xl:round 739
// xl:judge stdout
// xl:end
const id = (v: any) => v;
async function f(x: any) { return await x + 1; }
async function main() {
  console.log(id(await Promise.resolve(1) + 1));
  console.log(await f(Promise.resolve(1)));
  console.log(await Promise.resolve(Promise.resolve(1)) + 1);
}
main();
