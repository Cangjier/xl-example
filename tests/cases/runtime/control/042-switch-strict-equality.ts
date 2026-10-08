// xl:title switch 的严格相等与 fallthrough、块级 case
// xl:round 9
// xl:judge stdout
// xl:end

function kind(v: any) {
  switch (v) {
    case "1": return "string";
    case 1: return "number";
    case true: return "bool";
    case null: return "null";
    default: return "other";
  }
}
console.log(kind("1"), kind(1), kind(true), kind(null), kind(undefined));
let acc = "";
switch (2) { case 1: acc += "a"; case 2: acc += "b"; case 3: acc += "c"; break; case 4: acc += "d"; }
console.log(acc);
