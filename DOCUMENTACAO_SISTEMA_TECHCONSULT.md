# Documentação Exaustiva: Sistema TechConsult AI

## 1. Visão Geral do Sistema
O **TechConsult AI** é uma plataforma integrada de engenharia diagnóstica projetada para automatizar e escalar a geração de laudos técnicos de vistoria. O sistema resolve o "gargalo" da redação técnica, permitindo que engenheiros gerenciem grandes volumes de dados coletados em campo com precisão pericial e conformidade normativa (ABNT).

---

## 2. Personas e Usuários
### 2.1 O Vistoriante (Campo)
*   **Papel:** Coleta de dados brutos.
*   **Ferramenta:** App Mobile.
*   **Responsabilidades:** Registrar evidências fotográficas, descrições de anomalias, áudios explicativos e dados quantitativos em planilhas estruturadas.
*   **Contexto:** Atua em obras de grande porte, vistorias de vizinhança ou perícias judiciais.

### 2.2 O Engenheiro Responsável (Escritório/Revisão do Perito)
*   **Papel:** Gestor técnico e curador da IA.
*   **Ferramenta:** Portal Web (TechConsult AI Report Generator).
*   **Responsabilidades:** Configurar o projeto, carregar normas técnicas, definir o tom de voz da IA e realizar a **Revisão do Perito** no laudo gerado.

### 2.3 O Administrador (SaaS)
*   **Papel:** Gestão da infraestrutura.
*   **Responsabilidades:** Controle de acessos, gestão de créditos de IA e manutenção das regras de comportamento globais do sistema.

---

## 3. Ecossistema de Aplicações
### 3.1 App Mobile (TechConsult Vistorias)
*   **URL de Acesso:** [https://app.fielddatacap.com](https://app.fielddatacap.com)
*   **Mobilidade Extrema:** Desenvolvido para funcionar em ambientes de obra com conectividade instável ou nula.
*   **Captura de Evidências:** Integração direta com câmera e microfone.
*   **Sincronização:** Os dados são salvos localmente (IndexedDB) e sincronizados com o Supabase quando há conexão.

### 3.2 Portal Web (Report Generator)
*   **URL de Acesso:** [https://app.fielddatacap.com](https://app.fielddatacap.com)
*   **Centro de Comando:** Onde o laudo é "fabricado".
*   **Gestão Híbrida de Arquivos:** Permite trabalhar com arquivos locais (upload imediato) ou arquivos de projetos salvos no servidor.
*   **Versatilidade:** Interface intuitiva que permite ao engenheiro alternar entre abas de geração e configuração de comportamento da IA.

### 3.3 Landing Page (Marketing e Vendas)
*   **URL Principal:** [https://fielddatacap.com](https://fielddatacap.com)
*   **Conversão:** Apresentação da proposta de valor (Produtividade 10x maior).
*   **SEO e Visibilidade:** Única página do ecossistema aberta para indexação do Google. Foco em autoridade e tecnologia.
*   **Identidade Visual:** Estilo Dark Premium com foco em autoridade e tecnologia.

---

## 4. O Coração Tecnológico: Módulo de IA (RAG)
O sistema utiliza a técnica de **RAG (Retrieval-Augmented Generation)** com o modelo **Gemini 2.0/1.5 Pro**.

### 4.1 Insumos da IA
1.  **Dados da Vistoria (Excel):** Planilhas com nomes de ambientes, descrições de danos e URLs de fotos (Supabase).
2.  **Laudos de Referência (Word):** Exemplos de laudos antigos do engenheiro para que a IA aprenda o estilo de escrita, formatação e vocabulário.
3.  **Fontes de Conhecimento (PDF/Docx):** Normas da ABNT, manuais de fabricantes e bibliografias técnicas.
4.  **Regras de Comportamento:** Instruções específicas (ex: "Nunca use a palavra 'ruim', use 'deteriorado'").

### 4.2 Fluxo de Automação
1.  **Extração:** O Backend (Python/Flask) extrai texto de todos os arquivos carregados.
2.  **Mapeamento de Mídia:** A IA recebe o contexto visual através de descrições e links de fotos, injetando os blocos de imagem no local correto do relatório.
3.  **Processamento Gemini:** O prompt combina as instruções de sistema, o conhecimento técnico e os dados de campo.
4.  **Reconstrução Docx:** O sistema reconstrói um arquivo `.docx` final, mantendo a identidade visual do template master (fontes, cores, cabeçalhos).

---

## 5. Gestão de Projetos e Histórico
### 5.1 Sistema de Pastas
Cada projeto possui uma estrutura rígida no servidor:
*   `/excel`: Planilhas de dados.
*   `/template`: Laudos de referência.
*   `/source`: Normas e manuais.
*   `/visual`: Template mestre de formatação.
*   `/reports`: **Histórico de Laudos Gerados** (Arquivamento timestamped).

### 5.2 Calculadora de Tokens
*   **Transparência:** Antes de gerar, o sistema calcula o volume de texto e imagens.
*   **Custo Estimado:** Informa ao engenheiro o custo exato em dólares da operação de IA, evitando surpresas na fatura da API.

---

## 6. Diferenciais Estratégicos
*   **Escalabilidade:** Capaz de processar vistorias de 1.000+ unidades habitacionais.
*   **Segurança Jurídica:** Ao basear-se em normas técnicas carregadas pelo usuário, o laudo reduz a margem de erro e questionamentos judiciais.
*   **Versatilidade de Dispositivos:** O fluxo flui do celular do vistoriante para o computador do engenheiro sem perda de informação.

---

## 7. Infraestrutura e Manutenção
*   **Servidor:** VPS dedicada (IP: `145.223.92.178`).
*   **Orquestração:** Coolify para gestão de containers.
*   **Conteinerização:** Docker multi-stage (Node 20+ para builds Vite).
*   **Domínios:** Gestão via Hostinger com redirecionamento HTTPS automático.
*   **Privacidade:** Política de `noindex` aplicada a todas as rotas internas (`/app`) para proteção de dados sensíveis dos laudos.

---
*Documento atualizado em 26/04/2026 para refletir a nova infraestrutura de domínios e nomenclatura pericial.*
