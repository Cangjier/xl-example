// xl:title 大循环里的数值与字符串累积（GC 压力）
// xl:round 681
// xl:judge stdout
// xl:end
let sum = 0;
for (let i = 0; i < 20000; i++) sum += i % 7;
try { console.log("sum", String(sum)); } catch (e) { console.log("sum", "ERR", String(e && e.name)); }
let s = ''; for (let i = 0; i < 200; i++) s += (i % 10);
try { console.log("strlen", String(s.length)); } catch (e) { console.log("strlen", "ERR", String(e && e.name)); }
