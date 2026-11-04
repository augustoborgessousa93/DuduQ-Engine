#!/usr/bin/env node
// Read-only visual review dashboard for compiled Y1M01. Never approves images.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
const d=JSON.parse(readFileSync('qa/results/y1m01-real-module-audit.json','utf8'));
assert.equal(d.moduleId,'Y1M01');
assert.equal(d.questions.length,20);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const css=[
 '*{box-sizing:border-box}body{margin:0;color:#173656;background:#f4f8fe;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}',
 'header{background:linear-gradient(110deg,#0862af,#158fe6);color:#fff;padding:35px 18px}',
 '.wrap{max-width:1220px;margin:auto}h1{font-size:clamp(27px,4vw,39px);margin:8px 0;letter-spacing:-.04em}',
 'header p{line-height:1.6;max-width:870px;opacity:.94}.eyebrow{font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:.15em}',
 'main{max-width:1220px;margin:auto;padding:24px 16px 70px}',
 '.warning{background:#fff7e6;border-left:4px solid #f6ac25;color:#694913;padding:15px;border-radius:10px;line-height:1.55}',
 '.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin:20px 0}',
 '.stat{background:#fff;border:1px solid #dbe6f4;border-radius:15px;padding:17px}',
 '.stat strong{font-size:30px;color:#065ea9;display:block}.stat span{font-size:12px;color:#536b82}',
 '.toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin:24px 0}',
 '.toolbar button,.toolbar input{font:inherit;padding:11px;border-radius:10px;border:1px solid #c5d7ec}',
 '.toolbar button{cursor:pointer;background:#fff;color:#165885;font-weight:700}',
 '.toolbar button[aria-pressed=true]{background:#086ebd;color:#fff;border-color:#086ebd}',
 '.toolbar input{flex:1;min-width:175px}.toolbar a{color:#0563ab;font-weight:700}',
 '.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}',
 '.question{background:white;border:1px solid #dae6f4;border-radius:18px;overflow:hidden}',
 '.question.hide{display:none}.heading{padding:19px 19px 14px}',
 '.qid{font-size:21px;font-weight:800;color:#095c9f;letter-spacing:-.02em}',
 '.badge{display:inline-block;font-size:12px;border-radius:50px;background:#fce9df;color:#8d3c18;padding:5px 10px;font-weight:700;margin-left:9px}',
 '.badge.good{background:#dcf4e7;color:#196d44}.badge.mid{background:#fff3d8;color:#81541b}',
 '.meta{font-size:12px;color:#60788f;margin-top:7px;line-height:1.5}',
 '.images{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;padding:0 14px 14px}',
 '.media{border:1px solid #e0eaf5;border-radius:12px;background:#f7faff;padding:10px;min-width:0}',
 '.picture{height:135px;display:grid;place-items:center;background:white;border-radius:8px;overflow:hidden}',
 '.picture img{max-width:100%;max-height:100%;object-fit:contain}',
 '.type{font-size:11px;font-weight:800;margin-top:7px;color:#315c84}',
 '.id{font-size:10px;color:#607991;overflow-wrap:anywhere;margin-top:4px}',
 '.footer{border-top:1px solid #eaf1f8;font-size:11px;color:#617b93;padding:12px 19px}',
 '@media(max-width:800px){.grid{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}}',
 '@media(max-width:420px){.picture{height:115px}.stat strong{font-size:24px}}'
].join('\n');
const labels={OFFICIAL_PNG:'PNG oficial',PROVISIONAL:'Provisória',
 LEGACY_OR_NOT_PROVEN_OFFICIAL:'Origem a conferir',BROKEN:'Arquivo indisponível'};
