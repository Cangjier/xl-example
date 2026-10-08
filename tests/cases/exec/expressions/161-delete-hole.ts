// xl:title delete 数组元素与 in 走原型链
// xl:round 681
// xl:judge stdout
// xl:end
const arr: any = [1, 2, 3];
delete arr[1];
try { console.log("length", String(arr.length)); } catch (e) { console.log("length", "ERR", String(e && e.name)); }
try { console.log("join", String(arr.join('-'))); } catch (e) { console.log("join", "ERR", String(e && e.name)); }
try { console.log("has-1", String(1 in arr)); } catch (e) { console.log("has-1", "ERR", String(e && e.name)); }
try { console.log("in-proto", String('toString' in {})); } catch (e) { console.log("in-proto", "ERR", String(e && e.name)); }
try { console.log("hasown", String(Object.prototype.hasOwnProperty.call(arr, 1))); } catch (e) { console.log("hasown", "ERR", String(e && e.name)); }
