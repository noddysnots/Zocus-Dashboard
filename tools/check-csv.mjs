#!/usr/bin/env node
/* Runs a CSV through the dashboard's own parser (js/data.js) and prints JSON: {ok, errors, warnings, convs, reps, days}. */
import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const noop=()=>{},el=()=>({style:{},classList:{add:noop,remove:noop},addEventListener:noop,appendChild:noop,setAttribute:noop});
const w={addEventListener:noop,matchMedia:()=>({matches:false}),localStorage:{getItem:noop,setItem:noop},indexedDB:{},console,
  document:{addEventListener:noop,getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],createElement:el,body:el(),readyState:'loading'}};
w.window=w;w.self=w;vm.createContext(w);vm.runInContext(fs.readFileSync(path.join(root,'js/data.js'),'utf8'),w);
const r=w.ZocusData.build(fs.readFileSync(process.argv[2],'utf8'),path.basename(process.argv[2]));
const ds=r.ds||{};console.log(JSON.stringify({ok:!!r.ok,errors:r.errors||[],warnings:r.warnings||[],convs:(ds.CONVS||[]).length,reps:(ds.REPS||[]).length,days:ds.CONVS?Math.max(0,...ds.CONVS.map(c=>c.d))+1:0}));
