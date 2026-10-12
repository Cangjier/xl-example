// xl:title 字符串的遍历与切分（含代理对）
// xl:round 682
// xl:judge stdout
// xl:end
try { console.log("for-of", String((() => { const out: string[] = []; for (const ch of 'a\u{1F600}b') out.push(ch); return out.length + ':' + out[1].length; })())); } catch (e) { console.log("for-of", "ERR", String(e && e.name)); }
try { console.log("split-empty", String('a\u{1F600}b'.split('').length)); } catch (e) { console.log("split-empty", "ERR", String(e && e.name)); }
try { console.log("spread", String([...'ab'].join('-'))); } catch (e) { console.log("spread", "ERR", String(e && e.name)); }
try { console.log("at-emoji", String('a\u{1F600}'.at(1).length)); } catch (e) { console.log("at-emoji", "ERR", String(e && e.name)); }
try { console.log("index-of", String('abc'.indexOf('c'))); } catch (e) { console.log("index-of", "ERR", String(e && e.name)); }
