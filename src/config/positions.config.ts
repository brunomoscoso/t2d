export type PositionDefinition = {
  name: string;
  aliases: string[];
};

/**
 * Cola dos grupos do relatório.
 *
 * name: nome único que aparecerá no relatório.
 * aliases: nomes equivalentes encontrados no título ou nas labels.
 * Maiúsculas, acentos, espaços, colchetes, hífens e underscores são
 * normalizados: COCO PT também reconhece [COCO][PT] e COCO_PT.
 *
 * A ordem define a prioridade quando o texto contém mais de um nome.
 * Também define a ordem de exibição dos grupos no relatório.
 * SEM POSIÇÃO fica sempre por último, antes do dashboard.
 * Os tipos vêm antes dos locais para manter, por exemplo, todas as
 * execuções explicitamente COCO PT juntas, independentemente do local.
 * Não usar PT/SP isolados como aliases: o país não identifica o tipo.
 */
export const POSITIONS: PositionDefinition[] = [
  { name: 'COCO PT', aliases: ['COCO PT'] },
  { name: 'COCO SP', aliases: ['COCO SP'] },
  { name: 'Tangerina', aliases: ['Tangerina'] },
  { name: 'Olivais', aliases: ['Olivais'] },
  { name: 'Badajoz', aliases: ['Badajoz'] },
  { name: 'Pontes', aliases: ['Pontes'] },
  { name: 'Las Rosas', aliases: ['Las Rosas', 'Las Rozas'] },
  { name: 'Cyber', aliases: ['Cyber'] },
  { name: 'Marinas', aliases: ['Marinas'] },
  { name: 'Arco do Cego', aliases: ['Arco do Cego'] },
  { name: 'VMPOS - ALGRAGIDE', aliases: ['VMPOS - ALGRAGIDE'] },
  { name: 'VMPOS - OEIRAS', aliases: ['VMPOS - OEIRAS'] },
];
