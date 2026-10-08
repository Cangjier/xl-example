// xl:title Math 的边界值
// xl:round 682
// xl:judge stdout
// xl:end
try { console.log("sin0", String(Math.sin(0))); } catch (e) { console.log("sin0", "ERR", String(e && e.name)); }
try { console.log("cos0", String(Math.cos(0))); } catch (e) { console.log("cos0", "ERR", String(e && e.name)); }
try { console.log("log1", String(Math.log(1))); } catch (e) { console.log("log1", "ERR", String(e && e.name)); }
try { console.log("log0", String(Math.log(0))); } catch (e) { console.log("log0", "ERR", String(e && e.name)); }
try { console.log("exp0", String(Math.exp(0))); } catch (e) { console.log("exp0", "ERR", String(e && e.name)); }
try { console.log("atan2", String(Math.atan2(1, 1))); } catch (e) { console.log("atan2", "ERR", String(e && e.name)); }
try { console.log("sqrt-negative", String(Math.sqrt(-1))); } catch (e) { console.log("sqrt-negative", "ERR", String(e && e.name)); }
try { console.log("abs-negzero", String(1 / Math.abs(-0))); } catch (e) { console.log("abs-negzero", "ERR", String(e && e.name)); }
try { console.log("pi", String(Math.PI.toFixed(5))); } catch (e) { console.log("pi", "ERR", String(e && e.name)); }
try { console.log("floor-neg", String(Math.floor(-0.5))); } catch (e) { console.log("floor-neg", "ERR", String(e && e.name)); }
try { console.log("ceil-neg", String(Math.ceil(-0.5))); } catch (e) { console.log("ceil-neg", "ERR", String(e && e.name)); }
try { console.log("pow-frac", String(Math.pow(9, 0.5))); } catch (e) { console.log("pow-frac", "ERR", String(e && e.name)); }
