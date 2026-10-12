// xl:title 函数的 name：声明 / 表达式 / 推断 / 方法
// xl:judge stdout
// xl:end

function decl() {}
const f = function () {};
const g = () => {};
const o = { m() {} };
const arr = [function () {}];
console.log(decl.name, f.name, g.name, o.m.name, arr[0].name);
