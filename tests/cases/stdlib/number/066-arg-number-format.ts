// xl:title 参数位：toFixed / toPrecision / toExponential / toString 的基数
// xl:round 681
// xl:judge stdout
// xl:end
try { console.log("toFixed-1.005", String((1.005).toFixed(2))); } catch (e) { console.log("toFixed-1.005", "ERR", String(e && e.name)); }
try { console.log("toFixed-2.5", String((2.5).toFixed(0))); } catch (e) { console.log("toFixed-2.5", "ERR", String(e && e.name)); }
try { console.log("toFixed-neg2.5", String((-2.5).toFixed(0))); } catch (e) { console.log("toFixed-neg2.5", "ERR", String(e && e.name)); }
try { console.log("toFixed-0digits", String((7).toFixed())); } catch (e) { console.log("toFixed-0digits", "ERR", String(e && e.name)); }
try { console.log("toPrecision-3", String((1234.5678).toPrecision(3))); } catch (e) { console.log("toPrecision-3", "ERR", String(e && e.name)); }
try { console.log("toExponential-2", String((1234.5).toExponential(2))); } catch (e) { console.log("toExponential-2", "ERR", String(e && e.name)); }
try { console.log("toString-16", String((255).toString(16))); } catch (e) { console.log("toString-16", "ERR", String(e && e.name)); }
try { console.log("toString-2", String((0.5).toString(2))); } catch (e) { console.log("toString-2", "ERR", String(e && e.name)); }
try { console.log("toString-36", String((35).toString(36))); } catch (e) { console.log("toString-36", "ERR", String(e && e.name)); }
