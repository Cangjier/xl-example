// xl:title 参数位：parseInt 的 radix / parseFloat 的指数
// xl:round 681
// xl:judge stdout
// xl:end
try { console.log("int-0x10-16", String(parseInt('0x10', 16))); } catch (e) { console.log("int-0x10-16", "ERR", String(e && e.name)); }
try { console.log("int-10-2", String(parseInt('10', 2))); } catch (e) { console.log("int-10-2", "ERR", String(e && e.name)); }
try { console.log("int-space-42px", String(parseInt(' 42px'))); } catch (e) { console.log("int-space-42px", "ERR", String(e && e.name)); }
try { console.log("int-08", String(parseInt('08'))); } catch (e) { console.log("int-08", "ERR", String(e && e.name)); }
try { console.log("float-1e3", String(parseFloat('1e3'))); } catch (e) { console.log("float-1e3", "ERR", String(e && e.name)); }
try { console.log("float-1.5x", String(parseFloat('1.5x'))); } catch (e) { console.log("float-1.5x", "ERR", String(e && e.name)); }
try { console.log("isInteger", String([Number.isInteger(1.0), Number.isSafeInteger(2 ** 53), Number.isFinite('1')])); } catch (e) { console.log("isInteger", "ERR", String(e && e.name)); }
