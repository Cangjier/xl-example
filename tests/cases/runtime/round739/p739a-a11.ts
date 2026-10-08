// xl:title 逗号运算符与 `await`
// xl:round 739
// xl:judge stdout
// xl:end
async function main() {
  const r = (await Promise.resolve(1), "x");
  console.log(r);
  console.log((await Promise.resolve(0), 5));
}
main();
