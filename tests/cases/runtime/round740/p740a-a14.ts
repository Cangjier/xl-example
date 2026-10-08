// xl:title `await` 与一元前缀在同一格里（第 739 轮的邻居）
// xl:round 740
// xl:judge stdout
// xl:end
async function main() {
  console.log(-(await Promise.resolve(2)), !(await Promise.resolve(0)));
  console.log(typeof (await Promise.resolve("s")), void (await Promise.resolve(1)));
  console.log(-await Promise.resolve(2), !await Promise.resolve(0));
}
main();
