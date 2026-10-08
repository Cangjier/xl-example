// xl:title 只有类型位的文件照样跑得动
// xl:round 291
// xl:judge stdout
// xl:end

interface I { a: number }
type T = I | null;
const i: I = { a: 1 };
const t: T = i;
console.log(t === i, i.a);
