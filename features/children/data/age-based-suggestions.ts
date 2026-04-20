import type { Task } from "@/features/tasks/types";

type SuggestionAgeGroupKey = "4-6" | "7-9" | "10-12" | "13-15" | "16-18";

export type SuggestionAgeGroup = {
  key: SuggestionAgeGroupKey;
  label: string;
  minAge: number | null;
  maxAge: number | null;
};

export type AgeBasedSuggestions = {
  ageGroup: SuggestionAgeGroup;
  bonus: string[];
  discount: string[];
  rewards: string[];
};

const AGE_GROUPS: SuggestionAgeGroup[] = [
  { key: "4-6", label: "4 a 6 anos", minAge: 4, maxAge: 6 },
  { key: "7-9", label: "7 a 9 anos", minAge: 7, maxAge: 9 },
  { key: "10-12", label: "10 a 12 anos", minAge: 10, maxAge: 12 },
  { key: "13-15", label: "13 a 15 anos", minAge: 13, maxAge: 15 },
  { key: "16-18", label: "16 a 18 anos", minAge: 16, maxAge: 18 }
];

const SUGGESTIONS_BY_AGE_GROUP: Record<SuggestionAgeGroupKey, Omit<AgeBasedSuggestions, "ageGroup">> = {
  "4-6": {
    bonus: [
      "Guardar todos os brinquedos no lugar apos brincar",
      "Escovar os dentes antes de dormir sem ser lembrado",
      "Levar o prato ate a pia apos as refeicoes",
      "Guardar os sapatos no lugar ao chegar em casa"
    ],
    discount: [
      "Deixar brinquedos no chao apos aviso",
      "Nao escovar os dentes no horario combinado",
      "Jogar brinquedos ou objetos no chao com forca",
      "Tirar sapatos e deixar no meio da casa"
    ],
    rewards: [
      "Escolher uma brincadeira com os pais",
      "Passeio no parquinho",
      "Hora extra de historinha",
      "Escolher o desenho do dia"
    ]
  },
  "7-9": {
    bonus: [
      "Arrumar a cama apos acordar",
      "Separar o material escolar antes de dormir",
      "Colocar roupa suja no cesto",
      "Ajudar a colocar a mesa para refeicoes"
    ],
    discount: [
      "Ir para a escola sem material necessario",
      "Deixar roupa suja fora do cesto",
      "Nao arrumar a cama apos combinado",
      "Levantar da mesa e deixar prato e copo"
    ],
    rewards: [
      "Passeio no parque com os pais",
      "Escolher o jantar da familia",
      "Sessao de cinema em casa",
      "Andar de bicicleta com os pais"
    ]
  },
  "10-12": {
    bonus: [
      "Organizar o quarto (cama, objetos e lixo)",
      "Fazer tarefa escolar antes do horario de lazer",
      "Lavar a propria louca apos comer",
      "Separar roupa para o dia seguinte"
    ],
    discount: [
      "Nao fazer tarefa escolar no dia combinado",
      "Usar celular ou TV antes de terminar deveres",
      "Deixar louca suja na pia apos comer",
      "Deixar lixo acumulado no quarto"
    ],
    rewards: [
      "Ir a uma sorveteria com os pais",
      "Convidar um amigo para uma atividade",
      "Escolher um passeio do fim de semana",
      "Tempo especial de jogo com os pais"
    ]
  },
  "13-15": {
    bonus: [
      "Lavar louca de uma refeicao completa",
      "Preparar um lanche simples sozinho",
      "Organizar mochila e materiais da semana",
      "Cumprir horario de estudo combinado"
    ],
    discount: [
      "Nao lavar a louca quando for sua vez",
      "Nao iniciar estudo no horario combinado",
      "Chegar em casa apos o horario definido",
      "Usar celular durante horario de estudo"
    ],
    rewards: [
      "Escolher uma saida em familia",
      "Noite especial com pizza e filme",
      "Tempo extra para atividade favorita",
      "Passeio com um amigo autorizado"
    ]
  },
  "16-18": {
    bonus: [
      "Fazer lista de compras e conferir itens",
      "Preparar uma refeicao simples completa",
      "Lavar e guardar a propria roupa",
      "Organizar compromissos da semana (estudo/trabalho)"
    ],
    discount: [
      "Nao comparecer a compromisso combinado",
      "Nao lavar a propria roupa na semana",
      "Nao cumprir tarefa domestica definida (ex: nao tirar lixo no dia combinado)",
      "Gastar toda a mesada antes do periodo combinado"
    ],
    rewards: [
      "Escolher um programa especial no fim de semana",
      "Experiencia em familia fora de casa",
      "Tempo extra para atividade favorita",
      "Escolher um jantar especial com a familia"
    ]
  }
};

export function getAgeBasedSuggestions(age: number | null): AgeBasedSuggestions | null {
  const ageGroup = AGE_GROUPS.find(
    (group) => age != null && group.minAge != null && group.maxAge != null && age >= group.minAge && age <= group.maxAge
  );

  if (!ageGroup) {
    return null;
  }

  return {
    ageGroup,
    ...SUGGESTIONS_BY_AGE_GROUP[ageGroup.key]
  };
}

export function getTaskSuggestionsByAge(age: number | null, type: Task["type"]) {
  const suggestions = getAgeBasedSuggestions(age);
  if (!suggestions) {
    return [];
  }

  return type === "bonus" ? suggestions.bonus : suggestions.discount;
}