// xl:title `Function.prototype` 自己那两格（第 731 轮收的）
// xl:round 731
// xl:judge stdout
// xl:end
const b: any = Function.prototype;
console.log(typeof b, typeof b.length, b.length, typeof b.name, JSON.stringify(b.name));
console.log(b.name === "", b.length === 0);
console.log(Object.keys(Function.prototype).length);
console.log(b.call.length, b.apply.length, b.bind.length, b.toString.length);
