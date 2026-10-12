// xl:title 逻辑赋值与幂赋值：`??=` / `||=` / `&&=` / `**=`
// xl:round 681
// xl:judge stdout
// xl:end
let a: any = null; a ??= 5;
let b: any = 0; b ||= 7;
let c: any = 1; c &&= 9;
let d: any = 2; d **= 3;
try { console.log("nullish", String(a)); } catch (e) { console.log("nullish", "ERR", String(e && e.name)); }
try { console.log("or", String(b)); } catch (e) { console.log("or", "ERR", String(e && e.name)); }
try { console.log("and", String(c)); } catch (e) { console.log("and", "ERR", String(e && e.name)); }
try { console.log("pow", String(d)); } catch (e) { console.log("pow", "ERR", String(e && e.name)); }
