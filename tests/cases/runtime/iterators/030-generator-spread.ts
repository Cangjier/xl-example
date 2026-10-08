// xl:title 生成器被展开、被 return 中途收走
// xl:round 682
// xl:judge stdout
// xl:end
function* g2() { yield 1; yield 2; yield 3; }
try { console.log("spread", String([...g2()].join(','))); } catch (e) { console.log("spread", "ERR", String(e && e.name)); }
try { console.log("from", String(Array.from(g2()).join(','))); } catch (e) { console.log("from", "ERR", String(e && e.name)); }
try { console.log("early-return", String((() => { const it: any = g2(); const first = it.next().value; const done = it.return(9); return first + ':' + done.value + ':' + done.done + ':' + it.next().done; })())); } catch (e) { console.log("early-return", "ERR", String(e && e.name)); }
