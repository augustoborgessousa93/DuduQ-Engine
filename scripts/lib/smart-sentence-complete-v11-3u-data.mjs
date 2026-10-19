export const COMPLETE_IMAGE_INSTRUCTION_EN = "Look at the picture and complete the sentence.";
export const COMPLETE_IMAGE_INSTRUCTION_PT = "De acordo com a imagem, complete a frase.";
export const COMPLETE_TRANSLATION_PREFIX_PT = "A frase traduzida para o português é:";

export const COMPLETE_TRANSLATIONS_PT = Object.freeze({
  "Y1M02-Q008": "Conte até quatro.",
  "Y1M02-Q018": "Conte até nove.",
  "Y1M03-Q008": "A cor é verde.",
  "Y1M03-Q018": "A cor é cinza.",
  "Y1M04-Q008": "É um estojo.",
  "Y1M04-Q018": "É uma caneta.",
  "Y1M06-Q008": "A aranha é meu animal de estimação.",
  "Y1M06-Q018": "A aranha grande é meu animal de estimação.",
  "Y2M01-Q008": "A sequência de letras é F, G, H, I, J.",
  "Y2M02-Q008": "Há oito objetos.",
  "Y2M02-Q018": "A forma é um retângulo.",
  "Y2M03-Q008": "Ele é meu pai.",
  "Y2M03-Q018": "Ele é meu avô.",
  "Y2M04-Q008": "A bola está em cima da caixa.",
  "Y2M04-Q018": "Meu brinquedo favorito é uma bola.",
  "Y2M05-Q008": "São dois.",
  "Y2M05-Q018": "São três.",
  "Y2M06-Q008": "É um mamão.",
  "Y2M06-Q018": "Eu vejo uma banana grande.",
  "Y3M01-Q008": "Eu tenho nove anos.",
  "Y3M01-Q018": "Meu nome começa com B.",
  "Y3M02-Q008": "Eu tenho cinco anos.",
  "Y3M02-Q018": "Há nove maçãs.",
  "Y3M03-Q008": "Ela é minha mãe.",
  "Y3M03-Q018": "Este é meu avô.",
  "Y3M04-Q008": "Há dois objetos.",
  "Y3M04-Q018": "Há três objetos.",
  "Y3M05-Q008": "A forma é um quadrado.",
  "Y3M05-Q018": "Dois mais três é igual a cinco.",
  "Y3M06-Q008": "Eu gosto de batata.",
  "Y3M06-Q018": "Eu gosto de laranja.",
  "Y4M01-Q008": "Hoje é segunda-feira.",
  "Y4M01-Q018": "Hoje é quinta-feira.",
  "Y4M02-Q008": "Eu estudo Geografia na segunda-feira.",
  "Y4M02-Q018": "Eu estudo Arte na segunda-feira.",
  "Y4M03-Q008": "Meu aniversário é em agosto.",
  "Y4M03-Q018": "Meu aniversário é em janeiro.",
  "Y4M04-Q008": "Eu jogo vôlei.",
  "Y4M04-Q018": "Ele está jogando vôlei.",
  "Y4M05-Q008": "Que cor é? É vermelho.",
  "Y4M05-Q018": "Eu gosto da camiseta.",
  "Y4M06-Q008": "É um trem.",
  "Y4M06-Q018": "Eu vou de ônibus.",
  "Y5M01-Q008": "Eu sou Mia.",
  "Y5M01-Q018": "Meu país é o Brasil.",
  "Y5M02-Q008": "Eu durmo todos os dias.",
  "Y5M02-Q018": "Eu durmo todos os dias.",
  "Y5M03-Q008": "Ela é irmã.",
  "Y5M03-Q018": "Ela é mãe.",
  "Y5M04-Q008": "O número é cinquenta e oito.",
  "Y5M04-Q018": "O número é sessenta e oito.",
  "Y5M05-Q008": "Há um prato na casa.",
  "Y5M05-Q018": "Há uma TV na casa.",
  "Y5M06-Q008": "Este é o banco.",
  "Y5M06-Q018": "Esta é a loja de calçados."
});

export function completeSuccessTranslationPt(translation) {
  return `${COMPLETE_TRANSLATION_PREFIX_PT} ${String(translation || "").trim()}`.trim();
}

export function normalizeCompleteMediaRole(role) {
  return String(role || "").trim().toLowerCase().replaceAll("_", "-");
}

export function isCompleteImageClueBinding(binding) {
  return ["stimulus", "supporting-image"].includes(normalizeCompleteMediaRole(binding?.role));
}
