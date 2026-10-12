// xl:title Object.prototype.valueOf：默认给对象自己
// xl:judge stdout
// xl:end

const o: any = { a: 1 };
console.log(o.valueOf() === o, typeof o.valueOf());
