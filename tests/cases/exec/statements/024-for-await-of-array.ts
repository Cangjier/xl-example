// xl:title `for await..of` 一个普通字符串数组
// xl:round 305
// xl:judge stdout
// xl:end

async function main() {
  const out: string[] = [];
  for await (const v of ["a", "b"]) out.push(v);
  console.log(out.join("-"));
}
main();
