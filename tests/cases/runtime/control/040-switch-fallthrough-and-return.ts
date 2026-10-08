// xl:title switch 的穿透、返回与 default 位置
// xl:round 8
// xl:judge stdout
// xl:end

function f(x) {
  switch (x) {
    case 1:
    case 2:
      return "low";
    default:
      return "other";
    case 3:
      return "three";
  }
}
console.log(f(1), f(2), f(3), f(9));
