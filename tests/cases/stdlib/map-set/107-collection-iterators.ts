// xl:title 集合的迭代器形状与 for-of 解构
// xl:round 682
// xl:judge stdout
// xl:end
try { console.log("entries-next", String((() => { const it: any = new Map([[1, 'a']]).entries(); const first = it.next(); return first.value.join(':') + ':' + first.done + ':' + it.next().done; })())); } catch (e) { console.log("entries-next", "ERR", String(e && e.name)); }
try { console.log("forof-pairs", String((() => { let out = ''; for (const [k, v] of new Map([[1, 'a'], [2, 'b']]).entries()) out += k + v; return out; })())); } catch (e) { console.log("forof-pairs", "ERR", String(e && e.name)); }
try { console.log("keys-spread", String([...new Set([1, 2, 3]).keys()].join(','))); } catch (e) { console.log("keys-spread", "ERR", String(e && e.name)); }
try { console.log("values", String([...new Map([[1, 'a']]).values()].join(','))); } catch (e) { console.log("values", "ERR", String(e && e.name)); }
try { console.log("from-set", String(Array.from(new Set([1, 1, 2])).join(','))); } catch (e) { console.log("from-set", "ERR", String(e && e.name)); }
try { console.log("from-map", String(Array.from(new Map([[1, 'a']])).map((p: any) => p[0] + p[1]).join(','))); } catch (e) { console.log("from-map", "ERR", String(e && e.name)); }
