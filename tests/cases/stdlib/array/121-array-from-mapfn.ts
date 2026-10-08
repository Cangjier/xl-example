// xl:title Array.from 的映射函数与类数组
// xl:round 682
// xl:judge stdout
// xl:end
try { console.log("mapfn", String(Array.from({ length: 3 }, (v: any, i: any) => i * 2).join(','))); } catch (e) { console.log("mapfn", "ERR", String(e && e.name)); }
try { console.log("string-map", String(Array.from('ab', (ch: any) => ch.toUpperCase()).join(''))); } catch (e) { console.log("string-map", "ERR", String(e && e.name)); }
try { console.log("set", String(Array.from(new Set(['x', 'y'])).join(','))); } catch (e) { console.log("set", "ERR", String(e && e.name)); }
try { console.log("arraylike-args", String(Array.from([1, 2], (x: any) => x + 1).join(','))); } catch (e) { console.log("arraylike-args", "ERR", String(e && e.name)); }
