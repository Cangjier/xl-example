// xl:title __proto__ 这个访问器读与写
// xl:round 678
// xl:judge stdout
// xl:end

const proto = { greet: "hi" };
const o: any = {};
o.__proto__ = proto;
console.log(o.greet, o.__proto__ === proto);
console.log(Object.getPrototypeOf(o) === proto);
