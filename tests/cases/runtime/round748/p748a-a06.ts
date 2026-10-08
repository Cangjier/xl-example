// xl:title 抛出的形状：非 `Error`、`undefined`、带 `finally` 的传播
// xl:round 748
// xl:judge stdout
// xl:end
try { throw "plain"; } catch (e) { console.log(typeof e, e); }
try { throw 42; } catch (e) { console.log(typeof e, e, (e as any).message); }
try { throw { code: "E1" }; } catch (e) { console.log(typeof e, (e as any).code); }
try { throw undefined; } catch (e) { console.log("caught undefined", e); }
function f() { try { throw new Error("boom"); } finally { console.log("fin"); } }
try { f(); } catch (e) { console.log("outer", (e as Error).message); }
