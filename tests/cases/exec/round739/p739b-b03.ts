// xl:title 降级层：异步箭头里的 `await` + 乘法
// xl:round 739
// xl:judge stdout
// xl:end
const f = async (x: any) => await x * 2;
f(Promise.resolve(3)).then((v) => console.log(v));
