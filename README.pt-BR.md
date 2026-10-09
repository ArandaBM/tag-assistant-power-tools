# Tag Assistant Power Tools

[English](README.md) | **Português (Brasil)**

Extensão para Chrome e Microsoft Edge que ajuda você a focar nos eventos relevantes do [Google Tag Assistant](https://tagassistant.google.com/): selecione eventos, oculte o ruído e destaque o que importa.

**[Baixar ZIP pronto — v0.1.0 para testes](https://github.com/ArandaBM/tag-assistant-power-tools/releases/download/v0.1.0/tag-assistant-power-tools.zip)** · [Detalhes da versão](https://github.com/ArandaBM/tag-assistant-power-tools/releases/tag/v0.1.0)

## Testar sem compilar

Não é necessário instalar Node.js, npm ou Git.

1. Baixe **tag-assistant-power-tools.zip** pelo link acima. Os arquivos **Source code** oferecidos pelo GitHub não são a extensão pronta.
2. Extraia o ZIP para uma pasta permanente no computador. Não tente carregar o próprio ZIP.
3. Abra `chrome://extensions` (Chrome) ou `edge://extensions` (Edge).
4. Ative o **Modo do desenvolvedor**, clique em **Carregar sem compactação** e selecione a pasta extraída que contém o **manifest.json**.
5. Abra ou atualize uma sessão de depuração no [Tag Assistant](https://tagassistant.google.com/) e clique no botão do Power Tools.

Mantenha a pasta extraída: o navegador carrega a extensão a partir dela. Esta é uma instalação manual para testes, não uma instalação pelas lojas Chrome Web Store ou Edge Add-ons. Para atualizar futuramente, extraia o novo pacote sobre a mesma pasta, clique em **Recarregar** na página de extensões e atualize o Tag Assistant.

## Funcionalidades

- **Eventos:** lista pesquisável dos nomes detectados, com contagem de ocorrências e seleção múltipla.
- **Mostrar somente selecionados:** aplique um filtro por nomes exatos sem digitar. Os nomes ativos aparecem como etiquetas removíveis.
- **Filtrar por texto:** refine os resultados com Contém, Nome exato ou Expressão regular.
- **Exclusões salvas:** oculte vários tipos de evento, ative/desative regras individualmente e preserve as preferências entre sessões.
- **Cores:** escolha um evento detectado ou digite um nome/padrão e atribua uma cor.
- **Atualização automática:** filtros, exclusões, cores e contagens acompanham os eventos que chegam.
- **Visualização temporária:** mostre todos os eventos sem apagar as regras e retome os filtros depois.
- **Sidebar organizada:** abas Eventos, Exclusões e Cores; opções secundárias e ajuda disponíveis quando necessário.
- **Idioma automático:** português e inglês, conforme o idioma da interface do navegador. Outros idiomas usam inglês.
- **Canal de sugestões:** link para o LinkedIn do autor no rodapé.

A extensão altera apenas a visualização. Ela não apaga eventos nem modifica a implementação de rastreamento do site. Os nomes dos eventos não são traduzidos.

## Compilar a partir do código (desenvolvedores)

Requisitos: Git, npm, **Node.js 24.15 ou mais recente na linha 24.x**, e Chrome ou Microsoft Edge. Essa versão do Node suporta as dependências de desenvolvimento e testes incluídas.

```bash
git clone https://github.com/ArandaBM/tag-assistant-power-tools.git
cd tag-assistant-power-tools
npm ci
npm run build
```

1. Abra `chrome://extensions` (Chrome) ou `edge://extensions` (Edge).
2. Ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione a pasta **dist** gerada.
4. Abra uma sessão real de depuração no [Tag Assistant](https://tagassistant.google.com/).
5. Clique no botão flutuante do Power Tools no canto inferior direito.

Após recompilar, recarregue a extensão na página de extensões do navegador e atualize o Tag Assistant. A pasta `dist` é gerada localmente e não é versionada neste repositório.

## Como usar

### Eventos e filtros

O campo de busca **apenas pesquisa a lista da sidebar**. Para alterar o que aparece no Tag Assistant, marque um ou mais nomes e clique em **Mostrar somente selecionados**. Essa ação substitui a seleção anterior, limpa o texto do filtro e oculta os demais nomes. Os nomes selecionados usam correspondência literal, diferenciando maiúsculas e minúsculas.

Use **Filtrar por texto** para digitar um nome ou padrão. Quando há nomes selecionados, o texto refina essa seleção. A opção de ocultar permite esconder ou atenuar os eventos que não correspondem ao filtro. **Limpar filtro** remove os nomes selecionados e o texto, preservando as exclusões salvas.

### Exclusões

Clique em **Excluir selecionados** na aba Eventos ou adicione uma regra na aba Exclusões. As regras aceitam Contém, Nome exato e Expressão regular; novas exclusões não diferenciam maiúsculas de minúsculas. Um evento fica oculto quando corresponde a qualquer exclusão ativada, mesmo com o filtro principal vazio ou configurado para atenuar outros eventos.

Desative uma exclusão para guardá-la para depois ou exclua a regra. Regras vazias não têm efeito. Por exemplo, uma exclusão de nome exato `scroll` oculta `scroll`; uma exclusão do tipo Contém com `click` também oculta `button_click`.

Filtros antigos de exclusão são convertidos automaticamente em exclusões salvas. As restrições de nomes selecionados e a diferenciação entre maiúsculas e minúsculas são preservadas e exibidas na regra convertida.

### Cores

Adicione uma regra na aba Cores e **escolha um evento detectado**. Ao selecionar um nome, a regra passa a usar Nome exato. Para eventos que ainda não aparecem na lista ou padrões que abrangem vários eventos, abra **Digitar nome ou padrão**.

Regras de cor vazias não têm efeito. A primeira regra ativada que corresponde ao evento prevalece. As cores são aplicadas aos eventos mantidos pelos filtros; a opção de mostrar todos temporariamente também preserva as cores.

### Contagens e visualização temporária

As contagens consideram os eventos atualmente detectados no Tag Assistant, inclusive os ocultados pelo Power Tools. Eventos atenuados contam como visíveis e também são identificados separadamente. O seletor exibe cada nome uma vez, com sua quantidade de ocorrências; ele **não** agrupa nem reordena a linha do tempo original do Tag Assistant.

**Mostrar todos temporariamente** pausa filtros e exclusões na aba atual. **Retomar filtros** ou recarregar a página restaura sua aplicação. Essa escolha temporária não é salva nem sincronizada.

## Preferências e limitações

- Filtros, exclusões e regras de cores usam `chrome.storage.sync`; a sincronização depende da configuração do navegador do usuário.
- A sidebar preserva a aba ativa, as seções abertas e a posição de rolagem durante a edição das regras. As setas do teclado e Home/End permitem navegar entre as abas.
- A lista de eventos detectados não é um arquivo histórico: eventos removidos ou descarregados pelo Tag Assistant podem sair da lista.
- A detecção usa linhas interativas numeradas e seus títulos, sem depender das classes CSS do Tag Assistant. Mudanças futuras na DOM do Google podem exigir ajustes no adapter.
- As permissões se limitam ao armazenamento da extensão e a `https://tagassistant.google.com/*`.

## Desenvolvimento

```bash
npm run watch       # Recompila quando os arquivos-fonte mudam
npm run typecheck   # Verifica os tipos TypeScript
npm test            # Executa os testes locais de DOM e comportamento
npm run build       # Gera a pasta dist
```

Execute verificações adequadas à alteração. Os testes automatizados usam jsdom; a validação no navegador continua sendo útil para mudanças que envolvam a DOM real do Tag Assistant.

```text
src/
  background/       Worker da extensão
  content/          Adapter da DOM, estilos dos eventos e atualização
  rules/            Correspondência de filtros, exclusões e cores
  storage/          Preferências e migração
  ui/               Sidebar e textos em português/inglês
  types.ts          Tipos compartilhados
tests/              Testes de comportamento e integração
```

Desenvolvido com TypeScript, esbuild, Manifest V3, Shadow DOM e Chrome Storage API.

## Sugestões e feedback

Criado por **[Bruno Aranda](https://www.linkedin.com/in/brunoarandati/)**. Tem uma sugestão ou encontrou algum problema? [Vamos conversar no LinkedIn](https://www.linkedin.com/in/brunoarandati/).

As próximas funcionalidades serão orientadas pelo feedback dos usuários. Este projeto é independente e não tem vínculo ou endosso do Google ou da Microsoft.
