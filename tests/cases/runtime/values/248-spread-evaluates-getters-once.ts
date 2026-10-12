// xl:title 对象展开与解构各读一次访问器
// xl:round 7
// xl:judge stdout
// xl:end

let reads = 0;
const src: any = { get a() { reads++; return "A"; }, b: "B" };
const copy = { ...src };
const { a, ...rest } = src;
console.log(copy.a, rest.b, a, reads);
