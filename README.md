# Scrumy — Quadro Scrum (pt-BR)

Scrumy é um quadro Kanban/Scrum simples, estático (HTML/CSS/JS), para organizar tarefas localmente no navegador. Ele não requer backend nem build: basta abrir o `index.html` e usar.

## Funcionalidades
- 5 colunas: Backlog, A Fazer, Fazendo, Revisão, Concluído.
- Múltiplos quadros: selecionar, criar, duplicar (Salvar como) e apagar.
- CRUD de cartões: criar, editar (✎) e excluir (🗑).
- Arrastar e soltar entre colunas (drag & drop).
- Modal para criação/edição com título, descrição e status.
- Persistência automática no navegador via `localStorage`.
- Tema claro/escuro com alternância na toolbar e preferência salva.
- Exportar imagem (PNG) da página (header + board) com timestamp.
- Limpar quadro (apaga todos os cartões).
- Layout responsivo (1–5 colunas conforme largura).
- Semente de exemplo na primeira execução (se não houver dados salvos).

## Como usar
1. Abra o arquivo `index.html` em um navegador moderno (Chrome, Edge, Firefox, Safari).
2. Use a barra superior para:
   - Selecionar quadro: escolha no seletor de quadros.
   - Novo Quadro: cria um quadro vazio com o nome informado.
   - Salvar como: duplica o quadro atual com um novo nome.
   - Apagar Quadro: remove o quadro atual (se for o último, um "Quadro 1" vazio é recriado).
   - Nova tarefa: abre o modal de criação.
   - Tema: alterna entre claro/escuro.
   - Exportar imagem: baixa um PNG do quadro atual (com header).
   - Limpar quadro: remove todos os cartões (ação irreversível).
3. Em cada cartão:
   - ✎ Editar: abre o modal com os dados do cartão.
   - 🗑 Excluir: remove o cartão após confirmação.
4. Arraste cartões entre colunas para alterar o status.

## Executar localmente (opcional)
Você pode simplesmente abrir o `index.html`. Se preferir um servidor local:

```bash
python -m http.server 8000
# Acesse: http://localhost:8000
```

## Persistência de dados
- Cartões por quadro são salvos em `localStorage` na chave `scrumy.board.v1.<idDoQuadro>`.
- Preferência de tema é salva em `scrumy.theme.v1`.
- Registro de quadros (lista e metadados) em `scrumy.boards.meta.v1`.
- Quadro atual selecionado em `scrumy.current.boardId.v1`.
- Migração automática: se houver dados antigos em `scrumy.board.v1`, eles são movidos para um quadro padrão "Quadro 1" na primeira carga.
- Os dados ficam no navegador atual (por máquina/perfil). Limpar dados do site apaga o quadro.

## Quadros
- Selecionar: use o seletor "Selecionar quadro" na barra superior.
- Criar novo: clique em "Novo Quadro" e informe o nome. O quadro inicia vazio.
- Salvar como (duplicar): clique em "Salvar como" para criar um novo quadro com cópia dos cartões atuais.
- Apagar: clique em "Apagar Quadro" e confirme. Se apagar o último quadro existente, um quadro vazio "Quadro 1" é criado automaticamente para continuar usando o app.

## Exportar imagem
- Botão: “Exportar imagem”.
- Captura a página (header + board) e baixa um arquivo como `scrumy-YYYYMMDD-HHMMSS.png`.
- Implementado com `html2canvas` vendorizado em `vendor/html2canvas.min.js`.

## Tema claro/escuro
- Alternância via botão “Tema: Escuro/Claro”.
- Detecta preferência do sistema na primeira carga.
- Implementado com variáveis CSS (`:root` e `:root[data-theme="light"]`).

## Estrutura do projeto
- `index.html` — marcação da aplicação e toolbar.
- `styles.css` — estilos, temas e responsividade.
- `script.js` — lógica do board (estado, renderização, DnD, modal, storage, tema, exportação de imagem).
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
- Não há importação/exportação de JSON (pode ser adicionada futuramente).

## Links
- GitHub: https://github.com/gabrielsouto/scrumy
- YouTube: https://www.youtube.com/GabrielSouto
