export function createEngine(answer){let selected=null;return Object.freeze({select:id=>(selected=id),evaluate:()=>selected===answer,reset:()=>{selected=null}})}
