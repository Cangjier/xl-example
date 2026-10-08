// xl:title 左操作数是下标时
// xl:round 739
// xl:judge stdout
// xl:end
const arr = [Promise.resolve(1)];
async function main() {
  console.log(await arr[0] + 1);
  const m: any = { k: Promise.resolve(2) };
  console.log(await m.k * 2);
}
main();
