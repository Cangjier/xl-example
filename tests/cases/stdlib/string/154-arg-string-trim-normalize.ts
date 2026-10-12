// xl:title 边界：trim 族与 normalize
// xl:round 681
// xl:judge stdout
// xl:end
try { console.log("trim", String(' \t x \n '.trim())); } catch (e) { console.log("trim", "ERR", String(e && e.name)); }
try { console.log("trimStart", String(' x '.trimStart())); } catch (e) { console.log("trimStart", "ERR", String(e && e.name)); }
try { console.log("trimEnd", String(' x '.trimEnd())); } catch (e) { console.log("trimEnd", "ERR", String(e && e.name)); }
try { console.log("normalize", String('e\u0301'.normalize('NFC') === '\u00e9')); } catch (e) { console.log("normalize", "ERR", String(e && e.name)); }
try { console.log("normalize-length", String('e\u0301'.normalize('NFC').length)); } catch (e) { console.log("normalize-length", "ERR", String(e && e.name)); }
