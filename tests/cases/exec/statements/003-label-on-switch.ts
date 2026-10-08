// xl:title 标签挂在 switch / 循环上
// xl:judge stdout
// xl:end

let s = "";
outer: for (let i = 0; i < 3; i++) {
  switch (i) {
    case 1: continue outer;
    case 2: break outer;
    default: s += i;
  }
  s += "-";
}
console.log(s);
