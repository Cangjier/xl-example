// xl:title 参数位：split 的 limit / 空分隔符
// xl:round 681
// xl:judge stdout
// xl:end
try { console.log("limit-2", String('a-b-c'.split('-', 2))); } catch (e) { console.log("limit-2", "ERR", String(e && e.name)); }
try { console.log("limit-0", String('a-b-c'.split('-', 0))); } catch (e) { console.log("limit-0", "ERR", String(e && e.name)); }
try { console.log("empty-sep", String('abc'.split(''))); } catch (e) { console.log("empty-sep", "ERR", String(e && e.name)); }
try { console.log("no-sep", String('abc'.split('-'))); } catch (e) { console.log("no-sep", "ERR", String(e && e.name)); }
