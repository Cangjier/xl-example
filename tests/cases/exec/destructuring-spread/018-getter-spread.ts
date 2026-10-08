// xl:title 展开与 Object.assign 对访问器求值一次
// xl:round 681
// xl:judge stdout
// xl:end
let reads = 0;
const src: any = { get a() { reads++; return 1; }, set a(v: any) { reads += 100; } };
const copy: any = { ...src, b: 2 };
try { console.log("reads", String(reads)); } catch (e) { console.log("reads", "ERR", String(e && e.name)); }
try { console.log("copy-own-a", String(Object.getOwnPropertyDescriptor(copy, 'a').get === undefined)); } catch (e) { console.log("copy-own-a", "ERR", String(e && e.name)); }
try { console.log("copy-value", String(copy.a)); } catch (e) { console.log("copy-value", "ERR", String(e && e.name)); }
try { console.log("assign", String((() => { let n = 0; const s: any = { get x() { n++; return 5; } }; const t: any = {}; Object.assign(t, s); return n + ':' + t.x + ':' + String(Object.getOwnPropertyDescriptor(t, 'x').get === undefined); })())); } catch (e) { console.log("assign", "ERR", String(e && e.name)); }
