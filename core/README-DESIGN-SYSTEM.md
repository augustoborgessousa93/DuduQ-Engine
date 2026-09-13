# 🎨 DUDUQ Design System 2025 — Guia de Integração

## Visão Geral

O **DuduQ Design System** é uma camada de potencialização visual unificada criada para elevar a experiência do usuário em todo o ecossistema DuduQ, mantendo consistência entre todas as mecânicas independentes.

## 📁 Arquivo

```
/core/duduq-design-system.css
```

## 🚀 Como Integrar

### Opção 1: Importação no HTML Principal (Recomendado)

Adicione o link para o CSS no `<head>` de cada arquivo HTML das mecânicas:

```html
<head>
  <!-- ... outros metas e styles ... -->
  
  <!-- Core DuduQ -->
  <link rel="stylesheet" href="/core/duduq-theme.css" />
  <link rel="stylesheet" href="/core/duduq-world-fusion.css" />
  
  <!-- ✨ NOVO: Design System de Potencialização Visual -->
  <link rel="stylesheet" href="/core/duduq-design-system.css" />
  
  <!-- ... outros recursos ... -->
</head>
```

### Opção 2: Importação via JavaScript

Se preferir carregar dinamicamente:

```javascript
(function() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/core/duduq-design-system.css';
  document.head.appendChild(link);
})();
```

### Opção 3: Inline no HTML (Para testes rápidos)

Copie o conteúdo do `duduq-design-system.css` e cole dentro de uma tag `<style>` no início do `<head>`:

```html
<head>
  <style>
    /* Cole aqui o conteúdo completo do duduq-design-system.css */
  </style>
  <!-- ... resto do head ... -->
</head>
```

## 🎯 O Que Este Design System Faz

### 1. **Instruções / Enunciados Premium**
- Efeito glassmorphism com backdrop blur
- Sombras cinemáticas multicamadas
- Hover states sofisticados com glow
- Tipografia otimizada para leitura

### 2. **Cards de Feedback AAA+**
- Animações de entrada com bounce
- Cores de estado (sucesso/erro) vibrantes
- Mascote com animações contextuais
- Transições suaves entre estados

### 3. **Botões Estilo Duolingo**
- Efeito 3D com sombra sólida
- Feedback tátil no hover/active
- Estados desabilitados claros
- Acessibilidade WCAG AA+

### 4. **Elementos Interativos**
- Cards arrastáveis com profundidade
- Bolhas Bubble Pop com brilho
- Estados hover/active consistentes
- Animações de feedback (shake, pop, etc.)

### 5. **Barra de Progresso Aprimorada**
- Brilho animado contínuo
- Gradientes premium
- Efeitos de profundidade
- Contador tipográfico destacado

### 6. **Animações Unificadas**
- `duduqAudioPulse` — Pulso durante playback de áudio
- `duduqFeedbackSuccess` — Entrada triunfante
- `duduqFeedbackRetry` — Entrada encorajadora
- `duduqMascotCelebrate` — Comemoração do mascote
- `duduqMascotEncourage` — Incentivo do mascote
- `duduqShake` — Tremor de erro
- `duduqBubblePop` — Estouro de bolha
- `duduqProgressShine` — Brilho da barra de progresso

## 🎨 Variáveis CSS Disponíveis

### Cores

```css
--duduq-blue-primary: #0874d8;
--duduq-blue-light: #3aa8f5;
--duduq-success: #58cc02;
--duduq-error: #ff4b4b;
--duduq-warning: #ffc928;
--duduq-text-primary: #1a2b3c;
/* ... e muitas outras ... */
```

### Sombras

```css
--duduq-shadow-xs: 0 1px 2px rgba(22, 58, 88, 0.06);
--duduq-shadow-md: 0 4px 12px rgba(22, 58, 88, 0.10);
--duduq-shadow-lg: 0 8px 24px rgba(22, 58, 88, 0.12);
--duduq-shadow-glow: 0 0 24px rgba(58, 168, 245, 0.40);
```

