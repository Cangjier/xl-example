// xl:title 剩余参数
// xl:round 692
// xl:judge stdout
// xl:end

function f(a, ...r) {
  return a + "|" + r.length + "|" + r.join("");
}
console.log(f(1, 2, 3), f(1));
