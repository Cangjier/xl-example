// xl:title 方法那一档也认（对象字面量 / 类 / async）
// xl:round 730
// xl:judge stdout
// xl:end
const o = { *m() {} };
class C { *n() {} async p() {} }
console.log(o.m.constructor.name, C.prototype.n.constructor.name, C.prototype.p.constructor.name);
console.log(Object.prototype.toString.call(o.m), Object.prototype.toString.call(C.prototype.p));
