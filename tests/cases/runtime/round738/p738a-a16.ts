// xl:title `await` 的操作数只吃紧随其后的那一格（二元那一族；第 739 轮收掉）
// xl:round 738
// xl:judge stdout
// xl:end
async function add(x: any) { return await x + 1; }
async function and(x: any) { return await x && "T"; }
async function main() {
  console.log(await add(Promise.resolve(1)), await and(Promise.resolve(0)), await and(1));
  console.log(await add("1"), await add(1));
}
main();
