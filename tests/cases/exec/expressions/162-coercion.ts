// xl:title 宽松相等与算术转换
// xl:round 681
// xl:judge stdout
// xl:end
try { console.log("num-str", String(1 == '1')); } catch (e) { console.log("num-str", "ERR", String(e && e.name)); }
try { console.log("null-undef", String(null == undefined)); } catch (e) { console.log("null-undef", "ERR", String(e && e.name)); }
try { console.log("nan", String(NaN === NaN)); } catch (e) { console.log("nan", "ERR", String(e && e.name)); }
try { console.log("arr-num", String([1] == 1)); } catch (e) { console.log("arr-num", "ERR", String(e && e.name)); }
try { console.log("plus-arr", String(String([] + []))); } catch (e) { console.log("plus-arr", "ERR", String(e && e.name)); }
try { console.log("plus-obj", String(String({} + []))); } catch (e) { console.log("plus-obj", "ERR", String(e && e.name)); }
try { console.log("cmp-str-num", String(['10' < '9', '10' < 9].join(','))); } catch (e) { console.log("cmp-str-num", "ERR", String(e && e.name)); }
try { console.log("unary-plus", String([+true, +'', +' 12 ', +null].join(','))); } catch (e) { console.log("unary-plus", "ERR", String(e && e.name)); }
