// xl:title 边界：charAt / charCodeAt / codePointAt / fromCharCode / fromCodePoint
// xl:round 681
// xl:judge stdout
// xl:end
try { console.log("charAt-9", String('abc'.charAt(9))); } catch (e) { console.log("charAt-9", "ERR", String(e && e.name)); }
try { console.log("charCodeAt-9", String('abc'.charCodeAt(9))); } catch (e) { console.log("charCodeAt-9", "ERR", String(e && e.name)); }
try { console.log("codePointAt-0", String('A'.codePointAt(0))); } catch (e) { console.log("codePointAt-0", "ERR", String(e && e.name)); }
try { console.log("fromCharCode", String(String.fromCharCode(97, 98))); } catch (e) { console.log("fromCharCode", "ERR", String(e && e.name)); }
try { console.log("fromCodePoint", String(String.fromCodePoint(0x1f600))); } catch (e) { console.log("fromCodePoint", "ERR", String(e && e.name)); }
try { console.log("concat", String('a'.concat(1, true))); } catch (e) { console.log("concat", "ERR", String(e && e.name)); }
