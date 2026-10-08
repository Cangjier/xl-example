// xl:title 循环条件里的 `await`
// xl:round 739
// xl:judge stdout
// xl:end
async function main() {
  let i = 0;
  while (await Promise.resolve(i) < 3) i += 1;
  console.log(i);
  for (let k = 0; await Promise.resolve(k) < 2; k += 1) {
    console.log("k" + k);
  }
}
main();
