// xl:title 空数组不带初值该抛
// xl:round 692
// xl:judge stdout
// xl:end

try {
  [].reduce((a, b) => a + b);
  console.log("no-throw");
} catch (e) {
  console.log(e.constructor.name);
}
