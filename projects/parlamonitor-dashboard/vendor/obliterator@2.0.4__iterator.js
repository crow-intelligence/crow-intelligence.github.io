/**
 * Bundled by jsDelivr using Rollup v4.62.2 and esbuild v0.28.1.
 * Original file: /npm/obliterator@2.0.4/iterator.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
var i,u;function f(){if(u)return i;u=1;function t(r){if(typeof r!="function")throw new Error("obliterator/iterator: expecting a function!");this.next=r}return typeof Symbol<"u"&&(t.prototype[Symbol.iterator]=function(){return this}),t.of=function(){var r=arguments,n=r.length,o=0;return new t(function(){return o>=n?{done:!0}:{done:!1,value:r[o++]}})},t.empty=function(){var r=new t(function(){return{done:!0}});return r},t.fromSequence=function(r){var n=0,o=r.length;return new t(function(){return n>=o?{done:!0}:{done:!1,value:r[n++]}})},t.is=function(r){return r instanceof t?!0:typeof r=="object"&&r!==null&&typeof r.next=="function"},i=t,i}var e=f(),a=e.empty,c=e.fromSequence,p=e.is,s=e.of;export{e as default,a as empty,c as fromSequence,p as is,s as of};
//# sourceMappingURL=/sm/126987167b44b3160dbe6a7c830a6f1b4841b446b5e087b499d090a689ddb4d0.map