// xl:title 数值与文本的边界（再往前一格）
// xl:round 683
// xl:judge stdout
// xl:end
try { console.log("tofixed-carry", String((9.995).toFixed(2))); } catch (e) { console.log("tofixed-carry", "ERR", String(e && e.name)); }
try { console.log("tofixed-big", String((1e21).toFixed(2))); } catch (e) { console.log("tofixed-big", "ERR", String(e && e.name)); }
try { console.log("parseint-plus", String(parseInt('+12'))); } catch (e) { console.log("parseint-plus", "ERR", String(e && e.name)); }
try { console.log("parseint-inf", String(String(parseInt('Infinity')))); } catch (e) { console.log("parseint-inf", "ERR", String(e && e.name)); }
try { console.log("number-empty-hex", String([Number(''), Number('  '), Number('0b11'), Number('1_000')].join(','))); } catch (e) { console.log("number-empty-hex", "ERR", String(e && e.name)); }
try { console.log("tostring-radix-neg", String((-255).toString(16))); } catch (e) { console.log("tostring-radix-neg", "ERR", String(e && e.name)); }
try { console.log("uint32", String((4294967296).toString(16))); } catch (e) { console.log("uint32", "ERR", String(e && e.name)); }
