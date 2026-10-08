// xl:note import-equals with a qualified entity name
// xl:expect Import,Namespace,NamespaceBody
declare namespace B { class C {} }
import A = B.C;
