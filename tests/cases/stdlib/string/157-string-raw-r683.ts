// xl:title String.raw 与模板的 raw 段
// xl:round 683
// xl:judge stdout
// xl:end
try { console.log("raw-basic", String(String.raw`a\nb`)); } catch (e) { console.log("raw-basic", "ERR", String(e && e.name)); }
try { console.log("raw-sub", String((() => { const x = 1; return String.raw`a\n${x}b`; })())); } catch (e) { console.log("raw-sub", "ERR", String(e && e.name)); }
try { console.log("raw-length", String((() => { const tag: any = (s: any, ...v: any[]) => String(s.raw.length) + ':' + v.length; return tag`a${1}b${2}c`; })())); } catch (e) { console.log("raw-length", "ERR", String(e && e.name)); }
try { console.log("cooked-vs-raw", String((() => { const tag: any = (s: any) => (s[0] === '\n') + ':' + (s.raw[0] === '\\n'); return tag`\n`; })())); } catch (e) { console.log("cooked-vs-raw", "ERR", String(e && e.name)); }
