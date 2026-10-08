// xl:title `await` 与相等 / 关系运算符
// xl:round 739
// xl:judge stdout
// xl:end
async function f(x: any) { return await x === 1; }
async function g(x: any) { return await x > 0 ? "pos" : "neg"; }
async function main() {
  console.log(await f(Promise.resolve(1)), await f(Promise.resolve(2)));
  console.log(await g(Promise.resolve(1)), await g(Promise.resolve(-1)));
  console.log(await Promise.resolve(3) == "3");
}
main();
