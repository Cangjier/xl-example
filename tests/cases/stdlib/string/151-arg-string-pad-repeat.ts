// xl:title 参数位：padStart / padEnd / repeat 的边界
// xl:round 681
// xl:judge stdout
// xl:end
try { console.log("padStart", String('5'.padStart(3, '0'))); } catch (e) { console.log("padStart", "ERR", String(e && e.name)); }
try { console.log("padStart-short", String('abc'.padStart(2, 'x'))); } catch (e) { console.log("padStart-short", "ERR", String(e && e.name)); }
try { console.log("padStart-pad-long", String('x'.padStart(4, 'abcd'))); } catch (e) { console.log("padStart-pad-long", "ERR", String(e && e.name)); }
try { console.log("padEnd", String('5'.padEnd(3, '0'))); } catch (e) { console.log("padEnd", "ERR", String(e && e.name)); }
try { console.log("repeat-0", String('ab'.repeat(0))); } catch (e) { console.log("repeat-0", "ERR", String(e && e.name)); }
try { console.log("repeat-2point9", String('ab'.repeat(2.9))); } catch (e) { console.log("repeat-2point9", "ERR", String(e && e.name)); }
try { console.log("repeat-neg", String('ab'.repeat(-1))); } catch (e) { console.log("repeat-neg", "ERR", String(e && e.name)); }
