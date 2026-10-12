// xl:title 参数位：startsWith / endsWith 的 position
// xl:round 681
// xl:judge stdout
// xl:end
try { console.log("starts-b-1", String('abc'.startsWith('b', 1))); } catch (e) { console.log("starts-b-1", "ERR", String(e && e.name)); }
try { console.log("starts-a-1", String('abc'.startsWith('a', 1))); } catch (e) { console.log("starts-a-1", "ERR", String(e && e.name)); }
try { console.log("ends-b-2", String('abc'.endsWith('b', 2))); } catch (e) { console.log("ends-b-2", "ERR", String(e && e.name)); }
try { console.log("ends-c-2", String('abc'.endsWith('c', 2))); } catch (e) { console.log("ends-c-2", "ERR", String(e && e.name)); }
