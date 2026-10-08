// xl:title 符号键上的不可配置改写也抛，且消息不带名字
// xl:round 691
// xl:judge stdout
// xl:end
const s: any = Symbol("k");
const o: any = {};
Object.defineProperty(o, s, { value: 1, configurable: false });
console.log(o[s]);
try { Object.defineProperty(o, s, { value: 2 }); } catch (e: any) { console.log(e.constructor.name, e.message); }
