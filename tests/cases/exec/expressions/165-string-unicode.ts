// xl:title 字符串的码元与码点
// xl:round 682
// xl:judge stdout
// xl:end
try { console.log("escape-brace", String('\u{1F600}'.length)); } catch (e) { console.log("escape-brace", "ERR", String(e && e.name)); }
try { console.log("iter", String([...'\u{1F600}'].length)); } catch (e) { console.log("iter", "ERR", String(e && e.name)); }
try { console.log("hex", String('\x41')); } catch (e) { console.log("hex", "ERR", String(e && e.name)); }
try { console.log("code-points", String(['\u{1F600}'.charCodeAt(0), '\u{1F600}'.codePointAt(0)].join(','))); } catch (e) { console.log("code-points", "ERR", String(e && e.name)); }
try { console.log("for-of-count", String((() => { let n = 0; for (const ch of 'a\u{1F600}b') n++; return n; })())); } catch (e) { console.log("for-of-count", "ERR", String(e && e.name)); }
try { console.log("compare", String('a' < 'b')); } catch (e) { console.log("compare", "ERR", String(e && e.name)); }
