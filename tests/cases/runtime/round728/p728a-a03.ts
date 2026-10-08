// xl:title `?.(` 的注释 / 换行：可选调用的实参表留在链上
// xl:round 728
// xl:judge stdout
// xl:end
const fn: any = (x: number) => x + 1;
console.log(fn?./*c*/(1), fn?.
  (2));
const obj: any = { go(n: number) { return n * 2; } };
console.log(obj.go?./*c*/(3), obj?.go?.(4));
const none: any = null;
console.log(none?./*c*/(5), none?.go?.(6));
