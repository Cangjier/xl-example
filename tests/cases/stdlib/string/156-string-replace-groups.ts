// xl:title replace 里的 `$1` 与转义
// xl:round 682
// xl:judge stdout
// xl:end
try { console.log("no-group-numeric", String('abc'.replace('b', '[$1]'))); } catch (e) { console.log("no-group-numeric", "ERR", String(e && e.name)); }
try { console.log("amp", String('abc'.replace('b', '<$&>'))); } catch (e) { console.log("amp", "ERR", String(e && e.name)); }
try { console.log("dollar", String('a$b'.replace('$', '$$'))); } catch (e) { console.log("dollar", "ERR", String(e && e.name)); }
try { console.log("backtick", String('abc'.replace('b', '[$`]'))); } catch (e) { console.log("backtick", "ERR", String(e && e.name)); }
try { console.log("quote", String('abc'.replace('b', "[$']"))); } catch (e) { console.log("quote", "ERR", String(e && e.name)); }
try { console.log("all", String('a-b-c'.replaceAll('-', '+'))); } catch (e) { console.log("all", "ERR", String(e && e.name)); }
