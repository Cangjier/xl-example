// xl:title 嵌套 `switch`：内层的 `break` 不跑到外层去
// xl:round 742
// xl:judge stdout
// xl:end
const out: string[] = [];
switch (1) {
  case 1:
    switch (2) {
      case 2: out.push("inner"); break;
      case 3: out.push("inner3");
    }
    out.push("outer");
    break;
  default: out.push("def");
}
console.log(out.join(","));
