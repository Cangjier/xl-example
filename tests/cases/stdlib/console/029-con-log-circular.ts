// xl:title 循环引用打出来是 `[Circular *1]`
// xl:round 691
// xl:judge stdout
// xl:want differ
// xl:why 循环引用：Node 给 `<ref *1> { … [Circular *1] }`，本仓靠**深度上限**兜住
//       （`InspectDepth = 2`）——不会转圈（宿主栈溢出不可捕获），但形状与 Node 不同。
//       这一条是 `inspect.xl.md` 已知差表里的第一条：要做就得带一张「正在展开的句柄表」。
// xl:end
const o: any = { a: 1 };
o.self = o;
console.log(o);
const arr: any = [1];
arr.push(arr);
console.log(arr);
