// xl:title 参数位：join 对洞与 undefined / null 的文本
// xl:round 681
// xl:judge stdout
// xl:end
try { console.log("holes", String([1, , 3].join('-'))); } catch (e) { console.log("holes", "ERR", String(e && e.name)); }
try { console.log("undefnull", String([undefined, null].join('-'))); } catch (e) { console.log("undefnull", "ERR", String(e && e.name)); }
try { console.log("single", String([7].join('-'))); } catch (e) { console.log("single", "ERR", String(e && e.name)); }
try { console.log("empty", String([].join('-'))); } catch (e) { console.log("empty", "ERR", String(e && e.name)); }
try { console.log("tostring-of-holes", String(String([1, , 3]))); } catch (e) { console.log("tostring-of-holes", "ERR", String(e && e.name)); }
