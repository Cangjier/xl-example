// xl:title `await` 在模板串与数组字面量里
// xl:round 739
// xl:judge stdout
// xl:end
async function main() {
  console.log(`v=${await Promise.resolve(1) + 1}`);
  console.log([await Promise.resolve(1) + 1, 2].join(","));
}
main();
