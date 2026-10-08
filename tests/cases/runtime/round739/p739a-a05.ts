// xl:title 左操作数是一条调用 / 成员链时的 `await`
// xl:round 739
// xl:judge stdout
// xl:end
const o = { m: () => Promise.resolve(2), n: 1 };
async function main() {
  console.log(await o.m() + 1);
  console.log(await o.n + 1);
  console.log(await (o.m()) + 1);
}
main();
