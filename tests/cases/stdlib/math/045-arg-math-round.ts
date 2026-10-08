// xl:title 参数位：Math.round 的半值与无实参的 min / max
// xl:round 681
// xl:judge stdout
// xl:end
try { console.log("round-2.5", String(Math.round(2.5))); } catch (e) { console.log("round-2.5", "ERR", String(e && e.name)); }
try { console.log("round--2.5", String(Math.round(-2.5))); } catch (e) { console.log("round--2.5", "ERR", String(e && e.name)); }
try { console.log("round--0.5", String(Math.round(-0.5))); } catch (e) { console.log("round--0.5", "ERR", String(e && e.name)); }
try { console.log("round-0.5", String(Math.round(0.5))); } catch (e) { console.log("round-0.5", "ERR", String(e && e.name)); }
try { console.log("min-empty", String(Math.min())); } catch (e) { console.log("min-empty", "ERR", String(e && e.name)); }
try { console.log("max-empty", String(Math.max())); } catch (e) { console.log("max-empty", "ERR", String(e && e.name)); }
try { console.log("hypot", String(Math.hypot(3, 4))); } catch (e) { console.log("hypot", "ERR", String(e && e.name)); }
try { console.log("cbrt", String(Math.cbrt(27))); } catch (e) { console.log("cbrt", "ERR", String(e && e.name)); }
try { console.log("sign--0", String(1 / Math.sign(-0))); } catch (e) { console.log("sign--0", "ERR", String(e && e.name)); }
try { console.log("trunc--1.7", String(Math.trunc(-1.7))); } catch (e) { console.log("trunc--1.7", "ERR", String(e && e.name)); }
try { console.log("clz32", String(Math.clz32(1))); } catch (e) { console.log("clz32", "ERR", String(e && e.name)); }
try { console.log("imul", String(Math.imul(3, 4))); } catch (e) { console.log("imul", "ERR", String(e && e.name)); }
try { console.log("fround", String(Math.fround(1.1))); } catch (e) { console.log("fround", "ERR", String(e && e.name)); }
try { console.log("pow", String(Math.pow(2, 10))); } catch (e) { console.log("pow", "ERR", String(e && e.name)); }
