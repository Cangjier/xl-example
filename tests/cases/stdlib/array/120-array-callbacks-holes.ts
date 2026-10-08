// xl:title 回调族对洞与 undefined 的处理
// xl:round 682
// xl:judge stdout
// xl:end
const sparse: any = [1, , 3];
try { console.log("map-keeps-hole", String(sparse.map((x: any) => x * 2).length + ':' + String(sparse.map((x: any) => x * 2)[1]))); } catch (e) { console.log("map-keeps-hole", "ERR", String(e && e.name)); }
try { console.log("foreach-count", String((() => { let n = 0; sparse.forEach(() => { n++; }); return n; })())); } catch (e) { console.log("foreach-count", "ERR", String(e && e.name)); }
try { console.log("filter", String(sparse.filter(() => true).length)); } catch (e) { console.log("filter", "ERR", String(e && e.name)); }
try { console.log("every", String(String(sparse.every((x: any) => x > 0)))); } catch (e) { console.log("every", "ERR", String(e && e.name)); }
try { console.log("reduce-skips", String(sparse.reduce((a: any, b: any) => a + b, 0))); } catch (e) { console.log("reduce-skips", "ERR", String(e && e.name)); }
try { console.log("keys-of-holes", String(Object.keys(sparse).join(','))); } catch (e) { console.log("keys-of-holes", "ERR", String(e && e.name)); }
