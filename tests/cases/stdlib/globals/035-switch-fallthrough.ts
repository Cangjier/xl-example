// xl:title switch 的贯穿、default 居中、块级 case
// xl:round 623
// xl:judge stdout
// xl:end

function f(x: number) {
  switch (x) {
    case 1:
    case 2:
      return "12";
    default:
      return "d";
    case 3:
      return "3";
  }
}
console.log(f(1), f(2), f(3), f(9));
