// xl:title 参数位：indexOf / lastIndexOf / includes 的 fromIndex
// xl:round 681
// xl:judge stdout
// xl:end
const a: any = [1, 2, 3, 2, 1];
try { console.log("indexOf-2--2", String(a.indexOf(2, -2))); } catch (e) { console.log("indexOf-2--2", "ERR", String(e && e.name)); }
try { console.log("indexOf-1--1", String(a.indexOf(1, -1))); } catch (e) { console.log("indexOf-1--1", "ERR", String(e && e.name)); }
try { console.log("lastIndexOf-1--1", String(a.lastIndexOf(1, -1))); } catch (e) { console.log("lastIndexOf-1--1", "ERR", String(e && e.name)); }
try { console.log("lastIndexOf-2-2", String(a.lastIndexOf(2, 2))); } catch (e) { console.log("lastIndexOf-2-2", "ERR", String(e && e.name)); }
try { console.log("includes-1--100", String(a.includes(1, -100))); } catch (e) { console.log("includes-1--100", "ERR", String(e && e.name)); }
try { console.log("includes-1-4", String(a.includes(1, 4))); } catch (e) { console.log("includes-1-4", "ERR", String(e && e.name)); }
try { console.log("indexOf-any-99", String(a.indexOf(9, 99))); } catch (e) { console.log("indexOf-any-99", "ERR", String(e && e.name)); }
