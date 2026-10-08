// xl:title super 方法链与访问器组合
// xl:round 681
// xl:judge stdout
// xl:end
class Base { get v(): number { return 1; } m(): number { return this.v; } }
class Mid extends Base { get v(): number { return super.v + 10; } }
class Top extends Mid { m(): number { return super.m() + 100; } }
try { console.log("top", String(new Top().m())); } catch (e) { console.log("top", "ERR", String(e && e.name)); }
try { console.log("mid", String(new Mid().m())); } catch (e) { console.log("mid", "ERR", String(e && e.name)); }
try { console.log("super-get", String(new Mid().v)); } catch (e) { console.log("super-get", "ERR", String(e && e.name)); }
