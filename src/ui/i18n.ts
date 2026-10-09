const en = {
  madeBy: "Built by", feedbackLink: "Suggestions? Let's talk on LinkedIn",
  linkedinLabel: "Bruno Aranda on LinkedIn — suggestions and feedback (opens in a new tab)",
  chooseColorEvent: "Choose a detected event", typeColorEvent: "Type a name or pattern",
  colorPickerHint: "Choose an event, or type a name if it has not appeared yet.",
  listSearchHint: "This search only locates names in the list.", matchingCase: "Case-sensitive",
  navigation: "Power Tools sections", tabEvents: "Events", tabExclusions: "Exclusions", tabColors: "Colors",
  manualFilter: "Filter by text", help: "How it works", pickHint: "Check events, then choose what to do.",
  clearFilter: "Clear filter", paused: "Filters paused", selectedName: "1 name", selectedNames: "{count} names",
  includeShort: "Include", excludeShort: "Exclude",
  open: "Open Tag Assistant Power Tools", close: "Close",
  counts: "{visible} visible · {hidden} hidden", dimmed: " · {dimmed} dimmed",
  resume: "Resume filtering", showAll: "Show all temporarily",
  countHint: "Counts cover events in the current list. Showing all pauses filters and exclusions in this tab until resumed or reloaded.",
  filter: "Filter events", filterAction: "Filter action",
  include: "Include matching events", exclude: "Exclude matching events",
  query: "Event name or pattern", queryPlaceholder: "e.g. purchase", matchMode: "Match mode",
  hide: "Hide filtered-out events (otherwise dim)",
  exclusions: "Saved exclusions", addExclusion: "+ Exclusion",
  exclusionHint: "Matching events are hidden, even with an empty filter. Names ignore letter case. Disable an exclusion to keep it for later.",
  noExclusions: "No saved exclusions yet.", colors: "Color rules", addRule: "+ Rule",
  enabled: "Enabled", ruleEnabled: "Enable color rule", color: "Rule color",
  deleteRule: "Delete rule", eventName: "Event name", deleteExclusion: "Delete exclusion",
  eventToExclude: "Event to exclude", exclusionPlaceholder: "e.g. scroll", exclusionMode: "Exclusion match mode",
  contains: "Contains", exact: "Exact", regex: "Regex",
  events: "Detected events", eventsHint: "Select event names to filter or save as exclusions. Hidden events are included in this list.",
  searchEvents: "Search this list", noEvents: "No events detected yet.", noResults: "No events match this search.",
  selected: "Selected: {count}", useFilter: "Show only selected", excludeSelected: "Exclude selected",
  clearSelection: "Clear selection", exactNames: "Selected event names",
  namesHint: "Selected names match exactly. The text field can further narrow the selection.",
  clearNames: "Clear names", removeName: "Remove {name}", occurrences: "Occurrences: {count}",
};

const pt: Record<keyof typeof en, string> = {
  madeBy: "Desenvolvido por", feedbackLink: "Sugestões? Vamos conversar no LinkedIn",
  linkedinLabel: "Bruno Aranda no LinkedIn — sugestões e feedback (abre em nova aba)",
  chooseColorEvent: "Escolher um evento detectado", typeColorEvent: "Digitar nome ou padrão",
  colorPickerHint: "Escolha um evento ou digite o nome se ele ainda não apareceu.",
  listSearchHint: "Esta busca só localiza nomes na lista.", matchingCase: "Diferencia maiúsculas e minúsculas",
  navigation: "Seções do Power Tools", tabEvents: "Eventos", tabExclusions: "Exclusões", tabColors: "Cores",
  manualFilter: "Filtrar por texto", help: "Como funciona", pickHint: "Marque os eventos e escolha uma ação.",
  clearFilter: "Limpar filtro", paused: "Filtros pausados", selectedName: "1 nome", selectedNames: "{count} nomes",
  includeShort: "Incluir", excludeShort: "Excluir",
  open: "Abrir Tag Assistant Power Tools", close: "Fechar",
  counts: "Visíveis: {visible} · Ocultos: {hidden}", dimmed: " · Atenuados: {dimmed}",
  resume: "Retomar filtros", showAll: "Mostrar todos temporariamente",
  countHint: "A contagem considera os eventos da lista atual. Mostrar todos pausa os filtros e exclusões nesta aba até você retomar ou recarregar a página.",
  filter: "Filtrar eventos", filterAction: "Ação do filtro",
  include: "Incluir eventos correspondentes", exclude: "Excluir eventos correspondentes",
  query: "Nome ou padrão do evento", queryPlaceholder: "Ex.: purchase", matchMode: "Tipo de correspondência",
  hide: "Ocultar eventos filtrados (senão, atenuar)",
  exclusions: "Exclusões salvas", addExclusion: "+ Exclusão",
  exclusionHint: "Os eventos correspondentes ficam ocultos, mesmo com o filtro vazio. Maiúsculas e minúsculas são equivalentes. Desative uma exclusão para guardá-la para depois.",
  noExclusions: "Nenhuma exclusão salva.", colors: "Regras de cores", addRule: "+ Regra",
  enabled: "Ativada", ruleEnabled: "Ativar regra de cor", color: "Cor da regra",
  deleteRule: "Excluir regra", eventName: "Nome do evento", deleteExclusion: "Excluir exclusão",
  eventToExclude: "Evento a excluir", exclusionPlaceholder: "Ex.: scroll", exclusionMode: "Correspondência da exclusão",
  contains: "Contém", exact: "Nome exato", regex: "Expressão regular",
  events: "Eventos detectados", eventsHint: "Selecione nomes para filtrar ou salvar como exclusões. Eventos ocultos também aparecem nesta lista.",
  searchEvents: "Buscar nesta lista", noEvents: "Nenhum evento detectado ainda.", noResults: "Nenhum evento encontrado nesta busca.",
  selected: "Selecionados: {count}", useFilter: "Mostrar somente selecionados", excludeSelected: "Excluir selecionados",
  clearSelection: "Limpar seleção", exactNames: "Nomes de eventos selecionados",
  namesHint: "Os nomes selecionados usam correspondência exata. O campo de texto pode refinar a seleção.",
  clearNames: "Limpar nomes", removeName: "Remover {name}", occurrences: "Ocorrências: {count}",
};

export function getMessages(language?: string) {
  const requested = language ?? globalThis.chrome?.i18n?.getUILanguage?.() ?? navigator.language;
  const locale = requested.toLowerCase().split(/[-_]/)[0] === "pt" ? "pt" : "en";
  return { locale, text: locale === "pt" ? pt : en };
}

export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}