const classifications={
 OWNER_APPROVED_VISUAL:['Q001 aprovada','good'],
 QA_PREVIEW_HUMAN_REVIEW_PENDING:['Conferência necessária','mid'],
 NEEDS_IMAGE_REMEDIATION:['Precisa de correção',''],
 VISUAL_QA_NOT_YET_SIGNED_OFF:['Revisão pendente','mid']
};
const items=d.questions.map(q=>{
 const arr=d.imageOccurrences.filter(x=>x.questionId===q.questionId);
 const flag=(q.problemIds||[]).length>0;
 const status=classifications[q.status]||[q.status,''];
 const thumbnails=arr.map(x=>{
  const url=x.manifestVerified?'/'+String(x.path).replace(/^\/+/,''):'';
  const picture=url?'<img loading="lazy" src="'+esc(url)+'" alt="'+esc(x.semantic||x.mediaId)+'"/>':
   '<span style="color:#9c4747;font-size:12px">Mídia não verificável</span>';
  return '<div class="media"><div class="picture">'+picture+'</div>'+
   '<div class="type">'+esc(labels[x.classification]||x.classification)+'</div>'+
   '<div class="id">'+esc(x.mediaId)+'</div>'+
   '<div class="id">'+esc(x.source||'Fonte sem comprovação')+'</div></div>';
 }).join('');
 return '<article class="question" data-pending="'+flag+'" data-approved="'+
  (q.status==='OWNER_APPROVED_VISUAL')+'" data-search="'+
  esc((q.questionId+' '+q.mechanic+' '+arr.map(x=>x.semantic+' '+x.mediaId).join(' ')).toLowerCase())+'">'+
  '<div class="heading"><span class="qid">'+esc(q.questionId)+'</span>'+
  '<span class="badge '+status[1]+'">'+esc(status[0])+'</span>'+
  '<div class="meta">'+esc(q.mechanic||'Mecânica não informada')+
  ' · Gabarito: <b>'+esc(q.answerLetter||q.answerKey||'n/d')+
  '</b> · '+arr.length+' referências visuais</div></div>'+
  '<div class="images">'+thumbnails+'</div>'+
  '<div class="footer">Esta tela não altera nem aprova questões.</div></article>';
}).join('\n');
const stats=[['Questões',20],['Mídias distintas',d.counts.uniqueMediaIds],
 ['Referências provisórias',d.counts.provisionalReferences],
 ['Aguardam revisão',d.counts.remainingVisualReviewQuestions]];
const html=[
 '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>'+
 '<meta name="viewport" content="width=device-width,initial-scale=1"/>'+
 '<title>DUDUQ English · Revisão do Módulo 01</title><style>'+css+'</style></head><body>',
 '<header><div class="wrap"><div class="eyebrow">DUDUQ English · Revisão pedagógica</div>'+
 '<h1>1º ano · Módulo 01</h1><p>As 20 questões e suas imagens reais compiladas, organizadas para conferência visual e identificação do que ainda precisa melhorar.</p></div></header>',
 '<main><div class="warning"><b>Esta página não é um certificado de conclusão.</b> '+
 'A Q001 de Hello foi aprovada pelo responsável. As novas cenas de manhã/tarde/noite nas Q003/Q004 ainda exigem conferência durante o jogo. As demais questões aguardam revisão.</div>',
 '<div class="stats">'+stats.map(([n,v])=>'<div class="stat"><strong>'+v+
  '</strong><span>'+esc(n)+'</span></div>').join('')+'</div>',
 '<nav class="toolbar"><button data-filter="all" aria-pressed="true">Todas</button>'+
 '<button data-filter="pending" aria-pressed="false">Com pendências</button>'+
 '<button data-filter="approved" aria-pressed="false">Aprovadas</button>'+
 '<input type="search" id="query" aria-label="Buscar questão" placeholder="Buscar Q004, morning, Hello…"/>'+
 '<a href="/play/english/year-1/module-01/">Abrir o módulo no jogo</a></nav>',
 '<p id="count" aria-live="polite"></p><div class="grid">'+items+'</div></main>',
 '<script>',
 'const qs=[...document.querySelectorAll(".question")];const bs=[...document.querySelectorAll("button[data-filter]")];',
 'const input=document.getElementById("query");let filter="all";',
 'function draw(){let n=0;const term=input.value.trim().toLowerCase();for(const el of qs){',
 'const ok=(filter==="all"||filter==="pending"&&el.dataset.pending==="true"||',
 'filter==="approved"&&el.dataset.approved==="true")&&el.dataset.search.includes(term);',
 'el.classList.toggle("hide",!ok);if(ok)n++;}',
 'document.getElementById("count").textContent=n+" de 20 questões exibidas";}',
 'bs.forEach(b=>b.addEventListener("click",()=>{filter=b.dataset.filter;',
 'bs.forEach(x=>x.setAttribute("aria-pressed",String(x===b)));draw()}));',
 'input.addEventListener("input",draw);draw();',
 '</script></body></html>'
].join('');
mkdirSync('qa/results',{recursive:true});
writeFileSync('qa/results/y1m01-review.html',html);
console.log('DUDUQ_Y1M01_REVIEW_PAGE='+JSON.stringify({
 questions:d.questions.length,thumbnails:d.imageOccurrences.length,
 bytes:Buffer.byteLength(html),path:'qa/results/y1m01-review.html',readOnly:true}));
