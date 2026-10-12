// xl:title delete 只删自己的那一格，原型上的还在
// xl:round 678
// xl:judge stdout
// xl:end

const proto = { p: 1 };
const o: any = Object.create(proto);
o.own = 2;
console.log(delete o.own, o.own, o.p);
console.log(delete o.p, o.p);
console.log(Object.keys(o).length);
