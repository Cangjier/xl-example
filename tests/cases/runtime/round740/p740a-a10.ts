// xl:title 后缀 `++` 与成员链 / 调用结果
// xl:round 740
// xl:judge stdout
// xl:end
const o: any = { list: [1, 2], n: 0 };
console.log(o.list[0]++, o.list[0]);
console.log(o.n++, o.n++, o.n);
const f = () => { const b: any = { c: 0 }; return b; };
console.log(f().c++, f().c++);
