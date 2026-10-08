// xl:title 标签模板的 this 与成员方法上的调用
// xl:round 681
// xl:judge stdout
// xl:end
const o: any = { tag(strings: any, ...vals: any) { return String(this === o) + ':' + strings.raw.length + ':' + vals.join(','); } };
try { console.log("this", String(o.tag`a${1}b${2}c`)); } catch (e) { console.log("this", "ERR", String(e && e.name)); }
try { console.log("raw-escapes", String((() => { const tag: any = (s: any) => s.raw[0]; return tag`\n`; })())); } catch (e) { console.log("raw-escapes", "ERR", String(e && e.name)); }
try { console.log("cooked", String((() => { const tag: any = (s: any) => String(s[0] === '\n'); return tag`\n`; })())); } catch (e) { console.log("cooked", "ERR", String(e && e.name)); }
