// xl:title 箭头函数直接返回对象字面量 / 再套一层箭头
// xl:judge stdout
// xl:end

const make = (n: number) => ({ n, id: "x" + n });
const nested = () => () => ({ a: 1 });
const withBody = (n: number) => { return { n }; };
console.log(make(1).n, make(2).id, nested()().a, withBody(3).n);
