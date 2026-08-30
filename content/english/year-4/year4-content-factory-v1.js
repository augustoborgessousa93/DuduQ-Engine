/* DUDUQ English Year 4 — functional-reading content factory v1.0.0
   Source contract: DUDUQ English pedagogical revision v2.3.
   CONTENT-only helper. No mechanic release, scoring or runtime-layout patch.
*/
(function () {
  "use strict";

  const VERSION = "1.0.0";
  if (window.DuduQYear4Factory?.version === VERSION) return;

  function text(value, fallback = "") {
    const out = String(value == null ? "" : value).trim();
    return out || fallback;
  }

  function difficulty(value) {
    const raw = text(value).toLowerCase();
    if (raw.includes("dif") || raw === "hard") return "hard";
    if (raw.includes("méd") || raw.includes("med") || raw === "medium") return "medium";
    return "easy";
  }

  function esc(value) {
    return text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function svgData(svg) {
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function contextCard(label, icon, accent = "#4a90c2", sublabel = "") {
    const safeLabel = esc(label);
    const safeSub = esc(sublabel);
    return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="760" height="460" viewBox="0 0 760 460" role="img" aria-label="${safeLabel}">
      <rect width="760" height="460" rx="44" fill="#ffffff"/>
      <rect x="28" y="28" width="704" height="404" rx="36" fill="#f7fbff" stroke="#9dbdd7" stroke-width="7"/>
      <circle cx="380" cy="175" r="105" fill="${accent}" opacity=".16"/>
      <text x="380" y="218" text-anchor="middle" font-family="Arial,sans-serif" font-size="112">${esc(icon)}</text>
      <text x="380" y="338" text-anchor="middle" font-family="Arial,sans-serif" font-size="44" font-weight="900" fill="#173f67">${safeLabel}</text>
      ${safeSub ? `<text x="380" y="385" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="#58738b">${safeSub}</text>` : ""}
    </svg>`);
  }

  function profileCard(name, fields) {
    const initial = text(name, "?").charAt(0).toUpperCase();
    const rows = Object.entries(fields || {}).filter(([, value]) => text(value));
    const rowSvg = rows.map(([key, value], index) => {
      const y = 126 + index * 58;
      return `<text x="245" y="${y}" font-family="Arial,sans-serif" font-size="22" font-weight="800" fill="#5b7489">${esc(key)}</text><text x="245" y="${y + 27}" font-family="Arial,sans-serif" font-size="31" font-weight="900" fill="#173f67">${esc(value)}</text>`;
    }).join("");
    return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="820" height="520" viewBox="0 0 820 520" role="img" aria-label="perfil fictício ${esc(name)}"><rect width="820" height="520" rx="44" fill="#fff"/><rect x="28" y="28" width="764" height="464" rx="36" fill="#f8fbfe" stroke="#93b4d2" stroke-width="7"/><circle cx="135" cy="170" r="78" fill="#dceefa" stroke="#5d8eb8" stroke-width="7"/><text x="135" y="197" text-anchor="middle" font-family="Arial,sans-serif" font-size="74" font-weight="900" fill="#2d648f">${esc(initial)}</text><path d="M72 335c0-64 38-105 63-105s63 41 63 105v82H72z" fill="#8fc2e8"/>${rowSvg}</svg>`);
  }

  function locationCard(subject, relation, reference) {
    const relationY = relation === "under" ? 325 : 210;
    const subjectY = relation === "under" ? 330 : relation === "in" ? 225 : 210;
    const referenceX = relation === "beside" ? 455 : 380;
    const subjectX = relation === "beside" ? 245 : relation === "behind" ? 335 : 380;
    const refIcon = /table/.test(reference) ? "🪑" : /chair/.test(reference) ? "🪑" : /bus/.test(reference) ? "🚌" : "📦";
    const subIcon = /backpack/.test(subject) ? "🎒" : /truck/.test(subject) ? "🚚" : "🐶";
    return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="760" height="460" viewBox="0 0 760 460" role="img" aria-label="${esc(subject)} ${esc(relation)} ${esc(reference)}"><rect width="760" height="460" rx="44" fill="#fff"/><rect x="28" y="28" width="704" height="404" rx="36" fill="#f7fbff" stroke="#9dbdd7" stroke-width="7"/><text x="${referenceX}" y="${relationY}" text-anchor="middle" font-size="120">${refIcon}</text><text x="${subjectX}" y="${subjectY}" text-anchor="middle" font-size="95">${subIcon}</text><rect x="250" y="350" width="260" height="58" rx="28" fill="#e5f1fa"/><text x="380" y="389" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" font-weight="900" fill="#173f67">${esc(relation.toUpperCase())}</text></svg>`);
  }

  function semanticCard(query) {
    const raw = text(query);
    if (!raw || !raw.includes(":")) return null;
    const parts = raw.split(":");
    const kind = parts[0].toLowerCase();
    if (kind === "country") return { src: contextCard(parts[1] || "country", "📍", "#4b9c70", "mapa como apoio, não apenas bandeira"), status:"semantic-context", visualKey:raw };
    if (kind === "weekday") return { src: contextCard(parts[1] || "day", "📅", "#4a90c2", "weekly agenda"), status:"semantic-context", visualKey:raw };
    if (kind === "month") return { src: contextCard(parts[1] || "month", "🗓️", "#6b88c4", "calendar"), status:"semantic-context", visualKey:raw };
    if (kind === "season") { const season=text(parts[1]).toLowerCase(); const icon=({spring:"🌷",summer:"☀️",autumn:"🍂",winter:"❄️"})[season]||"🌤️"; return {src:contextCard(season,icon,"#67a46f"),status:"semantic-context",visualKey:raw}; }
    if (kind === "month-season") { const month=parts[1]||"month", season=parts[2]||"season", icon=({spring:"🌷",summer:"☀️",autumn:"🍂",winter:"❄️"})[season]||"📅"; return {src:contextCard(`${month} • ${season}`,icon,"#6c8fc5","calendar + season scene"),status:"semantic-context",visualKey:raw}; }
    if (kind === "subject") { const subject=parts.slice(1).join(" "); const icon=/math/.test(subject)?"➗":/geograph/.test(subject)?"🌎":/history/.test(subject)?"🏛️":"📘"; return {src:contextCard(subject,icon,"#7b82c8","school subject"),status:"semantic-context",visualKey:raw}; }
    if (kind === "preference") return {src:contextCard(parts.slice(2).join(" ")||"preference","⭐","#d9a72e",parts[1]||"favorite"),status:"semantic-context",visualKey:raw};
    if (kind === "sport-action") { const sport=parts[1]||"sport", icon=({soccer:"⚽",basketball:"🏀",tennis:"🎾",volleyball:"🏐"})[sport]||"🏃"; return {src:contextCard(sport,icon,"#4b9c70","playing"),status:"semantic-context",visualKey:raw}; }
    if (kind === "clothes-size") return {src:contextCard(parts[1]||"clothes","👕","#8c77bd",`Size: ${parts[2]||""}`),status:"semantic-context",visualKey:raw};
    if (kind === "room") { const room=parts.slice(1).join(" ").replace(/-/g," "); const icon=/kitchen/.test(room)?"🍳":/bathroom/.test(room)?"🚿":/living/.test(room)?"🛋️":/bedroom/.test(room)?"🛏️":"🍽️"; return {src:contextCard(room,icon,"#5a9b9b"),status:"semantic-context",visualKey:raw}; }
    if (kind === "person-room") { const person=parts[1]||"person", room=parts.slice(2).join(" ").replace(/-/g," "); const icon=/kitchen/.test(room)?"🍳":/living/.test(room)?"🛋️":/bathroom/.test(room)?"🚿":"🛏️"; return {src:contextCard(`${person} • ${room}`,icon,"#5a9b9b","personagem fictício no cômodo"),status:"semantic-context",visualKey:raw}; }
    if (kind === "room-scene") return {src:contextCard(parts.slice(1).join(" ").replace(/-/g," "),"🍽️","#5a9b9b","group scene"),status:"semantic-context",visualKey:raw};
    if (kind === "food-preference") return {src:contextCard(`${parts[1]||"food"} → ${parts[2]||"food"}`,"🍎","#d27a58","like • prefer"),status:"semantic-context",visualKey:raw};
    if (kind === "location") { const subject=(parts[1]||"object").replace(/-/g," "), relation=parts[2]||"in", reference=(parts[3]||"place").replace(/-/g," "); return {src:locationCard(subject,relation,reference),status:"semantic-context",visualKey:raw}; }
    if (kind === "profile") { const name=text(parts[1],"student"); if(name.toLowerCase()==="leonardo") return {src:profileCard("Leonardo",{NICKNAME:"Leo",AGE:"9",COUNTRY:"Brazil","FAVORITE COLOR":"blue","FAVORITE SPORT":"soccer",BIRTHDAY:"August 20"}),status:"semantic-context",visualKey:raw}; if(name.toLowerCase()==="maya") return {src:profileCard("Maya",{AGE:parts[2]||"10",FROM:parts[3]||"Canada"}),status:"semantic-context",visualKey:raw}; return {src:profileCard(name,{}),status:"semantic-context",visualKey:raw}; }
    if (kind === "duo") return {src:contextCard(`${parts[1]||"Leo"} + ${parts[2]||"Mia"}`,"👧🏽👦🏻","#6a95c0","friends"),status:"semantic-context",visualKey:raw};
    return null;
  }

  function resolveVisual(query, expression) {
    const semantic=semanticCard(query); if(semantic?.src) return semantic;
    try { const result=window.DuduQSmartVisual?.resolve?.(query,{expression}); if(result?.src) return result; } catch(_) {}
    try { const src=window.DuduQAssets?.resolveImage?.(query); if(src) return {src,status:"official",visualKey:"official:"+query}; } catch(_) {}
    return {src:null,status:"asset-gap",visualKey:"gap:"+text(query).toLowerCase()};
  }

  function alternativeRecord(alternative) {
    const out={id:alternative.id,text:text(alternative.text)};
    const spoken=text(alternative.audioText,alternative.text);
    if(spoken){ out.audio={enabled:true,text:spoken,language:"en-US",role:"option"}; out.metadata={speechText:spoken,speechLanguage:"en-US",textOptional:false,readingScaffold:true}; }
    if(alternative.imageQuery){ const visual=resolveVisual(alternative.imageQuery,alternative.expression); if(visual.src) out.image={enabled:true,src:visual.src,alt:text(alternative.imageAlt,alternative.text)}; out.metadata={...(out.metadata||{}),visualResolution:{status:visual.status,visualKey:visual.visualKey,requested:alternative.imageQuery}}; }
    return out;
  }

  function questionFor(item,moduleSpec) {
    const question={id:item.id,subject:"english",year:4,module:moduleSpec.module,skill:{code:null,description:item.skill},difficulty:difficulty(item.difficulty),statement:item.prompt,instruction:item.instruction||"Leia ou ouça com apoio da tela e arraste a resposta correta.",contentLanguage:"en",instructionLanguage:"pt-BR",feedbackLanguage:"pt-BR",alternatives:item.alternatives.map(alternativeRecord),feedback:{correct:"Muito bem!",incorrect:"Observe a pista, releia ou ouça novamente e tente outra vez."},delivery:{mechanic:"drag-drop",preferred:["drag-drop"],blocked:[]},metadata:{sourceStatus:item.status,sourceSkill:item.skill,sourceAbility:item.ability,sourceStatement:item.prompt,sourceMedia:item.media,sourceFormat:item.format,sourceMechanic:item.sourceMechanic,sourceReading:item.reading,sourceAnswer:item.answer,literacyProfile:"Y4_FUNCTIONAL_READING",readingMode:"GRADUAL",functionalReading:true,scaffoldedReading:true,sourceVersion:"DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2.3",assetStatus:"smart-resolver-first"}};
    if(item.listenText) question.audio={enabled:true,text:item.listenText,language:"en-US",role:"content"};
    const visualQuery=text(item.visualQuery); const visual=visualQuery?resolveVisual(visualQuery,item.expression):null; const target={id:"answer-target",label:"Observe, leia e ouça",capacity:1,kind:"box"};
    if(visual?.src){target.image={src:visual.src,alt:text(item.visualAlt,visualQuery)};target.alt=text(item.visualAlt,visualQuery);} if(item.listenText) target.audio={text:item.listenText,language:"en-US",description:"Ouvir pista em inglês"};
    question.answer={type:"pairs",value:[[item.answer.id,"answer-target"]]}; question.metadata.targets=[target]; question.metadata.visualResolution=visual?{status:visual.status,visualKey:visual.visualKey,requested:visualQuery}:{status:"not-required",visualKey:"",requested:""}; return question;
  }

  function buildModule(spec) {
    const activities=spec.items.map(function(item,index){return{id:`y4-m${String(spec.module).padStart(2,"0")}-a${String(index+1).padStart(2,"0")}`,title:item.topic||spec.title,topic:item.topic||spec.title,mechanic:"drag-drop",questions:[questionFor(item,spec)]};});
    return{id:`duduq-english-y4-module-${String(spec.module).padStart(2,"0")}`,version:spec.version||"1.0.0-v23-functional-reading",subject:"english",year:4,module:spec.module,title:spec.title,description:spec.objective,estimatedMinutes:14,pedagogyPolicy:{specification:"DUDUQ_FACTORY_PEDAGOGICAL_SPECIFICATION_v1.1",profile:"Y4_FUNCTIONAL_READING",priority:"listen-speak-read-short-functional-structures",readingMode:"GRADUAL",functionalReading:true,scaffoldNewStructures:true,supportedProduction:"2-3 sentences",fictitiousProfilesOnly:true,multimodalityPriority:true},factory:{source:"DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2.3.docx",sourceRevision:"Revisão Pedagógica Integral v2.3",scaleChannel:"scale-v1",thinContent:true,yearSpecificMechanicPatch:false,routingContract:"activity.mechanic === question.delivery.mechanic"},activities};
  }

  function publish(spec){window.DUDUQ_CONTENT=window.DUDUQ_CONTENT||{};window.DUDUQ_CONTENT.english=window.DUDUQ_CONTENT.english||{};window.DUDUQ_CONTENT.english.year4=window.DUDUQ_CONTENT.english.year4||{};const key=`module${String(spec.module).padStart(2,"0")}`;window.DUDUQ_CONTENT.english.year4[key]=buildModule(spec);return window.DUDUQ_CONTENT.english.year4[key];}
  window.DuduQYear4Factory=Object.freeze({version:VERSION,buildModule,publish,resolveVisual});
})();
