// xl:title 一元前缀套在 `await` 外面
// xl:round 739
// xl:judge stdout
// xl:end
async function main() {
  console.log(typeof await Promise.resolve("s"));
  console.log(!await Promise.resolve(0));
  console.log(-await Promise.resolve(5));
  console.log(void await Promise.resolve(1));
}
main();
