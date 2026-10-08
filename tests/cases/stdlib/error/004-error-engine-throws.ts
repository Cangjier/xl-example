// xl:title 引擎自己抛的错也是 TypeError（且能接住）
// xl:judge stdout
// xl:end

try { const o: any = undefined; o.x; } catch (e: any) { console.log("prop", e.name, e instanceof TypeError); }
try { (1 as any)(); } catch (e: any) { console.log("call", e.name, e instanceof Error); }
