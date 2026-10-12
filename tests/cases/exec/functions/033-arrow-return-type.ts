// xl:title 箭头函数的返回类型标注（带对象与联合）
// xl:round 304
// xl:judge stdout
// xl:end

const f = (n: number): { doubled: number } => ({ doubled: n * 2 });
const g = (n: number): number | string => (n > 0 ? n : "neg");
console.log(f(2).doubled, g(1), g(-1));
const h = (): void => { console.log("void-arrow"); };
h();
