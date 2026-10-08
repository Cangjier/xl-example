// xl:title `await` 与 `as` / 非空断言 / 可选链（第 741 轮把可选链那一格收掉了）
// xl:round 739
// xl:judge stdout
// xl:end
const o: any = { p: Promise.resolve(2) };
async function main() {
  console.log(await Promise.resolve(1) as any);
  console.log((await Promise.resolve(1)) as any);
  console.log(await o.p! + 1);
  console.log(await o?.p + 1);
}
main();
