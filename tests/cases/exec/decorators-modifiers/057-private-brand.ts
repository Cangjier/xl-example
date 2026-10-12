// xl:title 私有名的品牌检查与错接收者
// xl:round 682
// xl:judge stdout
// xl:want differ
// xl:why 私有名在本仓是**同键的普通属性**（第 195 轮的口径），没有「真私有」那一层：`Box2.prototype.get.call({})` 读 `#v` 读不到时给 `undefined`，JS 给 `TypeError`（品牌检查 `#v in o` 本身是好的）
// xl:end
class Box2 { #v = 1; has(o: any): boolean { return #v in o; } get(): number { return this.#v; } }
const b2: any = new Box2();
try { console.log("brand-own", String(b2.has(b2))); } catch (e) { console.log("brand-own", "ERR", String(e && e.name)); }
try { console.log("brand-other", String(b2.has({}))); } catch (e) { console.log("brand-other", "ERR", String(e && e.name)); }
try { console.log("get", String(b2.get())); } catch (e) { console.log("get", "ERR", String(e && e.name)); }
try { console.log("wrong-receiver", String((() => { try { return String(Box2.prototype.get.call({})); } catch (e: any) { return 'ERR ' + String(e.name); } })())); } catch (e) { console.log("wrong-receiver", "ERR", String(e && e.name)); }
