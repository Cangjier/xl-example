// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); class A { constructor() { this.a = 1; } } class B extends A { constructor() { let before; try { before = this.a; } catch (e) { b
// xl:round 699
// xl:judge stdout
// xl:want differ
// xl:why 派生类构造函数里 `super()` **之前**访问 `this` 该抛 `ReferenceError`（JS 的 TDZ），本仓读出来是 `undefined`——构造帧里没有「`this` 还没初始化」这一位。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
class A { constructor() { this.a = 1; } }
class B extends A { constructor() { let before; try { before = this.a; } catch (e) { before = "throw:" + e.constructor.name; } super(); console.log(show(before) + "|" + show(this.a)); } }
new B();
