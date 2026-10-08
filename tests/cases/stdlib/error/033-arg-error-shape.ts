// xl:title 边界：Error 子类的 name / message / instanceof
// xl:round 681
// xl:judge stdout
// xl:end
class MyErr extends Error { code: number; constructor(code: number) { super('code ' + code); this.code = code; this.name = 'MyErr'; } }
const e: any = new MyErr(7);
try { console.log("name", String(e.name)); } catch (e) { console.log("name", "ERR", String(e && e.name)); }
try { console.log("message", String(e.message)); } catch (e) { console.log("message", "ERR", String(e && e.name)); }
try { console.log("code", String(e.code)); } catch (e) { console.log("code", "ERR", String(e && e.name)); }
try { console.log("instanceof", String([e instanceof MyErr, e instanceof Error].join(','))); } catch (e) { console.log("instanceof", "ERR", String(e && e.name)); }
