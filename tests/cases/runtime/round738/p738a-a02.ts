// xl:title `await` 后面跟逻辑运算符
// xl:round 738
// xl:judge stdout
// xl:end
async function f() { return [await (Promise.resolve(1) && 2), await (0 || 5), await (null ?? 6)].join(","); }
f().then((v) => console.log(v));
