# Scrumy — Quadro Scrum (pt-BR)

Scrumy é um quadro Kanban/Scrum simples, estático (HTML/CSS/JS), para organizar tarefas localmente no navegador. Ele não requer backend nem build: basta abrir o `index.html` e usar.

## Funcionalidades
- 5 colunas: Backlog, A Fazer, Fazendo, Revisão, Concluído.
- Múltiplos quadros: selecionar, criar, duplicar (Salvar como) e apagar.
- Cabeçalho fixo com menu (dropdowns: Quadros, Tarefas, Exportar).
- CRUD de cartões: criar, editar (✎) e excluir (🗑).
- Arrastar e soltar entre colunas (drag & drop).
- Modal para criação/edição com título, descrição e status.
- Persistência automática no navegador via `localStorage`.
- Tema claro/escuro com alternância na toolbar e preferência salva.
- Exportar imagem (PNG) da página (header + board) com timestamp.
- Exportar/Importar JSON do quadro (backup/restauração).
- Limpar quadro (apaga todos os cartões).
- Nome do quadro atual exibido ao lado do logo.
- Renomear quadro clicando no nome ao lado do logo (edição inline com ícone de lápis; Enter salva, Esc cancela).
- Layout responsivo com colunas dinâmicas (auto‑fit, sem scroll horizontal).
- Semente de exemplo na primeira execução (se não houver dados salvos).

## Como usar
1. Abra o arquivo `index.html` em um navegador moderno (Chrome, Edge, Firefox, Safari).
2. Menu superior (cabeçalho fixo):
   - Quadros: Selecionar quadro | Novo Quadro | Salvar como | Apagar Quadro.
   - Renomear: clique no nome do quadro (pill ao lado do logo) para editar inline (ícone de lápis aparece no hover). Enter salva, Esc cancela.
   - Tarefas: Nova tarefa | Limpar quadro.
   - Importar/Exportar: Exportar imagem (PNG do header + board) | Exportar JSON | Importar JSON.
   - Tema: botão à direita alterna entre claro/escuro.
3. Em cada cartão:
   - ✎ Editar: abre o modal com os dados do cartão.
   - 🗑 Excluir: remove o cartão após confirmação.
4. Arraste cartões entre colunas para alterar o status.

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
  - Objeto: `{ id, name, createdAt, updatedAt, cards: [...] }`, ou
  - Lista de cartões: `[ { id, title, description, status, createdAt }, ... ]`.
 
 Exemplo pronto para importar:
- `samples/board-receita-bolo-5.json` — quadro “Receita de Bolo - 5 por coluna” com 25 cartões (5 por coluna: backlog, todo, doing, review, done).
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
