# 🍅 Foco & Tarefas (Pomodoro & To-Do List)

Um aplicativo moderno, rápido e sem dependências externas para gerenciamento de tarefas e foco com a técnica Pomodoro.

---

## 🚀 Como Iniciar o Aplicativo

Existem formas fáceis de abrir o aplicativo no seu computador:

1. **Modo Janela Completa (Recomendado):**  
   Dê dois cliques no arquivo **`Abrir Aplicativo.bat`**.  
   Ele abrirá o sistema em uma janela dedicada, parecendo um aplicativo nativo do Windows (sem barra de endereços).

2. **Modo Widget Compacto Direto:**  
   Dê dois cliques no arquivo **`Abrir Modo Widget.bat`**.  
   Ele abrirá o sistema diretamente em uma janela pequena e compacta no canto da tela, focando apenas no timer e nas tarefas.

3. **No seu Navegador Padrão:**  
   Dê dois cliques diretamente no arquivo **`index.html`** para abrir no seu navegador favorito (Chrome, Edge, Firefox, Brave, etc.).

---

## ✨ Funcionalidades

### 🪟 Modo Widget (Compacto & Minimalista)
- **Visual Compacto na Tela:** Esconde a barra lateral e mantém apenas o essencial: o timer Pomodoro e a lista de tarefas da categoria atual.
- **Altura Dinâmica sem Barras de Rolar:** Conforme você adiciona novos itens, a janela cresce verticalmente para acompanhar a lista até um limite máximo confortável, sem exibir barras de rolagem visíveis.
- **Seletor Rápido de Listas:** Alterne entre listas diretamente pelo topo do Widget sem precisar abrir o menu lateral.
- **Como Ativar / Desativar:**
  - Clique no botão **Modo Widget** na barra lateral ou no ícone de janela no topo do Pomodoro.
  - Pressione a tecla **`W`** no teclado para alternar rapidamente entre o modo completo e widget.
  - Pressione **`Esc`** ou clique em **Expandir** para voltar ao modo normal a qualquer momento.

### 📋 To-Do List (Gestão de Tarefas)
- **Múltiplas Listas:** Crie novas listas personalizadas (ex: *Estudos*, *Trabalho*, *Projetos*, *Compras*) clicando no botão `+` na barra lateral.
- **Ícones Personalizados:** Escolha um ícone para cada lista ao criá-la.
- **Adicionar Novos Tópicos:** Digite a tarefa e aperte `Enter` ou clique em **Adicionar**.
- **Marcar Conclusão:** Clique na caixinha para marcar ou desmarcar a tarefa com efeito sonoro agradável.
- **Focar na Tarefa:** Clique no botão `🎯 Focar` em qualquer tarefa para exibi-la em destaque no painel do Pomodoro.
- **Filtros Rápidos:** Veja tarefas por status: *Todas*, *Pendentes* ou *Concluídas*.
- **Excluir Tarefas e Listas:** Remova tarefas que não quer mais ou exclua listas inteiras quando desejar.
- **Limpeza Rápida:** Botão para remover todas as tarefas concluídas de uma só vez.

### ⏱️ Timer Pomodoro
- **Ciclos Automáticos:**
  - 🍅 **Foco:** 25 minutos padrão
  - ☕ **Pausa Curta:** 5 minutos padrão
  - 🛋️ **Pausa Longa:** 15 minutos (a cada 4 ciclos de foco)
- **Anel de Progresso Circular:** Visualize o tempo restante graficamente.
- **Controles Intuitivos:** Iniciar, Pausar, Pular ciclo e Resetar.
- **Perfis Sugeridos e Ajustes de Tempo:**
  - ⚡ **Rápido:** 15m foco · 3m pausa curta · 10m pausa longa (ideal para tarefas ágeis).
  - 🍅 **Tradicional:** 25m foco · 5m pausa curta · 15m pausa longa (padrão clássico Pomodoro).
  - 🚀 **Longo:** 50m foco · 10m pausa curta · 30m pausa longa (ideal para trabalho profundo / *deep work*).
  - Permite também ajuste minuto a minuto totalmente personalizado.
- **Contador de Ciclos:** Registra quantos blocos de foco você concluiu no dia.
- **Aba Dinâmica:** O tempo restante aparece no título da aba do navegador para você acompanhar mesmo em outra janela.
- **Notificações & Áudio:**
  - Efeito sonoro suave quando o tempo acaba.
  - Suporte a notificações da área de trabalho do Windows.
  - Botão de mutar/desmutar som a qualquer momento.

### 🎨 Personalização & Armazenamento
- **Temas (Escuro, Claro e Vampire):** Alterne entre o modo clássico escuro, claro ou o tema especial **Vampire** (preto profundo com detalhes em roxo e estética minimalista).
- **100% Offline e Seguro:** Todos os dados são salvos automaticamente no armazenamento local do seu computador (`localStorage`).
- **Nenhuma Instalação Adicional:** Não requer Node.js, nem bibliotecas pesadas.
