import type { ContractIpMode, ContractTemplateType } from "@/db/schema";
import { formatCurrency, formatDate } from "@/lib/format";

export interface CompanyTemplateData {
  legalName?: string | null;
  tradeName?: string | null;
  cnpj?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  representativeName?: string | null;
  representativeCpf?: string | null;
  email?: string | null;
  phone?: string | null;
  pixKey?: string | null;
}

export interface ClientTemplateData {
  company: string;
  name: string;
  legalName?: string | null;
  document?: string | null;
  address?: string | null;
  representativeName?: string | null;
  representativeCpf?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface ContractDraftParams {
  contractNumber?: string;
  templateType: ContractTemplateType;
  ipMode: ContractIpMode;
  company: CompanyTemplateData;
  client: ClientTemplateData;
  projectName?: string | null;
  scope?: string | null;
  totalValue?: string | number | null;
  setupValue?: string | number | null;
  monthlyFee?: string | number | null;
  dueDay?: number;
  paymentMethod?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
}

function formatLongDatePtBr(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function buildStandardContractText(params: ContractDraftParams): string {
  const {
    templateType,
    ipMode,
    company,
    client,
    projectName,
    scope,
    totalValue,
    setupValue,
    monthlyFee,
    dueDay = 10,
    paymentMethod,
    startDate,
    dueDate,
  } = params;

  const contratadaRazao = company.legalName || company.tradeName || "ValeMind";
  const contratadaCnpj = company.cnpj || "[INSERIR CNPJ DA VALEMIND]";
  const contratadaEndereco =
    company.address || "[INSERIR ENDEREÇO DA CONTRATADA]";
  const contratadaRep =
    company.representativeName || "[NOME DO REPRESENTANTE LEGAL]";
  const contratadaRepCpf = company.representativeCpf || "[CPF DO REPRESENTANTE]";
  const foroCidade =
    company.city && company.state
      ? `${company.city}/${company.state}`
      : company.city || "[CIDADE/UF DA CONTRATADA]";

  const contratanteRazao = client.legalName || client.company;
  const contratanteDoc = client.document || "[INSERIR CNPJ/CPF DO CONTRATANTE]";
  const contratanteEndereco =
    client.address || "[INSERIR ENDEREÇO DO CONTRATANTE]";
  const contratanteRep = client.representativeName || client.name;
  const contratanteRepCpf =
    client.representativeCpf || "[CPF DO REPRESENTANTE DO CONTRATANTE]";

  const objetoLabel =
    templateType === "desenvolvimento"
      ? `desenvolvimento e implantação do projeto "${projectName || "Solução Digital"}"`
      : templateType === "manutencao"
        ? `prestação de serviços contínuos de suporte técnico, manutenção evolutiva/corretiva e acompanhamento operacional do projeto "${projectName || "Sistema em Operação"}"`
        : `desenvolvimento, implantação e manutenção mensal contínua do projeto "${projectName || "Solução Digital"}"`;

  const escopoDetalhado =
    scope?.trim() ||
    "Desenvolvimento, configuração, testes e entrega da solução digital conforme escopo técnico alinhado entre as partes.";

  const totalNum = Number(totalValue ?? 0);
  const setupNum = Number(setupValue ?? 0);
  const monthlyNum = Number(monthlyFee ?? 0);

  const linhasFinanceiras: string[] = [];
  if (totalNum > 0) {
    linhasFinanceiras.push(
      `a) Valor total do projeto / desenvolvimento: ${formatCurrency(totalNum)};`
    );
  }
  if (setupNum > 0) {
    linhasFinanceiras.push(
      `b) Valor de implantação / entrada: ${formatCurrency(setupNum)};`
    );
  }
  if (monthlyNum > 0) {
    linhasFinanceiras.push(
      `c) Mensalidade recorrente (suporte, manutenção e infraestrutura acordada): ${formatCurrency(monthlyNum)} por mês, com vencimento todo dia ${dueDay} de cada mês;`
    );
  }
  if (linhasFinanceiras.length === 0) {
    linhasFinanceiras.push(
      `a) Valores e condições comerciais conforme proposta comercial aprovada entre as partes.`
    );
  }

  const formaPagtoTexto = paymentMethod
    ? `Os pagamentos serão realizados preferencialmente via ${paymentMethod}${company.pixKey ? ` (Chave PIX / Dados: ${company.pixKey})` : ""}.`
    : `Os pagamentos serão realizados via PIX ou transferência bancária${company.pixKey ? ` (Chave PIX / Dados: ${company.pixKey})` : ""}.`;

  const clausulaPropriedade =
    ipMode === "cessao_apos_quitacao"
      ? `5.1. Nos termos da Lei nº 9.609/1998 (Lei do Software) e da Lei nº 9.610/1998 (Direitos Autorais), os direitos patrimoniais sobre o código-fonte e entregáveis desenvolvidos especificamente para este projeto serão cedidos ao CONTRATANTE somente após a quitação integral dos valores de desenvolvimento previstos neste instrumento.\n5.2. Bibliotecas de código aberto, frameworks de terceiros e componentes genéricos reutilizáveis de titularidade prévia da CONTRATADA permanecem sob suas respectivas licenças, sendo assegurado ao CONTRATANTE o direito de uso no projeto contratado.`
      : `5.1. Nos termos da Lei nº 9.609/1998 (Lei do Software), a CONTRATADA concede ao CONTRATANTE licença de uso não exclusiva, intransferível e vinculada à adimplência da mensalidade pactuada neste contrato.\n5.2. A titularidade do código-fonte, arquitetura e propriedade intelectual da plataforma permanece integralmente com a CONTRATADA, sendo vedada ao CONTRATANTE a engenharia reversa, cópia ou sublicenciamento a terceiros sem autorização expressa por escrito.`;

  const clausulaPrazo =
    templateType === "manutencao"
      ? `3.1. A prestação dos serviços terá início em ${startDate ? formatDate(startDate) : formatDate(new Date())}, vigorando por prazo indeterminado, podendo ser rescindida por qualquer das partes mediante aviso prévio por escrito com antecedência mínima de 30 (trinta) dias.`
      : `3.1. O desenvolvimento terá início em ${startDate ? formatDate(startDate) : formatDate(new Date())}, com previsão de entrega em ${dueDate ? formatDate(dueDate) : "prazo definido no cronograma técnico"}.\n3.2. Os prazos dependem do envio tempestivo pelo CONTRATANTE de materiais, acessos, aprovações e informações solicitadas pela CONTRATADA. Eventuais atrasos do CONTRATANTE prorrogarão automaticamente o cronograma na mesma proporção.${monthlyNum > 0 ? "\n3.3. A etapa de manutenção mensal vigorará por prazo indeterminado após a entrada em operação, podendo ser cancelada por qualquer das partes com aviso prévio de 30 (trinta) dias." : ""}`;

  const dataExtenso = formatLongDatePtBr(new Date());

  return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TECNOLOGIA E SOFTWARE

Pelo presente instrumento particular de prestação de serviços, de um lado:

CONTRATADA: ${contratadaRazao}, pessoa jurídica de direito privado inscrita no CNPJ sob o nº ${contratadaCnpj}, com sede em ${contratadaEndereco}, neste ato representada por ${contratadaRep}, inscrito(a) no CPF sob o nº ${contratadaRepCpf}${company.email ? `, e-mail ${company.email}` : ""};

e, de outro lado:

CONTRATANTE: ${contratanteRazao}, inscrito(a) no CNPJ/CPF sob o nº ${contratanteDoc}, com endereço em ${contratanteEndereco}, neste ato representado(a) por ${contratanteRep}, inscrito(a) no CPF sob o nº ${contratanteRepCpf}${client.email ? `, e-mail ${client.email}` : ""};

têm entre si justo e contratado o presente Contrato de Prestação de Serviços, regido pelas disposições do Código Civil Brasileiro (arts. 593 a 609), pela Lei nº 9.609/1998 (Lei do Software), pela Lei nº 13.709/2018 (LGPD) e demais normas aplicáveis, mediante as cláusulas e condições seguintes:

CLÁUSULA 1ª — DO OBJETO E ESCOPO
1.1. O presente contrato tem por objeto a ${objetoLabel}.
1.2. Escopo acordado:
${escopoDetalhado}
1.3. Quaisquer funcionalidades, integrações, páginas ou alterações que não estejam expressamente previstas no escopo acima serão consideradas demandas fora de escopo e dependerão de novo orçamento e aprovação prévia por escrito entre as partes.

CLÁUSULA 2ª — DAS OBRIGAÇÕES DAS PARTES
2.1. Compete à CONTRATADA executar os serviços com diligência técnica, boas práticas de engenharia de software, mantendo o CONTRATANTE informado sobre o andamento das entregas.
2.2. Compete ao CONTRATANTE fornecer informações verdadeiras, aprovações, acessos, credenciais e conteúdos necessários à execução do projeto, bem como efetuar os pagamentos nas datas acordadas.
2.3. Custos de serviços de terceiros (tais como domínios, servidores, APIs externas, gateways de pagamento ou planos pagos de nuvem), quando não expressamente incluídos na mensalidade, serão de responsabilidade direta do CONTRATANTE.

CLÁUSULA 3ª — DOS PRAZOS E VIGÊNCIA
${clausulaPrazo}

CLÁUSULA 4ª — DOS VALORES, PAGAMENTO E INADIMPLÊNCIA
4.1. Pelos serviços contratados, o CONTRATANTE pagará à CONTRATADA:
${linhasFinanceiras.join("\n")}
4.2. ${formaPagtoTexto}
4.3. O atraso no pagamento de qualquer parcela ou mensalidade sujeitará o valor devido a multa moratória de 2% (dois por cento) e juros de mora de 1% (um por cento) ao mês, calculados pro rata die.
4.4. Caso o atraso supere 10 (dez) dias corridos, a CONTRATADA poderá suspender temporariamente o andamento das entregas, o suporte técnico ou os serviços vinculados à mensalidade até a regularização financeira, sem que isso caracterize descumprimento contratual.
4.5. Valores recorrentes mensais poderão ser reajustados anualmente pela variação positiva do IPCA (IBGE) ou índice que venha a substituí-lo.

CLÁUSULA 5ª — DA PROPRIEDADE INTELECTUAL
${clausulaPropriedade}

CLÁUSULA 6ª — DA CONFIDENCIALIDADE E PROTEÇÃO DE DADOS (LGPD)
6.1. As partes comprometem-se a manter absoluto sigilo sobre informações estratégicas, comerciais, técnicas e credenciais de acesso trocadas em razão deste contrato.
6.2. As partes comprometem-se a cumprir a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD), atuando o CONTRATANTE como Controlador dos dados de seus clientes/usuários e a CONTRATADA como Operadora quando houver tratamento técnico necessário à execução do serviço.

CLÁUSULA 7ª — DA RESCISÃO
7.1. Em caso de rescisão antecipada imotivada pelo CONTRATANTE durante a fase de desenvolvimento, serão devidos todos os valores correspondentes às etapas já executadas e horas técnicas dedicadas até a data da comunicação formal, não havendo devolução de valores referentes a etapas já entregues.
7.2. O descumprimento grave de qualquer cláusula não sanado em até 10 (dez) dias após notificação por escrito autoriza a rescisão motivada pela parte prejudicada.

CLÁUSULA 8ª — DA AUSÊNCIA DE VÍNCULO EMPREGATÍCIO
8.1. A relação estabelecida neste contrato é estritamente comercial e civil entre pessoas jurídicas/autônomos, não gerando vínculo empregatício, societário, previdenciário ou trabalhista de qualquer natureza entre as partes.

CLÁUSULA 9ª — DA VALIDADE DA ASSINATURA ELETRÔNICA E DO FORO
9.1. As partes reconhecem a plena validade jurídica deste contrato firmado por meio de assinatura eletrônica ou digital, nos termos do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020.
9.2. Para dirimir quaisquer controvérsias oriundas deste contrato, as partes elegem o foro da Comarca de ${foroCidade}, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

E, por estarem justas e contratadas, firmam o presente instrumento em meio eletrônico ou físico para que produza seus efeitos legais.

${foroCidade}, ${dataExtenso}.


____________________________________________________
CONTRATADA: ${contratadaRazao}
CNPJ: ${contratadaCnpj}
Representante: ${contratadaRep}


____________________________________________________
CONTRATANTE: ${contratanteRazao}
CNPJ/CPF: ${contratanteDoc}
Representante: ${contratanteRep}`;
}
