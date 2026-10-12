// xl:title 运行期加在原型上的方法对既有实例可见
// xl:round 681
// xl:judge stdout
// xl:end
class K { n = 1; }
const k: any = new K();
(K.prototype as any).twice = function () { return this.n * 2; };
try { console.log("late-proto", String(k.twice())); } catch (e) { console.log("late-proto", "ERR", String(e && e.name)); }
try { console.log("own", String(Object.prototype.hasOwnProperty.call(k, 'twice'))); } catch (e) { console.log("own", "ERR", String(e && e.name)); }
