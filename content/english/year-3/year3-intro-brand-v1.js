/* DUDUQ English Year 3 — official EduQ Play intro brand only.
   Reuses Core 1.0.12 Intro exactly as-is and injects only the official
   collection image. No timing, animation, background, music, transition
   or layout behavior is changed.
*/
(function(root){
  "use strict";

  const OFFICIAL_LOGO="https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/4818c92bc7154d99dfa6e34d9d0ad97ce705ac75/Imagens%20Ilustrativa/Logo%20EduQ%20Play.png";
  const ALT="EduQ Play";

  function install(){
    const original=root?.DuduQIntro;
    if(!original||original.__y3OfficialEduqPlayLogo)return false;
    if(typeof original.show!=="function")return false;

    const wrapped=Object.freeze({
      ...original,
      __y3OfficialEduqPlayLogo:true,
      officialCollectionLogo:OFFICIAL_LOGO,
      show(options={}){
        return original.show({
          ...options,
          collectionName:ALT,
          collectionLogo:OFFICIAL_LOGO,
          collectionAlt:ALT
        });
      }
    });

    root.DuduQIntro=wrapped;
    root.DUDUQ_Y3_INTRO_BRAND=Object.freeze({
      status:"OFFICIAL_LOGO",
      asset:OFFICIAL_LOGO,
      assetRepository:"augustoborgessousa93/Assets-DuduQ",
      assetCommit:"4818c92bc7154d99dfa6e34d9d0ad97ce705ac75",
      assetPath:"Imagens Ilustrativa/Logo EduQ Play.png"
    });
    return true;
  }

  root.addEventListener?.("duduq:engine-ready",install);
  if(root?.DuduQIntro)install();
})(typeof globalThis!=="undefined"?globalThis:this);
