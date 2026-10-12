// xl:title super 与 this：方法、箭头、解构、回调里的绑定
// xl:round 371
// xl:judge stdout
// xl:end
class Base {
  v = 1;
  m(): string { return "B" + this.v; }
}
class Derived extends Base {
  v = 2;
  arrow = () => this.v;
  callSuper(): string { return super.m(); }
  detached(): () => string { return this.m; }
  m(): string { return "D" + this.v; }
}
const d = new Derived();
console.log(d.callSuper(), d.m(), d.arrow());
const detached = d.detached();
try { console.log(detached()); } catch (e) { console.log("detached needs this"); }
console.log(d.arrow.call({} as any));
