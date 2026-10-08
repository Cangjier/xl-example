// xl:title `switch` 的落空与严格相等（NaN / 字符串数字）
// xl:round 736
// xl:judge stdout
// xl:end
function pick(v: any) {
  switch (v) {
    case 1: return "one";
    case "1": return "str-one";
    case NaN: return "nan";
    default: return "other";
  }
}
console.log(pick(1), pick("1"), pick(NaN), pick(2));
let n = 0;
switch (2) { case 1: n += 1; case 2: n += 2; case 3: n += 3; break; default: n += 9; }
console.log(n);
