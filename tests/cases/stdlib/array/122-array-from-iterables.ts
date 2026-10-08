// xl:title Array.from / 展开对生成器与字符串的落点
// xl:round 683
// xl:judge stdout
// xl:end
function* g() { yield 1; yield 2; }
try { console.log("from-generator", String(Array.from(g()).join(','))); } catch (e) { console.log("from-generator", "ERR", String(e && e.name)); }
try { console.log("spread-generator", String([...g()].join(','))); } catch (e) { console.log("spread-generator", "ERR", String(e && e.name)); }
try { console.log("from-map-fn", String(Array.from('abc', (ch: any) => ch.toUpperCase()).join(''))); } catch (e) { console.log("from-map-fn", "ERR", String(e && e.name)); }
try { console.log("from-arraylike", String(Array.from({ length: 2, 0: 'x', 1: 'y' }).join(''))); } catch (e) { console.log("from-arraylike", "ERR", String(e && e.name)); }
