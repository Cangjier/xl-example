// xl:title 降级层：`await` 与一元前缀同格
// xl:round 740
// xl:judge stdout
// xl:end
async function main() {
  console.log(-(await Promise.resolve(2)), typeof (await Promise.resolve("s")));
}
main();
