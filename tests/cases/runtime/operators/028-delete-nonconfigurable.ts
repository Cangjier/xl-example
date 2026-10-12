// xl:title delete 一个不可配置的属性：松散模式静默返回 false
// xl:round 304
// xl:judge stdout
// xl:end

const o: any = {};
Object.defineProperty(o, "fixed", { value: 1, configurable: false });
console.log(delete o.fixed, o.fixed);
const p: any = { x: 1 };
console.log(delete p.x, "x" in p);
