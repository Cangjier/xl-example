// xl:title 静态块里跑循环与判断
// xl:judge stdout
// xl:end

class C {
  static xs: number[] = [];
  static {
    for (let i = 0; i < 4; i++) {
      if (i % 2 === 0) C.xs.push(i);
    }
  }
}
console.log(C.xs.join(","));
