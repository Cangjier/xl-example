// xl:title 展开的复制语义与顺序
// xl:round 683
// xl:judge stdout
// xl:end
const src: any = [1, 2, 3];
const copy: any = [...src];
copy.push(4);
try { console.log("array-copy", String(src.join(',') + '|' + copy.join(','))); } catch (e) { console.log("array-copy", "ERR", String(e && e.name)); }
try { console.log("object-order", String((() => { const log: string[] = []; const a: any = { get x() { log.push('a'); return 1; } }; const b: any = { ...a, y: (log.push('b'), 2) }; return log.join(',') + '|' + b.x + b.y; })())); } catch (e) { console.log("object-order", "ERR", String(e && e.name)); }
try { console.log("string-spread", String([...'ab'].join('-'))); } catch (e) { console.log("string-spread", "ERR", String(e && e.name)); }
try { console.log("spread-into-call", String(Math.max(...[1, 9, 3]))); } catch (e) { console.log("spread-into-call", "ERR", String(e && e.name)); }
try { console.log("spread-with-holes", String(String([...[1, , 3]].length))); } catch (e) { console.log("spread-with-holes", "ERR", String(e && e.name)); }
