// xl:title 位运算与数值边界
// xl:round 682
// xl:judge stdout
// xl:end
try { console.log("ushr", String(-8 >>> 28)); } catch (e) { console.log("ushr", "ERR", String(e && e.name)); }
try { console.log("shl", String(1 << 31)); } catch (e) { console.log("shl", "ERR", String(e && e.name)); }
try { console.log("and-or-xor", String([5 & 3, 5 | 3, 5 ^ 3, ~5].join(','))); } catch (e) { console.log("and-or-xor", "ERR", String(e && e.name)); }
try { console.log("shifts", String([-1 >> 1, -1 >>> 1].join(','))); } catch (e) { console.log("shifts", "ERR", String(e && e.name)); }
try { console.log("float", String(0.1 + 0.2)); } catch (e) { console.log("float", "ERR", String(e && e.name)); }
try { console.log("epsilon", String(Number.EPSILON > 0)); } catch (e) { console.log("epsilon", "ERR", String(e && e.name)); }
try { console.log("infinity", String([1 / 0, -1 / 0, 0 / 0].join(','))); } catch (e) { console.log("infinity", "ERR", String(e && e.name)); }
try { console.log("negzero", String(1 / -0)); } catch (e) { console.log("negzero", "ERR", String(e && e.name)); }
try { console.log("pow-negative", String(2 ** -1)); } catch (e) { console.log("pow-negative", "ERR", String(e && e.name)); }
