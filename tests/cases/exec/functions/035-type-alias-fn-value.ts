// xl:title 函数类型别名既当标注又当值用
// xl:round 304
// xl:judge stdout
// xl:end

type Mapper = (s: string) => number;
const len: Mapper = (s) => s.length;
const runner: Mapper = function (s) { return s.length * 2; };
console.log(len("abc"), runner("ab"));
