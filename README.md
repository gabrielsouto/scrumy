# Scrumy — Quadro Scrum (pt-BR)

Scrumy é um quadro Kanban/Scrum simples, estático (HTML/CSS/JS), para organizar tarefas localmente no navegador. Ele não requer backend nem build: basta abrir o `index.html` e usar.

## Funcionalidades
- 5 colunas: Backlog, A Fazer, Fazendo, Revisão, Concluído.
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
- Cartões são salvos em `localStorage` usando a chave `scrumy.board.v1`.
- Preferência de tema é salva em `scrumy.theme.v1`.
- Os dados ficam no navegador atual (por máquina/perfil). Limpar dados do site apaga o quadro.

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

## Links
- Repositório: https://github.com/gabrielsouto/scrumy
