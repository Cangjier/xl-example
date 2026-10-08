// xl:title `throw` 一个非 Error 值的形状
// xl:round 736
// xl:judge stdout
// xl:end
try { throw "plain"; } catch (e: any) { console.log(typeof e, e, e instanceof Error); }
try { throw 42; } catch (e: any) { console.log(typeof e, e + 1); }
try { throw null; } catch (e: any) { console.log(e === null, typeof e); }
try { throw { a: 1 }; } catch (e: any) { console.log(e.a, Object.prototype.toString.call(e)); }
