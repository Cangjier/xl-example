// xl:title 对象内部件：键序 / 洞 / 原型链
// xl:round 683
// xl:judge stdout
// xl:end
try { console.log("key-order", String((() => { const o: any = {}; o.b = 1; o['2'] = 2; o.a = 3; o['1'] = 4; return Object.keys(o).join(','); })())); } catch (e) { console.log("key-order", "ERR", String(e && e.name)); }
try { console.log("getownnames-array", String((() => { const a: any = [1, 2]; a.extra = 'x'; return Object.getOwnPropertyNames(a).join(','); })())); } catch (e) { console.log("getownnames-array", "ERR", String(e && e.name)); }
try { console.log("assign-getter", String((() => { let n = 0; const src: any = { get v() { n++; return 1; } }; const dst: any = {}; Object.assign(dst, src); return n + ':' + dst.v; })())); } catch (e) { console.log("assign-getter", "ERR", String(e && e.name)); }
try { console.log("hasown-proto", String((() => { const o: any = Object.create({ inherited: 1 }); o.own = 2; return Object.prototype.hasOwnProperty.call(o, 'inherited') + ':' + ('inherited' in o); })())); } catch (e) { console.log("hasown-proto", "ERR", String(e && e.name)); }
