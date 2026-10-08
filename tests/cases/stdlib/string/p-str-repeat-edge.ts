// xl:title repeat 的 0 与负数
// xl:round 692
// xl:judge stdout
// xl:end

console.log("ab".repeat(0) === "");
try {
  "ab".repeat(-1);
  console.log("no-throw");
} catch (e) {
  console.log(e.constructor.name);
}
