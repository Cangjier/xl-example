// xl:title `switch (true)` 的分支写法
// xl:round 304
// xl:judge stdout
// xl:end

function grade(n: number): string {
  switch (true) {
    case n >= 90: return "A";
    case n >= 80: return "B";
    case n >= 70: return "C";
    default: return "F";
  }
}
console.log(grade(95), grade(85), grade(75), grade(10));
