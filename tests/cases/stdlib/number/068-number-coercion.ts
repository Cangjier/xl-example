// xl:title Number / parseInt / isNaN 的转换口径
// xl:round 682
// xl:judge stdout
// xl:end
try { console.log("number-forms", String([Number(' 12 '), Number(''), Number('0x10'), Number(true), Number(null)].join(','))); } catch (e) { console.log("number-forms", "ERR", String(e && e.name)); }
try { console.log("number-nan", String(String(Number(undefined)))); } catch (e) { console.log("number-nan", "ERR", String(e && e.name)); }
try { console.log("parseint-null", String(String(parseInt(null as any)))); } catch (e) { console.log("parseint-null", "ERR", String(e && e.name)); }
try { console.log("isnan", String([isNaN('x'), Number.isNaN('x'), isNaN(NaN), Number.isNaN(NaN)].join(','))); } catch (e) { console.log("isnan", "ERR", String(e && e.name)); }
try { console.log("finite", String([isFinite('12'), isFinite('x'), Number.isFinite('12')].join(','))); } catch (e) { console.log("finite", "ERR", String(e && e.name)); }
