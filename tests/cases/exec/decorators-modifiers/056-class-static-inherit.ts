// xl:title 静态成员的继承与 super 在静态方法里
// xl:round 682
// xl:judge stdout
// xl:end
class Base2 { static kind = 'base'; static make(): string { return 'made-' + this.kind; } }
class Derived2 extends Base2 { static kind = 'derived'; static make(): string { return 'd-' + super.make(); } }
try { console.log("own", String(Base2.make())); } catch (e) { console.log("own", "ERR", String(e && e.name)); }
try { console.log("inherited-kind", String(Derived2.kind)); } catch (e) { console.log("inherited-kind", "ERR", String(e && e.name)); }
try { console.log("super-static", String(Derived2.make())); } catch (e) { console.log("super-static", "ERR", String(e && e.name)); }
try { console.log("static-in", String('make' in Derived2)); } catch (e) { console.log("static-in", "ERR", String(e && e.name)); }
