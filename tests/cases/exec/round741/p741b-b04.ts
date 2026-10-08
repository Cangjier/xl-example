// xl:title 降级层：`await o?.m()`
// xl:round 741
// xl:judge stdout
// xl:end
async function main() {
  const o: any = { m: () => Promise.resolve(3) };
  console.log(await o?.m(), await o?.m?.());
}
main();
