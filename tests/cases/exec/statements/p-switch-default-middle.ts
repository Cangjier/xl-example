// xl:title default 在中间也后判
// xl:round 692
// xl:judge stdout
// xl:end

function f(x) {
  switch (x) {
    case 1:
      return "one";
    default:
      return "other";
    case 2:
      return "two";
  }
}
console.log(f(1), f(2), f(3));
