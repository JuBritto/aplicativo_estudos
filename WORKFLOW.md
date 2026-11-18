# 🌿 Fluxo de Trabalho (Git Workflow)

Este documento descreve o fluxo de trabalho do projeto **Foco & Tarefas**, com separação entre a versão finalizada (`main`) e a versão de desenvolvimento (`develop`).

---

## 📌 Estrutura de Branches

* **`main`**: Versão final e estável (produção). Só recebe código que já foi testado na `develop`.
* **`develop`**: Versão em desenvolvimento ativo. Todo trabalho do dia a dia acontece aqui.

---

## 🚀 Passo a Passo: Configuração Inicial (Primeira Vez)

Depois de criar o repositório no seu GitHub (ex: `https://github.com/SEU_USUARIO/aplicativo-to-do-list.git`), execute no terminal dentro desta pasta:

```bash
# 1. Inicializar o repositório Git local
git init

# 2. Adicionar todos os arquivos e fazer o primeiro commit
git add .
git commit -m "feat: versão inicial do aplicativo pomodoro e to-do list"

# 3. Definir branch principal como main e vincular ao seu GitHub
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git

# 4. Enviar a versão final para a main no GitHub
git push -u origin main

# 5. Criar e subir a branch develop
git checkout -b develop
git push -u origin develop
```

---

## 🔄 Fluxo de Trabalho Diário (Dia a Dia)

```
       [ GitHub origin/develop ]
             |              ^
       (git pull)      (git push)
             v              |
       [ Sua Máquina (develop) ]
             |
             v (Quando pronto para lançar)
       [ Merge para main ]
             |
             v
       [ GitHub origin/main ]
```

### 1️⃣ Iniciar o trabalho (Puxar da `develop`)
Sempre comece garantindo que sua máquina tem a versão mais recente:

```bash
git checkout develop
git pull origin develop
```

### 2️⃣ Desenvolver e salvar alterações
Faça as modificações no código. Quando terminar um conjunto de alterações:

```bash
git status
git add .
git commit -m "feat: adicionada nova funcionalidade X"
```

### 3️⃣ Enviar para a `develop` no GitHub
Mande suas alterações de volta para a branch de desenvolvimento:

```bash
git push origin develop
```

---

## 🏆 Publicar uma Versão Final (Enviar para a `main`)

Quando as novidades na `develop` estiverem testadas e prontas para se tornarem a versão finalizada oficial:

```bash
# 1. Mudar para a branch main
git checkout main

# 2. Garantir que a main local está atualizada
git pull origin main

# 3. Trazer as alterações da develop para a main
git merge develop

# 4. Enviar a nova versão finalizada para o GitHub
git push origin main

# 5. Voltar para a develop para continuar programando
git checkout develop
```

---

## 💡 Dicas de Boas Práticas

* **Commits Semânticos**:
  * `feat:` para novas funcionalidades (ex: `feat: botão de som customizado`)
  * `fix:` para correções de erros (ex: `fix: corrigido cálculo do anel pomodoro`)
  * `style:` para melhorias visuais e css (ex: `style: ajuste de margens do modal`)
  * `docs:` para alterações em documentação (ex: `docs: atualizado README`)
