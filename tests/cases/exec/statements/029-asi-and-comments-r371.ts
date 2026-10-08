// xl:title ASI 与夹在语句里的注释不改变语义
// xl:round 371
// xl:judge stdout
// xl:end
const a = 1
const b = 2
function f() {
  return (
    a + b
  )
}
const c = /* inline */ 3;
if (a > 0) {
  console.log("pos");
} /* between */ else {
  console.log("neg");
}
const d = [
  1, // one
  2, // two
];
console.log(f(), c, d.length, a
  + b);
console.log(typeof c === "number" ? "n" : "other");
