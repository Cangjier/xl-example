// xl:title 参数位：replace 的 `$&` / `$\`` / `$$` 与函数替换
// xl:round 681
// xl:judge stdout
// xl:end
try { console.log("amp", String('abc'.replace('b', '[$&]'))); } catch (e) { console.log("amp", "ERR", String(e && e.name)); }
try { console.log("dollar", String('a$b'.replace('$', '$$'))); } catch (e) { console.log("dollar", "ERR", String(e && e.name)); }
try { console.log("prefix", String('abc'.replace('b', '<$`>'))); } catch (e) { console.log("prefix", "ERR", String(e && e.name)); }
try { console.log("suffix", String('abc'.replace('b', "<$'>"))); } catch (e) { console.log("suffix", "ERR", String(e && e.name)); }
try { console.log("fn", String('abc'.replace('b', (m: any) => m.toUpperCase()))); } catch (e) { console.log("fn", "ERR", String(e && e.name)); }
try { console.log("replaceAll", String('aXbXc'.replaceAll('X', '-'))); } catch (e) { console.log("replaceAll", "ERR", String(e && e.name)); }
