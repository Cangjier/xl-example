// xl:note import-equals with a three-part qualified name
// xl:expect Import,Namespace,NamespaceBody
declare namespace B { namespace C { class D {} } }
import A = B.C.D;
