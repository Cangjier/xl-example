// xl:title 参数位：indexOf / lastIndexOf 的 fromIndex 与 substring 的交换
// xl:round 681
// xl:judge stdout
// xl:end
try { console.log("indexOf-2", String('ababa'.indexOf('a', 2))); } catch (e) { console.log("indexOf-2", "ERR", String(e && e.name)); }
try { console.log("indexOf-neg", String('ababa'.indexOf('a', -3))); } catch (e) { console.log("indexOf-neg", "ERR", String(e && e.name)); }
try { console.log("lastIndexOf-2", String('ababa'.lastIndexOf('a', 2))); } catch (e) { console.log("lastIndexOf-2", "ERR", String(e && e.name)); }
try { console.log("substring-swap", String('abcdef'.substring(4, 1))); } catch (e) { console.log("substring-swap", "ERR", String(e && e.name)); }
try { console.log("substr", String('abcdef'.substr(2, 3))); } catch (e) { console.log("substr", "ERR", String(e && e.name)); }
try { console.log("at--1", String('abc'.at(-1))); } catch (e) { console.log("at--1", "ERR", String(e && e.name)); }
try { console.log("at-9", String('abc'.at(9))); } catch (e) { console.log("at-9", "ERR", String(e && e.name)); }
