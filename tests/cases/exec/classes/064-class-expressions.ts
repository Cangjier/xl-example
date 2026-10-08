// xl:title 类表达式：自引用名、立即实例化、方法名
// xl:round 683
// xl:judge stdout
// xl:end
const Named = class Self { who() { return typeof Self; } };
const inst: any = new Named();
const anon: any = new (class { m() { return 'anon'; } })();
try { console.log("self-name", String(inst.who())); } catch (e) { console.log("self-name", "ERR", String(e && e.name)); }
try { console.log("anon", String(anon.m())); } catch (e) { console.log("anon", "ERR", String(e && e.name)); }
try { console.log("name-prop", String(typeof Named.name)); } catch (e) { console.log("name-prop", "ERR", String(e && e.name)); }
try { console.log("static-block-order", String((() => { const log: string[] = []; class K { static a = (log.push('field'), 1); static { log.push('block'); } static b = (log.push('field2'), 2); } return log.join(','); })())); } catch (e) { console.log("static-block-order", "ERR", String(e && e.name)); }
