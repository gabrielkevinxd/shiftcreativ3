# Shift Creativ3 - Website Institucional e Portfólio

Este é o repositório oficial da Shift Creativ3. Originalmente construído em HTML estático de uma única página, o projeto foi integralmente migrado e modernizado para uma arquitetura robusta e performática utilizando **Next.js 15+ (App Router)** e **Tailwind V4**.

## 🚀 Tecnologias Utilizadas

- **React e Next.js**: Componentização do layout garantindo manutenibilidade e escalabilidade.
- **Tailwind CSS**: Estilização centralizada com classes utilitárias e *CSS Variables* globais.
- **Phosphor Icons**: Todos os ícones otimizados nativamente via React (`@phosphor-icons/react`), sem a necessidade de CDNs assíncronos pesados.
- **TypeScript**: Maior segurança na gestão de propriedades e mapeamento de traduções (`src/lib/translations.ts`).

## 💎 Features e Melhorias de UX/UI

- **ReelCard Performático (Portfólio / Showreel):** 
  - Substituto do antigo sistema visual. O componente replica 1:1 o layout exato dos grids de perfil de Instagram (quadrados `aspect-square`).
  - **Zero-Load Payload:** Para atingir pontuação máxima no Lighthouse do Google, utilizamos a técnica de `preload="none"`. O navegador do cliente não baixa 1MB de videoclipes ao abrir o site. Um poster (thumbnail/imagem da arte) é servido rapidamente.
  - **Auto-Play por Hover:** Somente quando o usuário passa o cursor (`onMouseEnter`) sobre o projeto, o clipe do background é empurrado em streaming instantâneo (sem áudio, com loop infinito). O ícone do "Play" desaparece gentilmente e toda a capa da imagem revela o vídeo subjacente.
- **Glassmorphism Dinâmico:** Aplicações cirúrgicas de `backdrop-blur` e `bg-white/5` mesclam o fundo em tempo real criando um menu de navegação e botões luxuosamente elegantes.
- **Internacionalização Refatorada:** Dicionário completo de `PT/EN` mapeado por tipagem forte diretamente do hook `useState` principal.
- **SEO Otimizado de Raiz:** OpenGraph, Twitter Cards, Keywords, Canonical URLs definidos estaticamente via a API nativa de Metadata (`layout.tsx`).

## 📂 Como Editar o Portfólio (Inserir Vídeos REAIS)

Para alterar ou adicionar as artes da sua agência no grid de "Showreel", basta editar o componente principal: `src/app/page.tsx`.

Vá até a tag `<ReelCard />` na árvore de código (linha aprox. 320) e substitua os valores:
```tsx
<ReelCard 
  link="https://www.instagram.com/seu_post"              // Link para direcionar a pessoa
  title="Seu Título Interno (SEO)"                       // Título de acessibilidade
  poster="/caminho-da-sua-miniatura.jpg"                 // Imagem da arte que exibirá inicialmente
  videoSrc="/videos/seu_video.mp4"                       // URL/caminho local do vídeo (ex. /public/videos/clip.mp4)
/>
```
> Obs: Sugere-se armazenar imagens de pôster em `/public` para a melhor resposta nativa.

## 🛠️ Comandos de Desenvolvimento

Use os seguintes scripts para interagir com o ciclo de vida do seu App:

Levantar o servidor de testes locally (HMR ativado):
```bash
npm run dev
```

Construir e gerar os binários super-otimizados em HTML/CSS final para Produção (Vercel ou servidor próprio):
```bash
npm run build
```

Iniciar o projeto já buildado:
```bash
npm start
```
