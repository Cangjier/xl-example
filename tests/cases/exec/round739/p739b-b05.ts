// xl:title 降级层：`await` 作实参与返回值的二元表达式
// xl:round 739
// xl:judge stdout
// xl:end
async function pick(x: any, y: any) { return await x > await y ? "gt" : "le"; }
pick(Promise.resolve(3), Promise.resolve(2)).then((v) => console.log(v));
