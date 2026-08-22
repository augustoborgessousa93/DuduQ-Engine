/* DUDUQ FACTORY CLEAN BUILD
 * Source-derived Year 1 Module 01
 * Engine: Canary R124
 * No generated package or stale payload was used as an input.
 */
(function () {
  "use strict";
  window.DUDUQ_CONTENT = window.DUDUQ_CONTENT || {};
  window.DUDUQ_CONTENT.english = window.DUDUQ_CONTENT.english || {};
  window.DUDUQ_CONTENT.english.year1 = window.DUDUQ_CONTENT.english.year1 || {};

  const moduleDefinition = {
  "id": "duduq-english-y1-module-01",
  "version": "2.0.0-clean-r124-liveassets",
  "subject": "english",
  "year": 1,
  "module": 1,
  "title": "Hello! Greetings & Introductions",
  "description": "DuduQ English Year 1 — clean R124 source build.",
  "estimatedMinutes": 4,
  "intro": {
    "companyKicker": "UMA CRIAÇÃO DE",
    "companyLogo": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/LOGO%20DA%20EMPRESA_COLORIDO.png",
    "companyAlt": "Editora Brasil Cultural",
    "companyName": "Editora Brasil Cultural",
    "companyWidth": 820,
    "collectionLogo": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Logo%20EduQ%20Play.png",
    "collectionName": "EduQ Play",
    "collectionAlt": "EduQ Play",
    "collectionWidth": 760,
    "loadingLabel": "PREPARANDO SUA MISSÃO",
    "readyLabel": "MISSÃO PRONTA",
    "startLabel": "INICIAR MISSÃO",
    "hint": "Tudo pronto para começar!",
    "minDurationMs": 2200,
    "brandingDurationMs": 3000,
    "switchingDurationMs": 760,
    "missionMinDurationMs": 1200,
    "sparkCount": 14
  },
  "pedagogyPolicy": {
    "specification": "DUDUQ_FACTORY_PEDAGOGICAL_SPECIFICATION_v1.1",
    "profile": "Y1_EARLY_LITERACY",
    "readingDefault": "R0",
    "readingMax": "R1_NONESSENTIAL_ONLY",
    "smartSentenceScored": false,
    "audioRepeatable": true,
    "imagesLargeUnambiguous": true
  },
  "factory": {
    "tag": "clean-r124-liveassets-20260822",
    "cleanBuild": true,
    "artifactReuse": false,
    "stalePayloadReuse": false,
    "engine": "Canary R124",
    "integrationB": "1.2 Native Key Guard",
    "assetCatalog": "Assets-DuduQ/main"
  },
  "activities": [
    {
      "id": "Y1-M01-A01",
      "title": "Ouça e escolha",
      "mechanic": "target-shooter",
      "skill": {
        "description": "Escuta / Compreensão multimodal / Escuta + compreensão multimodal"
      },
      "questions": [
        {
          "id": "EN1-M1-01",
          "subject": "english",
          "year": 1,
          "module": 1,
          "skill": {
            "code": null,
            "description": "Identificar cumprimentos básicos usados no dia a dia."
          },
          "difficulty": "easy",
          "statement": "Ouça a saudação e escolha o que foi dito.",
          "instruction": "Ouça e toque na imagem correta.",
          "contentLanguage": "en",
          "instructionLanguage": "pt-BR",
          "feedbackLanguage": "pt-BR",
          "audio": {
            "enabled": true,
            "text": "Hello",
            "language": "en-US",
            "role": "instruction"
          },
          "alternatives": [
            {
              "id": "A",
              "text": "Goodbye"
            },
            {
              "id": "B",
              "text": "Hello"
            },
            {
              "id": "C",
              "text": "Good morning"
            }
          ],
          "answer": {
            "type": "single",
            "value": "B"
          },
          "feedback": {
            "correct": "Muito bem!",
            "incorrect": "Ouça novamente, observe as pistas e tente outra vez.",
            "language": "pt-BR"
          },
          "delivery": {
            "mechanic": "target-shooter",
            "preferred": [
              "target-shooter"
            ],
            "blocked": [
              "smart-sentence"
            ],
            "allowImage": true,
            "allowAudio": true
          },
          "metadata": {
            "screenTitle": "Ouça e escolha",
            "sourceStatus": "Manter\nFácil",
            "sourceSkill": "Escuta",
            "sourceStatement": "Ouça a saudação e escolha o que foi dito.",
            "sourceAlternatives": [
              {
                "id": "A",
                "text": "Goodbye"
              },
              {
                "id": "B",
                "text": "Hello"
              },
              {
                "id": "C",
                "text": "Good morning"
              }
            ],
            "sourceAnswer": {
              "id": "B",
              "text": "Hello",
              "raw": "B) Hello"
            },
            "sourceMedia": "Áudio EN obrigatório: “Hello”.\nFormato sugerido: Escuta + escolha.",
            "literacyDemand": "R0",
            "readingEssential": false,
            "yearProfile": "Y1_EARLY_LITERACY",
            "instructionAudioFallback": {
              "enabled": true,
              "language": "pt-BR",
              "text": "Ouça e toque na imagem correta.",
              "mode": "speech-synthesis-or-recorded"
            },
            "modalityAdaptation": "R0/R1-supported interaction preserving the source linguistic construct",
            "factoryCleanBuild": true,
            "integrationB": "v1.2-native-key-guard",
            "targetShooter": {
              "audioText": "Hello",
              "mode": "audio-to-image",
              "shape": "balloon",
              "correctIds": [
                "B"
              ],
              "difficulty": {
                "speed": 0.26,
                "objectCount": 3,
                "spawnIntervalMs": 950,
                "requiredCorrect": 1,
                "targetSize": 190,
                "timeLimitMs": 0,
                "timerMode": "none"
              },
              "items": [
                {
                  "id": "A",
                  "alt": "Goodbye",
                  "imageAsset": "goodbye",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Bye.png",
                  "image": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Bye.png",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "goodbye",
                    "strategy": "alias",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/Bye.png",
                    "file": "Bye.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Bye.png"
                  }
                },
                {
                  "id": "B",
                  "alt": "Hello",
                  "imageAsset": "hello",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Hello.png",
                  "image": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Hello.png",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "hello",
                    "strategy": "exact",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/Hello.png",
                    "file": "Hello.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Hello.png"
                  }
                },
                {
                  "id": "C",
                  "alt": "Good morning",
                  "imageAsset": "good morning",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Morning.png",
                  "image": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Morning.png",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "good morning",
                    "strategy": "exact",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/Good Morning.png",
                    "file": "Good Morning.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Morning.png"
                  }
                }
              ]
            }
          }
        },
        {
          "id": "EN1-M1-02",
          "subject": "english",
          "year": 1,
          "module": 1,
          "skill": {
            "code": null,
            "description": "Relacionar cumprimentos a situações cotidianas."
          },
          "difficulty": "easy",
          "statement": "É de manhã. Qual saudação combina com esse momento?",
          "instruction": "Ouça e toque na imagem correta.",
          "contentLanguage": "en",
          "instructionLanguage": "pt-BR",
          "feedbackLanguage": "pt-BR",
          "audio": {
            "enabled": true,
            "text": "Good morning",
            "language": "en-US",
            "role": "instruction"
          },
          "alternatives": [
            {
              "id": "A",
              "text": "Good afternoon"
            },
            {
              "id": "B",
              "text": "Goodbye"
            },
            {
              "id": "C",
              "text": "Good morning"
            }
          ],
          "answer": {
            "type": "single",
            "value": "C"
          },
          "feedback": {
            "correct": "Muito bem!",
            "incorrect": "Ouça novamente, observe as pistas e tente outra vez.",
            "language": "pt-BR"
          },
          "delivery": {
            "mechanic": "target-shooter",
            "preferred": [
              "target-shooter"
            ],
            "blocked": [
              "smart-sentence"
            ],
            "allowImage": true,
            "allowAudio": true
          },
          "metadata": {
            "screenTitle": "Ouça e escolha",
            "sourceStatus": "Manter\nFácil",
            "sourceSkill": "Compreensão multimodal",
            "sourceStatement": "É de manhã. Qual saudação combina com esse momento?",
            "sourceAlternatives": [
              {
                "id": "A",
                "text": "Good afternoon"
              },
              {
                "id": "B",
                "text": "Goodbye"
              },
              {
                "id": "C",
                "text": "Good morning"
              }
            ],
            "sourceAnswer": {
              "id": "C",
              "text": "Good morning",
              "raw": "C) Good morning"
            },
            "sourceMedia": "Imagem recomendada: manhã/sol nascendo.\nFormato sugerido: Imagem → palavra/frase.",
            "literacyDemand": "R0",
            "readingEssential": false,
            "yearProfile": "Y1_EARLY_LITERACY",
            "instructionAudioFallback": {
              "enabled": true,
              "language": "pt-BR",
              "text": "Ouça e toque na imagem correta.",
              "mode": "speech-synthesis-or-recorded"
            },
            "modalityAdaptation": "R0/R1-supported interaction preserving the source linguistic construct",
            "factoryCleanBuild": true,
            "integrationB": "v1.2-native-key-guard",
            "targetShooter": {
              "audioText": "Good morning",
              "mode": "audio-to-image",
              "shape": "balloon",
              "correctIds": [
                "C"
              ],
              "difficulty": {
                "speed": 0.26,
                "objectCount": 3,
                "spawnIntervalMs": 950,
                "requiredCorrect": 1,
                "targetSize": 190,
                "timeLimitMs": 0,
                "timerMode": "none"
              },
              "items": [
                {
                  "id": "A",
                  "alt": "Good afternoon",
                  "imageAsset": "good afternoon",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Afternoon.png",
                  "image": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Afternoon.png",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "good afternoon",
                    "strategy": "exact",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/Good Afternoon.png",
                    "file": "Good Afternoon.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Afternoon.png"
                  }
                },
                {
                  "id": "B",
                  "alt": "Goodbye",
                  "imageAsset": "goodbye",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Bye.png",
                  "image": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Bye.png",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "goodbye",
                    "strategy": "alias",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/Bye.png",
                    "file": "Bye.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Bye.png"
                  }
                },
                {
                  "id": "C",
                  "alt": "Good morning",
                  "imageAsset": "good morning",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Morning.png",
                  "image": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Morning.png",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "good morning",
                    "strategy": "exact",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/Good Morning.png",
                    "file": "Good Morning.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Morning.png"
                  }
                }
              ]
            }
          }
        },
        {
          "id": "EN1-M1-03",
          "subject": "english",
          "year": 1,
          "module": 1,
          "skill": {
            "code": null,
            "description": "Relacionar cumprimentos a situações cotidianas."
          },
          "difficulty": "easy",
          "statement": "É de tarde. Qual saudação combina com esse momento?",
          "instruction": "Ouça e toque na imagem correta.",
          "contentLanguage": "en",
          "instructionLanguage": "pt-BR",
          "feedbackLanguage": "pt-BR",
          "audio": {
            "enabled": true,
            "text": "Good afternoon",
            "language": "en-US",
            "role": "instruction"
          },
          "alternatives": [
            {
              "id": "A",
              "text": "Good afternoon"
            },
            {
              "id": "B",
              "text": "Good morning"
            },
            {
              "id": "C",
              "text": "Goodbye"
            }
          ],
          "answer": {
            "type": "single",
            "value": "A"
          },
          "feedback": {
            "correct": "Muito bem!",
            "incorrect": "Ouça novamente, observe as pistas e tente outra vez.",
            "language": "pt-BR"
          },
          "delivery": {
            "mechanic": "target-shooter",
            "preferred": [
              "target-shooter"
            ],
            "blocked": [
              "smart-sentence"
            ],
            "allowImage": true,
            "allowAudio": true
          },
          "metadata": {
            "screenTitle": "Ouça e escolha",
            "sourceStatus": "Manter\nFácil",
            "sourceSkill": "Compreensão multimodal",
            "sourceStatement": "É de tarde. Qual saudação combina com esse momento?",
            "sourceAlternatives": [
              {
                "id": "A",
                "text": "Good afternoon"
              },
              {
                "id": "B",
                "text": "Good morning"
              },
              {
                "id": "C",
                "text": "Goodbye"
              }
            ],
            "sourceAnswer": {
              "id": "A",
              "text": "Good afternoon",
              "raw": "A) Good afternoon"
            },
            "sourceMedia": "Imagem recomendada: período da tarde.\nFormato sugerido: Imagem → palavra/frase.",
            "literacyDemand": "R0",
            "readingEssential": false,
            "yearProfile": "Y1_EARLY_LITERACY",
            "instructionAudioFallback": {
              "enabled": true,
              "language": "pt-BR",
              "text": "Ouça e toque na imagem correta.",
              "mode": "speech-synthesis-or-recorded"
            },
            "modalityAdaptation": "R0/R1-supported interaction preserving the source linguistic construct",
            "factoryCleanBuild": true,
            "integrationB": "v1.2-native-key-guard",
            "targetShooter": {
              "audioText": "Good afternoon",
              "mode": "audio-to-image",
              "shape": "balloon",
              "correctIds": [
                "A"
              ],
              "difficulty": {
                "speed": 0.26,
                "objectCount": 3,
                "spawnIntervalMs": 950,
                "requiredCorrect": 1,
                "targetSize": 190,
                "timeLimitMs": 0,
                "timerMode": "none"
              },
              "items": [
                {
                  "id": "A",
                  "alt": "Good afternoon",
                  "imageAsset": "good afternoon",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Afternoon.png",
                  "image": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Afternoon.png",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "good afternoon",
                    "strategy": "exact",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/Good Afternoon.png",
                    "file": "Good Afternoon.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Afternoon.png"
                  }
                },
                {
                  "id": "B",
                  "alt": "Good morning",
                  "imageAsset": "good morning",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Morning.png",
                  "image": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Morning.png",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "good morning",
                    "strategy": "exact",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/Good Morning.png",
                    "file": "Good Morning.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Morning.png"
                  }
                },
                {
                  "id": "C",
                  "alt": "Goodbye",
                  "imageAsset": "goodbye",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Bye.png",
                  "image": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Bye.png",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "goodbye",
                    "strategy": "alias",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/Bye.png",
                    "file": "Bye.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Bye.png"
                  }
                }
              ]
            }
          }
        },
        {
          "id": "EN1-M1-04",
          "subject": "english",
          "year": 1,
          "module": 1,
          "skill": {
            "code": null,
            "description": "Compreender uma expressão de despedida em contexto."
          },
          "difficulty": "easy",
          "statement": "Ouça “Goodbye”. Em qual situação essa palavra combina?",
          "instruction": "Ouça e toque na imagem correta.",
          "contentLanguage": "en",
          "instructionLanguage": "pt-BR",
          "feedbackLanguage": "pt-BR",
          "audio": {
            "enabled": true,
            "text": "Goodbye",
            "language": "en-US",
            "role": "instruction"
          },
          "alternatives": [
            {
              "id": "A",
              "text": "ao chegar"
            },
            {
              "id": "B",
              "text": "ao se despedir"
            },
            {
              "id": "C",
              "text": "ao dizer a idade"
            }
          ],
          "answer": {
            "type": "single",
            "value": "B"
          },
          "feedback": {
            "correct": "Muito bem!",
            "incorrect": "Ouça novamente, observe as pistas e tente outra vez.",
            "language": "pt-BR"
          },
          "delivery": {
            "mechanic": "target-shooter",
            "preferred": [
              "target-shooter"
            ],
            "blocked": [
              "smart-sentence"
            ],
            "allowImage": true,
            "allowAudio": true
          },
          "metadata": {
            "screenTitle": "Ouça e escolha",
            "sourceStatus": "Ajustar\nFácil",
            "sourceSkill": "Escuta + compreensão multimodal",
            "sourceStatement": "Ouça “Goodbye”. Em qual situação essa palavra combina?",
            "sourceAlternatives": [
              {
                "id": "A",
                "text": "ao chegar"
              },
              {
                "id": "B",
                "text": "ao se despedir"
              },
              {
                "id": "C",
                "text": "ao dizer a idade"
              }
            ],
            "sourceAnswer": {
              "id": "B",
              "text": "ao se despedir",
              "raw": "B) ao se despedir"
            },
            "sourceMedia": "Áudio EN obrigatório: “Goodbye”; três cenas simples como alternativas.\nFormato sugerido: Áudio/texto → imagem.",
            "literacyDemand": "R0",
            "readingEssential": false,
            "yearProfile": "Y1_EARLY_LITERACY",
            "instructionAudioFallback": {
              "enabled": true,
              "language": "pt-BR",
              "text": "Ouça e toque na imagem correta.",
              "mode": "speech-synthesis-or-recorded"
            },
            "modalityAdaptation": "R0/R1-supported interaction preserving the source linguistic construct",
            "factoryCleanBuild": true,
            "integrationB": "v1.2-native-key-guard",
            "targetShooter": {
              "audioText": "Goodbye",
              "mode": "audio-to-image",
              "shape": "balloon",
              "correctIds": [
                "B"
              ],
              "difficulty": {
                "speed": 0.26,
                "objectCount": 3,
                "spawnIntervalMs": 950,
                "requiredCorrect": 1,
                "targetSize": 190,
                "timeLimitMs": 0,
                "timerMode": "none"
              },
              "items": [
                {
                  "id": "A",
                  "alt": "ao chegar",
                  "image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iMzYwIiB2aWV3Qm94PSIwIDAgNTEyIDM2MCI+CjxyZWN0IHg9IjgiIHk9IjgiIHdpZHRoPSI0OTYiIGhlaWdodD0iMzQ0IiByeD0iNDQiIGZpbGw9IiNFQUY3RkYiIHN0cm9rZT0iIzI3NDk2ZCIgc3Ryb2tlLXdpZHRoPSI4Ii8+Cjx0ZXh0IHg9IjI1NiIgeT0iMjA1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjExNiIgZm9udC1mYW1pbHk9IlNlZ29lIFVJIEVtb2ppLEFwcGxlIENvbG9yIEVtb2ppLE5vdG8gQ29sb3IgRW1vamksc2Fucy1zZXJpZiI+8J+aquKshe+4j/Cfp5I8L3RleHQ+Cjwvc3ZnPg==",
                  "_assetResolution": {
                    "status": "preview",
                    "requested": "arrival",
                    "strategy": "procedural-semantic-after-catalog-miss",
                    "confidence": 0.0,
                    "assetId": null,
                    "file": null,
                    "url": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iMzYwIiB2aWV3Qm94PSIwIDAgNTEyIDM2MCI+CjxyZWN0IHg9IjgiIHk9IjgiIHdpZHRoPSI0OTYiIGhlaWdodD0iMzQ0IiByeD0iNDQiIGZpbGw9IiNFQUY3RkYiIHN0cm9rZT0iIzI3NDk2ZCIgc3Ryb2tlLXdpZHRoPSI4Ii8+Cjx0ZXh0IHg9IjI1NiIgeT0iMjA1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjExNiIgZm9udC1mYW1pbHk9IlNlZ29lIFVJIEVtb2ppLEFwcGxlIENvbG9yIEVtb2ppLE5vdG8gQ29sb3IgRW1vamksc2Fucy1zZXJpZiI+8J+aquKshe+4j/Cfp5I8L3RleHQ+Cjwvc3ZnPg=="
                  }
                },
                {
                  "id": "B",
                  "alt": "ao se despedir",
                  "imageAsset": "goodbye",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Bye.png",
                  "image": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Bye.png",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "goodbye",
                    "strategy": "semantic-family+alias",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/Bye.png",
                    "file": "Bye.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Bye.png"
                  }
                },
                {
                  "id": "C",
                  "alt": "ao dizer a idade",
                  "image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iMzYwIiB2aWV3Qm94PSIwIDAgNTEyIDM2MCI+CjxyZWN0IHg9IjgiIHk9IjgiIHdpZHRoPSI0OTYiIGhlaWdodD0iMzQ0IiByeD0iNDQiIGZpbGw9IiNGRkY4RTciIHN0cm9rZT0iIzI3NDk2ZCIgc3Ryb2tlLXdpZHRoPSI4Ii8+Cjx0ZXh0IHg9IjI1NiIgeT0iMjA1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjExNiIgZm9udC1mYW1pbHk9IlNlZ29lIFVJIEVtb2ppLEFwcGxlIENvbG9yIEVtb2ppLE5vdG8gQ29sb3IgRW1vamksc2Fucy1zZXJpZiI+8J+OgvCflKI8L3RleHQ+Cjwvc3ZnPg==",
                  "_assetResolution": {
                    "status": "preview",
                    "requested": "age",
                    "strategy": "procedural-semantic-after-catalog-miss",
                    "confidence": 0.0,
                    "assetId": null,
                    "file": null,
                    "url": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iMzYwIiB2aWV3Qm94PSIwIDAgNTEyIDM2MCI+CjxyZWN0IHg9IjgiIHk9IjgiIHdpZHRoPSI0OTYiIGhlaWdodD0iMzQ0IiByeD0iNDQiIGZpbGw9IiNGRkY4RTciIHN0cm9rZT0iIzI3NDk2ZCIgc3Ryb2tlLXdpZHRoPSI4Ii8+Cjx0ZXh0IHg9IjI1NiIgeT0iMjA1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjExNiIgZm9udC1mYW1pbHk9IlNlZ29lIFVJIEVtb2ppLEFwcGxlIENvbG9yIEVtb2ppLE5vdG8gQ29sb3IgRW1vamksc2Fucy1zZXJpZiI+8J+OgvCflKI8L3RleHQ+Cjwvc3ZnPg=="
                  }
                }
              ]
            }
          }
        }
      ]
    },
    {
      "id": "Y1-M01-A02",
      "title": "Ouça e relacione",
      "mechanic": "matching",
      "skill": {
        "description": "Escuta / Compreensão multimodal"
      },
      "questions": [
        {
          "id": "EN1-M1-05",
          "subject": "english",
          "year": 1,
          "module": 1,
          "skill": {
            "code": null,
            "description": "Reconhecer uma apresentação pessoal muito simples com “I’m + name”."
          },
          "difficulty": "easy",
          "statement": "Ouça: “I’m Leo.” Qual fala apresenta o nome do personagem?",
          "instruction": "Ouça e relacione os pares.",
          "contentLanguage": "en",
          "instructionLanguage": "pt-BR",
          "feedbackLanguage": "pt-BR",
          "audio": {
            "enabled": true,
            "text": "I’m Leo.",
            "language": "en-US",
            "role": "instruction"
          },
          "alternatives": [
            {
              "id": "A",
              "text": "Goodbye!"
            },
            {
              "id": "B",
              "text": "Good afternoon!"
            },
            {
              "id": "C",
              "text": "I’m Leo."
            }
          ],
          "answer": {
            "type": "single",
            "value": "C"
          },
          "feedback": {
            "correct": "Muito bem!",
            "incorrect": "Ouça novamente, observe as pistas e tente outra vez.",
            "language": "pt-BR"
          },
          "delivery": {
            "mechanic": "matching",
            "preferred": [
              "matching"
            ],
            "blocked": [
              "smart-sentence"
            ],
            "allowImage": true,
            "allowAudio": true
          },
          "metadata": {
            "screenTitle": "Ouça e relacione",
            "sourceStatus": "Ajustar\nFácil",
            "sourceSkill": "Escuta",
            "sourceStatement": "Ouça: “I’m Leo.” Qual fala apresenta o nome do personagem?",
            "sourceAlternatives": [
              {
                "id": "A",
                "text": "Goodbye!"
              },
              {
                "id": "B",
                "text": "Good afternoon!"
              },
              {
                "id": "C",
                "text": "I’m Leo."
              }
            ],
            "sourceAnswer": {
              "id": "C",
              "text": "I’m Leo.",
              "raw": "C) I’m Leo."
            },
            "sourceMedia": "Áudio EN obrigatório: “I’m Leo.” Personagem fictício.\nFormato sugerido: Escuta + escolha.",
            "literacyDemand": "R0",
            "readingEssential": false,
            "yearProfile": "Y1_EARLY_LITERACY",
            "instructionAudioFallback": {
              "enabled": true,
              "language": "pt-BR",
              "text": "Ouça e relacione os pares.",
              "mode": "speech-synthesis-or-recorded"
            },
            "modalityAdaptation": "R0/R1-supported interaction preserving the source linguistic construct",
            "factoryCleanBuild": true,
            "integrationB": "v1.2-native-key-guard",
            "matching": {
              "mode": "audio-image",
              "leftTitle": "Ouça",
              "rightTitle": "Imagens",
              "leftItems": [
                {
                  "id": "audio-c",
                  "spokenText": "I'm Leo",
                  "speechLocale": "en-US",
                  "audioDescription": "Pronúncia de I'm Leo"
                },
                {
                  "id": "audio-a",
                  "spokenText": "Goodbye",
                  "speechLocale": "en-US",
                  "audioDescription": "Pronúncia de Goodbye"
                }
              ],
              "rightItems": [
                {
                  "id": "image-c",
                  "imageAssetKey": "smart-en1-m1-05-c",
                  "alt": "I’m Leo.",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/My%20name.png",
                  "imageAsset": "my name",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "my name",
                    "strategy": "semantic-family+exact",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/My name.png",
                    "file": "My name.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/My%20name.png"
                  }
                },
                {
                  "id": "image-a",
                  "imageAssetKey": "smart-en1-m1-05-a",
                  "alt": "Goodbye!",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Bye.png",
                  "imageAsset": "goodbye",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "goodbye",
                    "strategy": "alias",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/Bye.png",
                    "file": "Bye.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Bye.png"
                  }
                }
              ],
              "pairs": [
                {
                  "leftId": "audio-c",
                  "rightId": "image-c"
                },
                {
                  "leftId": "audio-a",
                  "rightId": "image-a"
                }
              ],
              "assets": {
                "smart-en1-m1-05-c": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/My%20name.png",
                "smart-en1-m1-05-a": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Bye.png"
              },
              "behavior": {
                "interactionMode": "touch",
                "connectionMode": "1x1",
                "shuffleLeft": false,
                "shuffleRight": true,
                "lockCorrectPairsOnRetry": true
              }
            },
            "matchingSourcePairPolicy": "correct source option + one source-derived distractor; both associations use source vocabulary"
          }
        },
        {
          "id": "EN1-M1-06",
          "subject": "english",
          "year": 1,
          "module": 1,
          "skill": {
            "code": null,
            "description": "Reconhecer o vocabulário boy/girl com apoio visual."
          },
          "difficulty": "easy",
          "statement": "Observe o personagem indicado como “boy”. Qual palavra você deve escolher?",
          "instruction": "Ouça e relacione os pares.",
          "contentLanguage": "en",
          "instructionLanguage": "pt-BR",
          "feedbackLanguage": "pt-BR",
          "audio": {
            "enabled": true,
            "text": "boy",
            "language": "en-US",
            "role": "instruction"
          },
          "alternatives": [
            {
              "id": "A",
              "text": "boy"
            },
            {
              "id": "B",
              "text": "girl"
            },
            {
              "id": "C",
              "text": "hello"
            }
          ],
          "answer": {
            "type": "single",
            "value": "A"
          },
          "feedback": {
            "correct": "Muito bem!",
            "incorrect": "Ouça novamente, observe as pistas e tente outra vez.",
            "language": "pt-BR"
          },
          "delivery": {
            "mechanic": "matching",
            "preferred": [
              "matching"
            ],
            "blocked": [
              "smart-sentence"
            ],
            "allowImage": true,
            "allowAudio": true
          },
          "metadata": {
            "screenTitle": "Ouça e relacione",
            "sourceStatus": "Ajustar\nFácil",
            "sourceSkill": "Compreensão multimodal",
            "sourceStatement": "Observe o personagem indicado como “boy”. Qual palavra você deve escolher?",
            "sourceAlternatives": [
              {
                "id": "A",
                "text": "boy"
              },
              {
                "id": "B",
                "text": "girl"
              },
              {
                "id": "C",
                "text": "hello"
              }
            ],
            "sourceAnswer": {
              "id": "A",
              "text": "boy",
              "raw": "A) boy"
            },
            "sourceMedia": "Imagem obrigatória: personagem fictício identificado visualmente de modo não estereotipado; não usar roupa/cor como única pista.\nFormato sugerido: Imagem → palavra/frase.",
            "literacyDemand": "R0",
            "readingEssential": false,
            "yearProfile": "Y1_EARLY_LITERACY",
            "instructionAudioFallback": {
              "enabled": true,
              "language": "pt-BR",
              "text": "Ouça e relacione os pares.",
              "mode": "speech-synthesis-or-recorded"
            },
            "modalityAdaptation": "R0/R1-supported interaction preserving the source linguistic construct",
            "factoryCleanBuild": true,
            "integrationB": "v1.2-native-key-guard",
            "matching": {
              "mode": "audio-image",
              "leftTitle": "Ouça",
              "rightTitle": "Imagens",
              "leftItems": [
                {
                  "id": "audio-a",
                  "spokenText": "boy",
                  "speechLocale": "en-US",
                  "audioDescription": "Pronúncia de boy"
                },
                {
                  "id": "audio-b",
                  "spokenText": "girl",
                  "speechLocale": "en-US",
                  "audioDescription": "Pronúncia de girl"
                }
              ],
              "rightItems": [
                {
                  "id": "image-a",
                  "imageAssetKey": "smart-en1-m1-06-a",
                  "alt": "boy",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Boy.png",
                  "imageAsset": "boy",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "boy",
                    "strategy": "exact",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/Boy.png",
                    "file": "Boy.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Boy.png"
                  }
                },
                {
                  "id": "image-b",
                  "imageAssetKey": "smart-en1-m1-06-b",
                  "alt": "girl",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Girl.png",
                  "imageAsset": "girl",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "girl",
                    "strategy": "exact",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/Girl.png",
                    "file": "Girl.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Girl.png"
                  }
                }
              ],
              "pairs": [
                {
                  "leftId": "audio-a",
                  "rightId": "image-a"
                },
                {
                  "leftId": "audio-b",
                  "rightId": "image-b"
                }
              ],
              "assets": {
                "smart-en1-m1-06-a": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Boy.png",
                "smart-en1-m1-06-b": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Girl.png"
              },
              "behavior": {
                "interactionMode": "touch",
                "connectionMode": "1x1",
                "shuffleLeft": false,
                "shuffleRight": true,
                "lockCorrectPairsOnRetry": true
              }
            },
            "matchingSourcePairPolicy": "correct source option + one source-derived distractor; both associations use source vocabulary"
          }
        },
        {
          "id": "EN1-M1-07",
          "subject": "english",
          "year": 1,
          "module": 1,
          "skill": {
            "code": null,
            "description": "Reconhecer o vocabulário boy/girl com apoio visual."
          },
          "difficulty": "easy",
          "statement": "Observe a personagem indicada como “girl”. Qual palavra você deve escolher?",
          "instruction": "Ouça e relacione os pares.",
          "contentLanguage": "en",
          "instructionLanguage": "pt-BR",
          "feedbackLanguage": "pt-BR",
          "audio": {
            "enabled": true,
            "text": "girl",
            "language": "en-US",
            "role": "instruction"
          },
          "alternatives": [
            {
              "id": "A",
              "text": "boy"
            },
            {
              "id": "B",
              "text": "girl"
            },
            {
              "id": "C",
              "text": "goodbye"
            }
          ],
          "answer": {
            "type": "single",
            "value": "B"
          },
          "feedback": {
            "correct": "Muito bem!",
            "incorrect": "Ouça novamente, observe as pistas e tente outra vez.",
            "language": "pt-BR"
          },
          "delivery": {
            "mechanic": "matching",
            "preferred": [
              "matching"
            ],
            "blocked": [
              "smart-sentence"
            ],
            "allowImage": true,
            "allowAudio": true
          },
          "metadata": {
            "screenTitle": "Ouça e relacione",
            "sourceStatus": "Ajustar\nFácil",
            "sourceSkill": "Compreensão multimodal",
            "sourceStatement": "Observe a personagem indicada como “girl”. Qual palavra você deve escolher?",
            "sourceAlternatives": [
              {
                "id": "A",
                "text": "boy"
              },
              {
                "id": "B",
                "text": "girl"
              },
              {
                "id": "C",
                "text": "goodbye"
              }
            ],
            "sourceAnswer": {
              "id": "B",
              "text": "girl",
              "raw": "B) girl"
            },
            "sourceMedia": "Imagem obrigatória: personagem fictício identificado visualmente de modo não estereotipado; não usar roupa/cor como única pista.\nFormato sugerido: Imagem → palavra/frase.",
            "literacyDemand": "R0",
            "readingEssential": false,
            "yearProfile": "Y1_EARLY_LITERACY",
            "instructionAudioFallback": {
              "enabled": true,
              "language": "pt-BR",
              "text": "Ouça e relacione os pares.",
              "mode": "speech-synthesis-or-recorded"
            },
            "modalityAdaptation": "R0/R1-supported interaction preserving the source linguistic construct",
            "factoryCleanBuild": true,
            "integrationB": "v1.2-native-key-guard",
            "matching": {
              "mode": "audio-image",
              "leftTitle": "Ouça",
              "rightTitle": "Imagens",
              "leftItems": [
                {
                  "id": "audio-b",
                  "spokenText": "girl",
                  "speechLocale": "en-US",
                  "audioDescription": "Pronúncia de girl"
                },
                {
                  "id": "audio-a",
                  "spokenText": "boy",
                  "speechLocale": "en-US",
                  "audioDescription": "Pronúncia de boy"
                }
              ],
              "rightItems": [
                {
                  "id": "image-b",
                  "imageAssetKey": "smart-en1-m1-07-b",
                  "alt": "girl",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Girl.png",
                  "imageAsset": "girl",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "girl",
                    "strategy": "exact",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/Girl.png",
                    "file": "Girl.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Girl.png"
                  }
                },
                {
                  "id": "image-a",
                  "imageAssetKey": "smart-en1-m1-07-a",
                  "alt": "boy",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Boy.png",
                  "imageAsset": "boy",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "boy",
                    "strategy": "exact",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/Boy.png",
                    "file": "Boy.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Boy.png"
                  }
                }
              ],
              "pairs": [
                {
                  "leftId": "audio-b",
                  "rightId": "image-b"
                },
                {
                  "leftId": "audio-a",
                  "rightId": "image-a"
                }
              ],
              "assets": {
                "smart-en1-m1-07-b": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Girl.png",
                "smart-en1-m1-07-a": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Boy.png"
              },
              "behavior": {
                "interactionMode": "touch",
                "connectionMode": "1x1",
                "shuffleLeft": false,
                "shuffleRight": true,
                "lockCorrectPairsOnRetry": true
              }
            },
            "matchingSourcePairPolicy": "correct source option + one source-derived distractor; both associations use source vocabulary"
          }
        }
      ]
    },
    {
      "id": "Y1-M01-A03",
      "title": "Ouça e encontre",
      "mechanic": "bubble-pop",
      "skill": {
        "description": "Escuta / compreensão pragmática / Escuta"
      },
      "questions": [
        {
          "id": "EN1-M1-08",
          "subject": "english",
          "year": 1,
          "module": 1,
          "skill": {
            "code": null,
            "description": "Selecionar uma resposta adequada a um cumprimento simples."
          },
          "difficulty": "medium",
          "statement": "Ouça: “Hello!” Qual resposta também é um cumprimento?",
          "instruction": "Ouça e estoure a opção correta.",
          "contentLanguage": "en",
          "instructionLanguage": "pt-BR",
          "feedbackLanguage": "pt-BR",
          "audio": {
            "enabled": true,
            "text": "Hello!",
            "language": "en-US",
            "role": "instruction"
          },
          "alternatives": [
            {
              "id": "A",
              "text": "Goodbye!"
            },
            {
              "id": "B",
              "text": "Good night!"
            },
            {
              "id": "C",
              "text": "Hi!"
            }
          ],
          "answer": {
            "type": "single",
            "value": "C"
          },
          "feedback": {
            "correct": "Muito bem!",
            "incorrect": "Ouça novamente, observe as pistas e tente outra vez.",
            "language": "pt-BR"
          },
          "delivery": {
            "mechanic": "bubble-pop",
            "preferred": [
              "bubble-pop"
            ],
            "blocked": [
              "smart-sentence"
            ],
            "allowImage": true,
            "allowAudio": true
          },
          "metadata": {
            "screenTitle": "Ouça e encontre",
            "sourceStatus": "Ajustar\nMédia",
            "sourceSkill": "Escuta / compreensão pragmática",
            "sourceStatement": "Ouça: “Hello!” Qual resposta também é um cumprimento?",
            "sourceAlternatives": [
              {
                "id": "A",
                "text": "Goodbye!"
              },
              {
                "id": "B",
                "text": "Good night!"
              },
              {
                "id": "C",
                "text": "Hi!"
              }
            ],
            "sourceAnswer": {
              "id": "C",
              "text": "Hi!",
              "raw": "C) Hi!"
            },
            "sourceMedia": "Áudio EN obrigatório: “Hello!”.\nFormato sugerido: Escuta + escolha.",
            "literacyDemand": "R0",
            "readingEssential": false,
            "yearProfile": "Y1_EARLY_LITERACY",
            "instructionAudioFallback": {
              "enabled": true,
              "language": "pt-BR",
              "text": "Ouça e estoure a opção correta.",
              "mode": "speech-synthesis-or-recorded"
            },
            "modalityAdaptation": "R0/R1-supported interaction preserving the source linguistic construct",
            "factoryCleanBuild": true,
            "integrationB": "v1.2-native-key-guard",
            "bubbleCalibration": {
              "yearProfile": "Y1_VERY_SLOW",
              "simultaneousTargets": "2-3",
              "readingRequired": false,
              "nativeKeyGuard": "semantic imageAsset is not emitted because the R124 v1.2 compatibility map does not approve these concept keys"
            }
          },
          "bubbles": [
            {
              "id": "A",
              "label": "🚶👋",
              "alt": "Goodbye!",
              "tone": "blue",
              "speechText": "Goodbye",
              "speechLanguage": "en-US"
            },
            {
              "id": "B",
              "label": "🌙👋",
              "alt": "Good night!",
              "tone": "pink",
              "speechText": "Good night!",
              "speechLanguage": "en-US"
            },
            {
              "id": "C",
              "label": "👋✨",
              "alt": "Hi!",
              "tone": "green",
              "speechText": "Hi!",
              "speechLanguage": "en-US"
            }
          ],
          "targetIds": [
            "C"
          ],
          "behavior": {
            "movement": "very-slow",
            "speedMultiplier": 0.45,
            "maxSimultaneous": 3,
            "simultaneousBubbles": 3,
            "eventDensity": "low",
            "roundLength": "short",
            "highVisualPersistence": true,
            "timerMode": "none",
            "timeLimitMs": 0,
            "timerPunitive": false,
            "oneDecisionPerCycle": true
          }
        },
        {
          "id": "EN1-M1-09",
          "subject": "english",
          "year": 1,
          "module": 1,
          "skill": {
            "code": null,
            "description": "Identificar apresentação pessoal simples."
          },
          "difficulty": "medium",
          "statement": "Ouça: “I’m Ana.” O que a pessoa está fazendo?",
          "instruction": "Ouça e estoure a opção correta.",
          "contentLanguage": "en",
          "instructionLanguage": "pt-BR",
          "feedbackLanguage": "pt-BR",
          "audio": {
            "enabled": true,
            "text": "I’m Ana.",
            "language": "en-US",
            "role": "instruction"
          },
          "alternatives": [
            {
              "id": "A",
              "text": "Dizendo o próprio nome"
            },
            {
              "id": "B",
              "text": "Despedindo-se"
            },
            {
              "id": "C",
              "text": "Dizendo boa tarde"
            }
          ],
          "answer": {
            "type": "single",
            "value": "A"
          },
          "feedback": {
            "correct": "Muito bem!",
            "incorrect": "Ouça novamente, observe as pistas e tente outra vez.",
            "language": "pt-BR"
          },
          "delivery": {
            "mechanic": "bubble-pop",
            "preferred": [
              "bubble-pop"
            ],
            "blocked": [
              "smart-sentence"
            ],
            "allowImage": true,
            "allowAudio": true
          },
          "metadata": {
            "screenTitle": "Ouça e encontre",
            "sourceStatus": "Manter\nMédia",
            "sourceSkill": "Escuta",
            "sourceStatement": "Ouça: “I’m Ana.” O que a pessoa está fazendo?",
            "sourceAlternatives": [
              {
                "id": "A",
                "text": "Dizendo o próprio nome"
              },
              {
                "id": "B",
                "text": "Despedindo-se"
              },
              {
                "id": "C",
                "text": "Dizendo boa tarde"
              }
            ],
            "sourceAnswer": {
              "id": "A",
              "text": "Dizendo o próprio nome",
              "raw": "A) Dizendo o próprio nome"
            },
            "sourceMedia": "Áudio EN obrigatório: “I’m Ana.”\nFormato sugerido: Escuta + escolha.",
            "literacyDemand": "R0",
            "readingEssential": false,
            "yearProfile": "Y1_EARLY_LITERACY",
            "instructionAudioFallback": {
              "enabled": true,
              "language": "pt-BR",
              "text": "Ouça e estoure a opção correta.",
              "mode": "speech-synthesis-or-recorded"
            },
            "modalityAdaptation": "R0/R1-supported interaction preserving the source linguistic construct",
            "factoryCleanBuild": true,
            "integrationB": "v1.2-native-key-guard",
            "bubbleCalibration": {
              "yearProfile": "Y1_VERY_SLOW",
              "simultaneousTargets": "2-3",
              "readingRequired": false,
              "nativeKeyGuard": "semantic imageAsset is not emitted because the R124 v1.2 compatibility map does not approve these concept keys"
            }
          },
          "bubbles": [
            {
              "id": "A",
              "label": "🧒💬",
              "alt": "Dizendo o próprio nome",
              "tone": "blue",
              "speechText": "I'm Leo",
              "speechLanguage": "en-US"
            },
            {
              "id": "B",
              "label": "🚶👋",
              "alt": "Despedindo-se",
              "tone": "pink",
              "speechText": "Goodbye",
              "speechLanguage": "en-US"
            },
            {
              "id": "C",
              "label": "☀️👋",
              "alt": "Dizendo boa tarde",
              "tone": "green",
              "speechText": "Dizendo boa tarde",
              "speechLanguage": "en-US"
            }
          ],
          "targetIds": [
            "A"
          ],
          "behavior": {
            "movement": "very-slow",
            "speedMultiplier": 0.45,
            "maxSimultaneous": 3,
            "simultaneousBubbles": 3,
            "eventDensity": "low",
            "roundLength": "short",
            "highVisualPersistence": true,
            "timerMode": "none",
            "timeLimitMs": 0,
            "timerPunitive": false,
            "oneDecisionPerCycle": true
          }
        },
        {
          "id": "EN1-M1-10",
          "subject": "english",
          "year": 1,
          "module": 1,
          "skill": {
            "code": null,
            "description": "Reconhecer uma despedida curta e frequente em contexto escolar."
          },
          "difficulty": "medium",
          "statement": "A aula terminou. Ouça: “Bye!”. Qual cartão mostra a expressão ouvida?",
          "instruction": "Ouça e estoure a opção correta.",
          "contentLanguage": "en",
          "instructionLanguage": "pt-BR",
          "feedbackLanguage": "pt-BR",
          "audio": {
            "enabled": true,
            "text": "Bye!",
            "language": "en-US",
            "role": "instruction"
          },
          "alternatives": [
            {
              "id": "A",
              "text": "Hello!"
            },
            {
              "id": "B",
              "text": "Bye!"
            },
            {
              "id": "C",
              "text": "Good morning!"
            }
          ],
          "answer": {
            "type": "single",
            "value": "B"
          },
          "feedback": {
            "correct": "Muito bem!",
            "incorrect": "Ouça novamente, observe as pistas e tente outra vez.",
            "language": "pt-BR"
          },
          "delivery": {
            "mechanic": "bubble-pop",
            "preferred": [
              "bubble-pop"
            ],
            "blocked": [
              "smart-sentence"
            ],
            "allowImage": true,
            "allowAudio": true
          },
          "metadata": {
            "screenTitle": "Ouça e encontre",
            "sourceStatus": "Reescrever\nMédia",
            "sourceSkill": "Escuta / compreensão pragmática",
            "sourceStatement": "A aula terminou. Ouça: “Bye!”. Qual cartão mostra a expressão ouvida?",
            "sourceAlternatives": [
              {
                "id": "A",
                "text": "Hello!"
              },
              {
                "id": "B",
                "text": "Bye!"
              },
              {
                "id": "C",
                "text": "Good morning!"
              }
            ],
            "sourceAnswer": {
              "id": "B",
              "text": "Bye!",
              "raw": "B) Bye!"
            },
            "sourceMedia": "Áudio EN obrigatório: “Bye!”. Cena simples de fim da aula. | Formato sugerido: Escuta + escolha.",
            "literacyDemand": "R0",
            "readingEssential": false,
            "yearProfile": "Y1_EARLY_LITERACY",
            "instructionAudioFallback": {
              "enabled": true,
              "language": "pt-BR",
              "text": "Ouça e estoure a opção correta.",
              "mode": "speech-synthesis-or-recorded"
            },
            "modalityAdaptation": "R0/R1-supported interaction preserving the source linguistic construct",
            "factoryCleanBuild": true,
            "integrationB": "v1.2-native-key-guard",
            "bubbleCalibration": {
              "yearProfile": "Y1_VERY_SLOW",
              "simultaneousTargets": "2-3",
              "readingRequired": false,
              "nativeKeyGuard": "semantic imageAsset is not emitted because the R124 v1.2 compatibility map does not approve these concept keys"
            }
          },
          "bubbles": [
            {
              "id": "A",
              "label": "👋✨",
              "alt": "Hello!",
              "tone": "blue",
              "speechText": "Hello!",
              "speechLanguage": "en-US"
            },
            {
              "id": "B",
              "label": "🚶👋",
              "alt": "Bye!",
              "tone": "pink",
              "speechText": "Bye!",
              "speechLanguage": "en-US"
            },
            {
              "id": "C",
              "label": "🌅👋",
              "alt": "Good morning!",
              "tone": "green",
              "speechText": "Good morning!",
              "speechLanguage": "en-US"
            }
          ],
          "targetIds": [
            "B"
          ],
          "behavior": {
            "movement": "very-slow",
            "speedMultiplier": 0.45,
            "maxSimultaneous": 3,
            "simultaneousBubbles": 3,
            "eventDensity": "low",
            "roundLength": "short",
            "highVisualPersistence": true,
            "timerMode": "none",
            "timeLimitMs": 0,
            "timerPunitive": false,
            "oneDecisionPerCycle": true
          }
        }
      ]
    },
    {
      "id": "Y1-M01-A04",
      "title": "Ouça e escolha",
      "mechanic": "target-shooter",
      "skill": {
        "description": "Escuta / compreensão pragmática / Escuta + interação guiada"
      },
      "questions": [
        {
          "id": "EN1-M1-11",
          "subject": "english",
          "year": 1,
          "module": 1,
          "skill": {
            "code": null,
            "description": "Reconhecer uma despedida frequente e amigável em contexto."
          },
          "difficulty": "medium",
          "statement": "Leo está indo embora. Ouça: “See you!”. Qual expressão você ouviu?",
          "instruction": "Ouça e toque na imagem correta.",
          "contentLanguage": "en",
          "instructionLanguage": "pt-BR",
          "feedbackLanguage": "pt-BR",
          "audio": {
            "enabled": true,
            "text": "See you!",
            "language": "en-US",
            "role": "instruction"
          },
          "alternatives": [
            {
              "id": "A",
              "text": "See you!"
            },
            {
              "id": "B",
              "text": "Good afternoon!"
            },
            {
              "id": "C",
              "text": "Hi!"
            }
          ],
          "answer": {
            "type": "single",
            "value": "A"
          },
          "feedback": {
            "correct": "Muito bem!",
            "incorrect": "Ouça novamente, observe as pistas e tente outra vez.",
            "language": "pt-BR"
          },
          "delivery": {
            "mechanic": "target-shooter",
            "preferred": [
              "target-shooter"
            ],
            "blocked": [
              "smart-sentence"
            ],
            "allowImage": true,
            "allowAudio": true
          },
          "metadata": {
            "screenTitle": "Ouça e escolha",
            "sourceStatus": "Reescrever\nMédia",
            "sourceSkill": "Escuta / compreensão pragmática",
            "sourceStatement": "Leo está indo embora. Ouça: “See you!”. Qual expressão você ouviu?",
            "sourceAlternatives": [
              {
                "id": "A",
                "text": "See you!"
              },
              {
                "id": "B",
                "text": "Good afternoon!"
              },
              {
                "id": "C",
                "text": "Hi!"
              }
            ],
            "sourceAnswer": {
              "id": "A",
              "text": "See you!",
              "raw": "A) See you!"
            },
            "sourceMedia": "Áudio EN obrigatório: “See you!”. Cena de despedida. | Formato sugerido: Escuta + escolha.",
            "literacyDemand": "R0",
            "readingEssential": false,
            "yearProfile": "Y1_EARLY_LITERACY",
            "instructionAudioFallback": {
              "enabled": true,
              "language": "pt-BR",
              "text": "Ouça e toque na imagem correta.",
              "mode": "speech-synthesis-or-recorded"
            },
            "modalityAdaptation": "R0/R1-supported interaction preserving the source linguistic construct",
            "factoryCleanBuild": true,
            "integrationB": "v1.2-native-key-guard",
            "targetShooter": {
              "audioText": "See you!",
              "mode": "audio-to-image",
              "shape": "balloon",
              "correctIds": [
                "A"
              ],
              "difficulty": {
                "speed": 0.26,
                "objectCount": 3,
                "spawnIntervalMs": 950,
                "requiredCorrect": 1,
                "targetSize": 190,
                "timeLimitMs": 0,
                "timerMode": "none"
              },
              "items": [
                {
                  "id": "A",
                  "alt": "See you!",
                  "image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iMzYwIiB2aWV3Qm94PSIwIDAgNTEyIDM2MCI+CjxyZWN0IHg9IjgiIHk9IjgiIHdpZHRoPSI0OTYiIGhlaWdodD0iMzQ0IiByeD0iNDQiIGZpbGw9IiNFQUY3RkYiIHN0cm9rZT0iIzI3NDk2ZCIgc3Ryb2tlLXdpZHRoPSI4Ii8+Cjx0ZXh0IHg9IjI1NiIgeT0iMjA1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjExNiIgZm9udC1mYW1pbHk9IlNlZ29lIFVJIEVtb2ppLEFwcGxlIENvbG9yIEVtb2ppLE5vdG8gQ29sb3IgRW1vamksc2Fucy1zZXJpZiI+8J+Ri+Keoe+4jzwvdGV4dD4KPC9zdmc+",
                  "_assetResolution": {
                    "status": "preview",
                    "requested": "see you",
                    "strategy": "procedural-semantic-after-catalog-miss",
                    "confidence": 0.0,
                    "assetId": null,
                    "file": null,
                    "url": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iMzYwIiB2aWV3Qm94PSIwIDAgNTEyIDM2MCI+CjxyZWN0IHg9IjgiIHk9IjgiIHdpZHRoPSI0OTYiIGhlaWdodD0iMzQ0IiByeD0iNDQiIGZpbGw9IiNFQUY3RkYiIHN0cm9rZT0iIzI3NDk2ZCIgc3Ryb2tlLXdpZHRoPSI4Ii8+Cjx0ZXh0IHg9IjI1NiIgeT0iMjA1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjExNiIgZm9udC1mYW1pbHk9IlNlZ29lIFVJIEVtb2ppLEFwcGxlIENvbG9yIEVtb2ppLE5vdG8gQ29sb3IgRW1vamksc2Fucy1zZXJpZiI+8J+Ri+Keoe+4jzwvdGV4dD4KPC9zdmc+"
                  }
                },
                {
                  "id": "B",
                  "alt": "Good afternoon!",
                  "imageAsset": "good afternoon",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Afternoon.png",
                  "image": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Afternoon.png",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "good afternoon",
                    "strategy": "exact",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/Good Afternoon.png",
                    "file": "Good Afternoon.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Afternoon.png"
                  }
                },
                {
                  "id": "C",
                  "alt": "Hi!",
                  "imageAsset": "hello",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Hello.png",
                  "image": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Hello.png",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "hello",
                    "strategy": "semantic-family+exact",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/Hello.png",
                    "file": "Hello.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Hello.png"
                  }
                }
              ]
            }
          }
        },
        {
          "id": "EN1-M1-12",
          "subject": "english",
          "year": 1,
          "module": 1,
          "skill": {
            "code": null,
            "description": "Selecionar uma resposta simples que mantém uma interação de cumprimento."
          },
          "difficulty": "hard",
          "statement": "Mia diz: “Hello! I’m Mia.” Qual resposta também é um cumprimento e mantém a conversa?",
          "instruction": "Ouça e toque na imagem correta.",
          "contentLanguage": "en",
          "instructionLanguage": "pt-BR",
          "feedbackLanguage": "pt-BR",
          "audio": {
            "enabled": true,
            "text": "Hello! I’m Mia.",
            "language": "en-US",
            "role": "instruction"
          },
          "alternatives": [
            {
              "id": "A",
              "text": "Hi, Mia!"
            },
            {
              "id": "B",
              "text": "Bye, Mia!"
            },
            {
              "id": "C",
              "text": "See you, Mia!"
            }
          ],
          "answer": {
            "type": "single",
            "value": "A"
          },
          "feedback": {
            "correct": "Muito bem!",
            "incorrect": "Ouça novamente, observe as pistas e tente outra vez.",
            "language": "pt-BR"
          },
          "delivery": {
            "mechanic": "target-shooter",
            "preferred": [
              "target-shooter"
            ],
            "blocked": [
              "smart-sentence"
            ],
            "allowImage": true,
            "allowAudio": true
          },
          "metadata": {
            "screenTitle": "Ouça e escolha",
            "sourceStatus": "Reescrever\nDifícil",
            "sourceSkill": "Escuta + interação guiada",
            "sourceStatement": "Mia diz: “Hello! I’m Mia.” Qual resposta também é um cumprimento e mantém a conversa?",
            "sourceAlternatives": [
              {
                "id": "A",
                "text": "Hi, Mia!"
              },
              {
                "id": "B",
                "text": "Bye, Mia!"
              },
              {
                "id": "C",
                "text": "See you, Mia!"
              }
            ],
            "sourceAnswer": {
              "id": "A",
              "text": "Hi, Mia!",
              "raw": "A) Hi, Mia!"
            },
            "sourceMedia": "Áudio EN recomendado do mini diálogo; personagens fictícios. | Formato sugerido: Diálogo interativo.",
            "literacyDemand": "R0",
            "readingEssential": false,
            "yearProfile": "Y1_EARLY_LITERACY",
            "instructionAudioFallback": {
              "enabled": true,
              "language": "pt-BR",
              "text": "Ouça e toque na imagem correta.",
              "mode": "speech-synthesis-or-recorded"
            },
            "modalityAdaptation": "R0/R1-supported interaction preserving the source linguistic construct",
            "factoryCleanBuild": true,
            "integrationB": "v1.2-native-key-guard",
            "targetShooter": {
              "audioText": "Hello! I’m Mia.",
              "mode": "audio-to-image",
              "shape": "balloon",
              "correctIds": [
                "A"
              ],
              "difficulty": {
                "speed": 0.26,
                "objectCount": 3,
                "spawnIntervalMs": 950,
                "requiredCorrect": 1,
                "targetSize": 190,
                "timeLimitMs": 0,
                "timerMode": "none"
              },
              "items": [
                {
                  "id": "A",
                  "alt": "Hi, Mia!",
                  "imageAsset": "hello",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Hello.png",
                  "image": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Hello.png",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "hello",
                    "strategy": "semantic-family+exact",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/Hello.png",
                    "file": "Hello.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Hello.png"
                  }
                },
                {
                  "id": "B",
                  "alt": "Bye, Mia!",
                  "imageAsset": "bye",
                  "imageUrl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Bye.png",
                  "image": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Bye.png",
                  "_assetResolution": {
                    "status": "resolved",
                    "requested": "bye",
                    "strategy": "semantic-family+exact",
                    "confidence": 1.0,
                    "assetId": "Imagens Ilustrativa/Bye.png",
                    "file": "Bye.png",
                    "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Bye.png"
                  }
                },
                {
                  "id": "C",
                  "alt": "See you, Mia!",
                  "image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iMzYwIiB2aWV3Qm94PSIwIDAgNTEyIDM2MCI+CjxyZWN0IHg9IjgiIHk9IjgiIHdpZHRoPSI0OTYiIGhlaWdodD0iMzQ0IiByeD0iNDQiIGZpbGw9IiNGRkY4RTciIHN0cm9rZT0iIzI3NDk2ZCIgc3Ryb2tlLXdpZHRoPSI4Ii8+Cjx0ZXh0IHg9IjI1NiIgeT0iMjA1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjExNiIgZm9udC1mYW1pbHk9IlNlZ29lIFVJIEVtb2ppLEFwcGxlIENvbG9yIEVtb2ppLE5vdG8gQ29sb3IgRW1vamksc2Fucy1zZXJpZiI+8J+Ri+Keoe+4jzwvdGV4dD4KPC9zdmc+",
                  "_assetResolution": {
                    "status": "preview",
                    "requested": "see you",
                    "strategy": "procedural-semantic-after-catalog-miss",
                    "confidence": 0.0,
                    "assetId": null,
                    "file": null,
                    "url": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iMzYwIiB2aWV3Qm94PSIwIDAgNTEyIDM2MCI+CjxyZWN0IHg9IjgiIHk9IjgiIHdpZHRoPSI0OTYiIGhlaWdodD0iMzQ0IiByeD0iNDQiIGZpbGw9IiNGRkY4RTciIHN0cm9rZT0iIzI3NDk2ZCIgc3Ryb2tlLXdpZHRoPSI4Ii8+Cjx0ZXh0IHg9IjI1NiIgeT0iMjA1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjExNiIgZm9udC1mYW1pbHk9IlNlZ29lIFVJIEVtb2ppLEFwcGxlIENvbG9yIEVtb2ppLE5vdG8gQ29sb3IgRW1vamksc2Fucy1zZXJpZiI+8J+Ri+Keoe+4jzwvdGV4dD4KPC9zdmc+"
                  }
                }
              ]
            }
          }
        }
      ]
    }
  ]
};

  window.DUDUQ_CONTENT.english.year1.module01 =
    Object.freeze(moduleDefinition);
})();
