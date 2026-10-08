// xl:title `for await..of` 一个「承诺数组」：每一项都先兑现
// xl:round 305
// xl:judge stdout
// xl:end

async function main() {
  const out: number[] = [];
  for await (const v of [Promise.resolve(1), 2, Promise.resolve(3)]) out.push(v);
  console.log(out.join(","));
}
main();
