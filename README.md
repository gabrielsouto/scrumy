# Scrumy — Quadro Scrum (pt-BR)

Scrumy é um quadro Kanban/Scrum simples, estático (HTML/CSS/JS), para organizar tarefas localmente no navegador. Ele não requer backend nem build: basta abrir o `index.html` e usar.

## Funcionalidades
- 1 coluna especial + 5 de fluxo: História (anotações), Backlog, A Fazer, Fazendo, Revisão, Concluído.
- Notas por linha na coluna História: edição inline (contenteditable), com salvamento automático.
  - Botão "+" na História: cria uma nova tarefa diretamente naquela linha.
- Múltiplas linhas (swimlanes): adicionar/remover linha em Tarefas; “Limpar quadro” mantém 1 linha.
- Múltiplos quadros: selecionar, criar, duplicar (Salvar como) e apagar.
- Cabeçalho fixo com menu (dropdowns: Quadros, Tarefas, Exportar).
- Cartões: criar, editar e excluir — botões no canto superior direito (✎ editar, × excluir).
- Arrastar e soltar entre colunas/linhas (drag & drop). Não é permitido soltar na coluna História.
- Modal de cartão com Título, Descrição, Observação (rodapé do card), Responsável, Status e Cor.
- Responsável: campo de texto com sugestões (autocomplete) baseadas nos nomes já usados em outros cards do quadro. Você pode digitar livremente ou escolher uma sugestão.
- Filtro por responsável no menu Tarefas: mostre somente cards de um responsável, todos os cards, ou apenas os sem responsável. O filtro é lembrado por quadro.
- Prioridade opcional nos cards: Baixa, Média, Alta, Urgente (ou Sem prioridade). Exibida como ícone de barras no card.
- Filtro por prioridade no menu Tarefas: todas, sem prioridade, baixa, média, alta, urgente. O filtro é lembrado por quadro.
- Datas somente leitura: “Criado” (data de criação) e “Concluído” (quando o status vira Concluído), exibidas no card e no modal (somente edição).
- Cores de cartão (pastel): amarelo, azul, vermelho, verde e cinza.
- Persistência automática no navegador via `localStorage`.
- Tema claro/escuro com alternância na toolbar e preferência salva.
- Exportar imagem (PNG) do header + board; durante a captura sombras e gradientes são desativados para um visual limpo.
- Exportação longa melhorada: durante a captura o rodapé deixa de ser fixo para não sobrepor cards em quadros muito altos.
- Exportar/Importar JSON do quadro (backup/restauração) incluindo `lanes`, `storyNotes` e campos dos cartões.
- Limpar quadro (apaga todos os cartões e reseta para 1 linha).
- Nome do quadro atual exibido ao lado do logo e renomeável inline (Enter salva, Esc cancela).
- Layout responsivo com colunas dinâmicas (auto‑fit, sem scroll horizontal).
- Semente de exemplo na primeira execução (se não houver dados salvos).

## Como usar
1. Abra o arquivo `index.html` em um navegador moderno (Chrome, Edge, Firefox, Safari).
2. Menu superior (cabeçalho fixo):
   - Quadros: Selecionar quadro | Novo Quadro | Salvar como | Apagar Quadro.
   - Renomear: clique no nome do quadro (pill ao lado do logo) para editar inline (ícone de lápis aparece no hover). Enter salva, Esc cancela.
   - Tarefas: Nova tarefa | Nova linha | Remover linha | Limpar quadro | Filtrar por responsável.
   - Importar/Exportar: Exportar imagem (PNG do header + board) | Exportar JSON | Importar JSON.
   - Tema: botão à direita alterna entre claro/escuro.
3. Em cada cartão:
   - ✎ (canto superior direito) Editar.
   - × (canto superior direito) Excluir (com confirmação).
4. Arraste cartões entre colunas/linhas para alterar status/linha. Observação: não é possível soltar na coluna História.
5. Coluna História: clique no campo para escrever notas da linha; salva automaticamente. Use o botão "+" (no canto da História) para criar uma nova tarefa diretamente nessa linha.

## Executar localmente (opcional)
Você pode simplesmente abrir o `index.html`. Se preferir um servidor local:

```bash
python -m http.server 8000
```

## Persistência de dados
- Cartões por quadro são salvos em `localStorage` na chave `scrumy.board.v1.<idDoQuadro>`.
- Preferência de tema é salva em `scrumy.theme.v1`.
- Registro de quadros (lista e metadados) em `scrumy.boards.meta.v1`.
- Quadro atual selecionado em `scrumy.current.boardId.v1`.
- Migração automática: se houver dados antigos em `scrumy.board.v1`, eles são movidos para um quadro padrão "Quadro 1" na primeira carga.
- Os dados ficam no navegador atual (por máquina/perfil). Limpar dados do site apaga o quadro.

