// xl:title 直接迭代 Map / Set 本体（不是 entries()）
// xl:round 683
// xl:judge stdout
// xl:end
const m: any = new Map([[1, 'a'], [2, 'b']]);
const s: any = new Set([3, 4]);
try { console.log("map-spread", String([...m].map((p: any) => p[0] + p[1]).join(','))); } catch (e) { console.log("map-spread", "ERR", String(e && e.name)); }
try { console.log("set-spread", String([...s].join(','))); } catch (e) { console.log("set-spread", "ERR", String(e && e.name)); }
try { console.log("map-forof", String((() => { let out = ''; for (const [k, v] of m) out += k + v; return out; })())); } catch (e) { console.log("map-forof", "ERR", String(e && e.name)); }
try { console.log("set-forof", String((() => { let out = ''; for (const v of s) out += v; return out; })())); } catch (e) { console.log("set-forof", "ERR", String(e && e.name)); }
try { console.log("map-from", String(Array.from(m).map((p: any) => p.join('')).join(','))); } catch (e) { console.log("map-from", "ERR", String(e && e.name)); }
