// xl:title 参数位：Map / Set 的 forEach 实参与 SameValueZero 键
// xl:round 681
// xl:judge stdout
// xl:end
const m: any = new Map([[NaN, 'nan'], [-0, 'zero']]);
const seen: any = [];
m.forEach((v: any, k: any, self: any) => seen.push(String(k) + '=' + String(v) + ':' + String(self === m)));
try { console.log("map-forEach", String(seen.join('|'))); } catch (e) { console.log("map-forEach", "ERR", String(e && e.name)); }
try { console.log("map-nan", String(m.get(NaN))); } catch (e) { console.log("map-nan", "ERR", String(e && e.name)); }
try { console.log("map-zero", String(m.get(0))); } catch (e) { console.log("map-zero", "ERR", String(e && e.name)); }
const st: any = new Set([3, 1, 3, 2]);
try { console.log("set-order", String([...st].join(','))); } catch (e) { console.log("set-order", "ERR", String(e && e.name)); }
try { console.log("set-readd", String((() => { st.delete(1); st.add(1); return [...st].join(','); })())); } catch (e) { console.log("set-readd", "ERR", String(e && e.name)); }
try { console.log("weakmap-primitive", String((() => { try { new WeakMap().set(1 as any, 2 as any); return 'no-throw'; } catch (e: any) { return String(e.name); } })())); } catch (e) { console.log("weakmap-primitive", "ERR", String(e && e.name)); }