## Exportar/Importar JSON
- Exportar JSON (quadro atual): baixa um arquivo `.json` contendo o nome/metadados e os cartões do quadro atual.
- Importar JSON: selecione um arquivo exportado. Você pode:
  - Criar um novo quadro com os cartões importados (recomendado);
  - Ou substituir o conteúdo do quadro atual.
  O formato aceito é:
  - Objeto (recomendado):
    ```json
    {
      "id": "<id>",
      "name": "<nome>",
      "createdAt": 0,
      "updatedAt": 0,
      "lanes": 1,
      "storyNotes": ["nota por linha"],
      "assigneeFilter": "<nome>|__none__|",
      "priorityFilter": "low|medium|high|urgent|__none__|",
      "cards": [
        {
          "id": "<id>",
          "title": "<título>",
          "description": "<descrição>",
          "observation": "<observação>",
          "assignee": "<responsável>",
          "priority": "low|medium|high|urgent",
          "status": "backlog|todo|doing|review|done",
          "color": "yellow|blue|red|green|gray",
          "lane": 0,
          "createdAt": 0,
          "completedAt": 0
        }
      ]
    }
    ```
  - Observações:
    - `assignee` é opcional em cada card (texto livre). Se ausente/vazio, o card é considerado “sem responsável”.
    - `assigneeFilter` é opcional no topo do objeto do quadro. Valores:
      - `""` (vazio) mostra todos os cards;
      - `"__none__"` mostra apenas cards sem responsável;
      - Qualquer outro texto filtra por nome exato (case-insensitive).
    - `priority` é opcional em cada card. Se ausente, o card é considerado “sem prioridade”. Valores aceitos: `low`, `medium`, `high`, `urgent`.
    - `priorityFilter` é opcional no topo do objeto do quadro. Valores:
      - `""` (vazio) mostra todas as prioridades;
      - `"__none__"` mostra apenas cards sem prioridade;
      - `low|medium|high|urgent` filtram pelo nível correspondente.
    - `completedAt` é opcional por card (definido automaticamente quando o status vira `done` e limpo ao sair de `done`).
  - Lista de cartões: `[ { id, title, description, status, createdAt }, ... ]` (campos ausentes são normalizados; `status: "story"` é convertido para `backlog`).
  - Ao substituir o quadro atual durante a importação, os valores de `lanes` e `storyNotes` do arquivo importado passam a valer no quadro e todas as linhas são renderizadas corretamente.
 
 Exemplo pronto para importar:
- `samples/board-receita-bolo.json` — quadro “Receita de Bolo” com 2 linhas (lanes), responsáveis preenchidos, prioridades (inclui cards sem prioridade), `completedAt` nos concluídos e filtros (`assigneeFilter` e `priorityFilter`).
   - Use no app: Importar/Exportar → Importar JSON e selecione este arquivo.

## Quadros
- Selecionar: use o seletor "Selecionar quadro" na barra superior.
- Criar novo: clique em "Novo Quadro" e informe o nome. O quadro inicia vazio.
- Salvar como (duplicar): clique em "Salvar como" para criar um novo quadro com cópia dos cartões atuais.
- Apagar: clique em "Apagar Quadro" e confirme. Se apagar o último quadro existente, um quadro vazio "Quadro 1" é criado automaticamente para continuar usando o app.
 - Renomear: clique no nome do quadro exibido ao lado do logo para editar inline (Enter salva; Esc cancela; sair do campo também salva).

## Acessar quadro via URL
Você pode abrir/criar um quadro informando o nome pela URL.

- Por query string (funciona em qualquer servidor):
  - `?board=Projeto%20X`
  - `?quadro=Sprint%201`
  - `?nome=Roadmap`
  - `?name=Kanban`
  - Também aceita uma query “nua”: `?Meu%20Quadro` (sem `=`)

- Por caminho (requer rewrite para SPA):
  - `/<nome-do-quadro>`
  - Ex.: `https://scrumy.com.br/Quadro%20padr%C3%A3o`

Comportamento:
- Se já existir um quadro com esse nome (case‑insensitive), ele será selecionado.
- Se não existir, será criado vazio.
- Acessar somente a raiz do app (ex.: `/` ou `https://scrumy.com.br/`) não cria nenhum quadro automaticamente.
- A comparação respeita acentuação ("padrao" ≠ "padrão").

Rewrite (Apache):
- Habilite `mod_rewrite` e `AllowOverride All` no diretório do app.
- O repo inclui um `.htaccess` que redireciona rotas para `index.html`, mantendo arquivos/pastas reais.
  - Isso evita 404 ao acessar `/<nome-do-quadro>` (ex.: `https://scrumy.com.br/Meu%20Quadro`) diretamente.

## Exportar imagem
- Botão: “Exportar imagem”.
- Captura a página (header + board) e baixa um arquivo como `scrumy-YYYYMMDD-HHMMSS.png`.
- Durante a captura, sombras (cards/colunas/header/footer) e gradientes de fundo são temporariamente desativados para evitar halos na imagem.
- Durante a captura, os botões de ação dos cards (✎ e ×) e o botão "+" da coluna História ficam ocultos.
- Implementado com `html2canvas` vendorizado em `vendor/html2canvas.min.js`.

## Tema claro/escuro
- Alternância via botão “Tema: Escuro/Claro”.
- Detecta preferência do sistema na primeira carga.
- Implementado com variáveis CSS (`:root` e `:root[data-theme="light"]`).

## Estrutura do projeto
- `index.html` — marcação da aplicação e cabeçalho fixo com menus.
- `styles.css` — estilos, temas e responsividade.
- `script.js` — lógica do board (estado, renderização, DnD, modal, storage, tema, exportação de imagem e exportação/importação JSON).
- `vendor/html2canvas.min.js` — biblioteca para captura da imagem (sem dependências externas em runtime).

## Navegadores
Testado em navegadores modernos. Requer suporte a `localStorage`, `drag & drop` e `canvas`.

## Observações
- “Limpar quadro” é irreversível e remove todos os cartões salvos.
- A exportação de imagem respeita o tema atual.
- Rodapé fixo com links para GitHub e para o canal do autor (YouTube: Gabriel Souto).

## Limitações
- Sem sincronização: os dados ficam no navegador/perfil local (não há backup/conta/login).
- Sem colaboração em tempo real: uso é individual no dispositivo atual.
- Limpar dados do site/apagar `localStorage` remove quadros e cartões.
- Exportação de imagem é um snapshot estático (não inclui interações/menus abertos).

## Links
- Site: https://scrumy.com.br/
- GitHub: https://github.com/gabrielsouto/scrumy
- YouTube: https://www.youtube.com/GabrielSouto