### Bordas

```css
--duduq-radius-sm: 8px;
--duduq-radius-xl: 20px;
--duduq-radius-full: 9999px;
```

### Transições

```css
--duduq-transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--duduq-transition-bounce: 450ms cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Tipografia

```css
--duduq-font-primary: "Nunito", ui-rounded, system-ui, sans-serif;
--duduq-font-display: "Fredoka", "Nunito", ui-rounded, system-ui, sans-serif;
--duduq-text-xl: clamp(22px, 2.2vw, 28px);
--duduq-font-extrabold: 900;
```

## ✅ Mecânicas Beneficiadas

Todas as 7 mecânicas do ecossistema DuduQ:

1. **Bubble Pop** (`DUDUQ_BUBBLE_POP.html`)
2. **Drag & Drop** (`DUDUQ_DRAG_DROP.html`)
3. **Matching** (`DUDUQ_MATCHING.html`)
4. **Memory Quest** (`DUDUQ_MEMORY_QUEST.html`)
5. **Smart Sentence** (`DUDUQ_SMART_SENTENCE.html`)
6. **Target Shooter** (`DUDUQ_TARGET_SHOOTER.html`)
7. **Word Slash** (`DUDUQ_WORD_SLASH.html`)

## 🔧 Personalização

### Sobrescrevendo Variáveis

Crie um CSS personalizado após importar o design system:

```html
<link rel="stylesheet" href="/core/duduq-design-system.css" />
<style>
  :root {
    --duduq-blue-primary: #SEU_AZUL;
    --duduq-success: #SEU_VERDE;
    --duduq-radius-xl: 16px; /* Mais quadrado */
  }
</style>
```

### Desativando Animações Específicas

```css
/* Para usuários com preferência por redução de movimento */
@media (prefers-reduced-motion: reduce) {
  .duduq-progress-fill::after {
    animation: none;
  }
}
```

## 📱 Responsividade

O design system é totalmente responsivo:

- **Desktop (> 640px)**: Tamanhos completos
- **Mobile (≤ 640px)**: Elementos reduzidos proporcionalmente
- **Acessibilidade**: Respeita `prefers-reduced-motion`

## 🎯 Hierarquia de CSS

Ordem recomendada de importação:

```html
<!-- 1. Tema Base -->
<link rel="stylesheet" href="/core/duduq-theme.css" />

<!-- 2. World Fusion (Backgrounds + Layout) -->
<link rel="stylesheet" href="/core/duduq-world-fusion.css" />

<!-- 3. ✨ Design System (Potencialização Visual) -->
<link rel="stylesheet" href="/core/duduq-design-system.css" />

<!-- 4. CSS Específico da Mecânica (se houver) -->
<link rel="stylesheet" href="./mechanic-specific.css" />
```

## 🧪 Testes

Após integrar, verifique:

1. ✅ Instruções com efeito glassmorphism
2. ✅ Botões com sombra 3D e hover tátil
3. ✅ Feedback cards com animações de entrada
4. ✅ Barra de progresso com brilho animado
5. ✅ Elementos interativos com hover states
6. ✅ Responsividade em mobile
7. ✅ Consistência entre todas as mecânicas

## 📊 Métricas de Sucesso

- **Consistência Visual**: Todas as mecânicas compartilham a mesma linguagem
- **Qualidade Percebida**: Efeitos premium (glassmorphism, sombras, brilhos)
- **Feedback Rico**: Animações contextuais para cada estado
- **Acessibilidade**: Contrastes WCAG AA+, redução de movimento
- **Performance**: CSS puro, sem dependências JavaScript

## 🔄 Versionamento

- **Versão Atual**: 1.0.0
- **Compatibilidade**: Todas as versões atuais das mecânicas
- **Atualizações Futuras**: Novos componentes e variações

---

**Criado com ❤️ para o Ecossistema DuduQ**

*Eleve a experiência dos seus alunos com design consistente e sofisticado!*
