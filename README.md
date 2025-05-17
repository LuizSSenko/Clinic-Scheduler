# Sistema de agendamento online de consultas

*Sincronizado automaticamente com suas implantações no [v0.dev](https://v0.dev)*

[![Implantado no Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/luizssenkos-projects/v0-clinic)  
[![Construído com v0.dev](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/xAmHtHdjjnf)

Um sistema moderno e completo de agendamento de consultas para clínicas de saúde, construído com Next.js e React.

## Descrição do Projeto

Clinic Scheduler é uma aplicação web completa projetada para otimizar o processo de agendamento de consultas em clínicas de saúde. Ela oferece uma interface intuitiva para os pacientes marcarem consultas e um painel administrativo poderoso para a equipe da clínica gerenciar agendamentos, bloquear períodos e configurar as definições da clínica.

O sistema gerencia de forma inteligente a disponibilidade de consultas com base no horário de funcionamento da clínica, intervalos para almoço, períodos bloqueados e número máximo de consultas simultâneas. Também oferece suporte a múltiplos idiomas, tornando-o acessível a uma base diversa de pacientes.

## Tecnologias Utilizadas

- **Frontend**:

- Next.js 14 (App Router)  
- React 18  
- Tailwind CSS  
- shadcn/ui components  
- React Hook Form  
- Zod (validação de formulários)  
- date-fns (manipulação de datas)  

- **Backend**:

- Next.js Server Actions  
- Vercel KV (banco de dados Redis)  
- Mailgun API (notificações por e-mail)  

- **Deployment**:

- Vercel  

- **Outros**:

- TypeScript  
- Lucide React (ícones)  
- i18n (internacionalização)  

## Funcionalidades

### Portal do Paciente

#### Agendamento de Consultas

- **Seleção de Data**: Interface de calendário interativa para selecionar datas de consulta  
- **Gerenciamento de Horários**: Exibição dinâmica de horários disponíveis conforme configurações da clínica  
- **Disponibilidade Inteligente**: Oculta automaticamente horários passados, períodos bloqueados e vagas esgotadas  
- **Consultas de Emergência**: Opção para marcar consultas como emergência com detalhes adicionais  
- **Sistema de Confirmação**: Notificações por e-mail enviadas aos pacientes após o agendamento  

#### Experiência do Usuário

- **Suporte a Múltiplos Idiomas**: Alternar entre Inglês e Português (Brasil)  
- **Design Responsivo**: Interface totalmente responsiva que funciona em dispositivos móveis, tablets e desktops  
- **Validação em Tempo Real**: Feedback imediato nos campos do formulário e na disponibilidade  
- **Acessibilidade**: Desenvolvido com foco em acessibilidade, incluindo navegação por teclado e suporte a leitores de tela  

### Painel Administrativo

#### Gerenciamento de Consultas

- **Visão Geral de Consultas**: Exibe todas as consultas agendadas com filtro por data  
- **Detalhes da Consulta**: Acesso a informações detalhadas de cada consulta  
- **Exclusão de Consulta**: Cancela consultas quando necessário  

#### Configurações da Clínica

- **Horário de Funcionamento**: Configurar horários de abertura e fechamento da clínica  
- **Intervalo para Almoço**: Definir períodos de intervalo para almoço em que não é possível agendar consultas  
- **Consultas Simultâneas**: Definir quantas consultas podem ser agendadas ao mesmo tempo  

#### Bloqueio de Horários

- **Bloquear Períodos**: Impedir agendamentos durante períodos específicos  
- **Gerenciamento de Bloqueios**: Visualizar e excluir períodos bloqueados  

## Instalação

### Pré-requisitos

- Node.js 18.x ou superior  
- npm ou yarn  
- Conta Vercel (para banco de dados KV)  
- Conta Mailgun (para notificações por e-mail)  

### Instruções de Configuração

1. Clone o repositório:

   ```shell
   git clone https://github.com/yourusername/clinic-scheduler.git
   cd clinic-scheduler
   ```

2. Instale as dependências:

   ```shell
   npm install
   # ou
   yarn install
   ```

3. Configure as variáveis de ambiente:  
   Crie um arquivo `.env.local` no diretório raiz com as seguintes variáveis:

   ```plaintext
   KV_URL=your_vercel_kv_url
   KV_REST_API_TOKEN=your_vercel_kv_token
   KV_REST_API_READ_ONLY_TOKEN=your_vercel_kv_readonly_token
   MAILGUN_API_KEY=your_mailgun_api_key
   MAILGUN_DOMAIN=your_mailgun_domain
   MAILGUN_FROM=your_sender_email
   ```

4. Execute o servidor de desenvolvimento:

   ```shell
   npm run dev
   # ou
   yarn dev
   ```

5. Abra [http://localhost:3000](http://localhost:3000) no seu navegador para ver a aplicação.

## Uso

### Para Pacientes

1. **Agendando uma Consulta**:

1. Acesse a página inicial  
2. Preencha seu nome e e-mail  
3. Selecione uma data no calendário  
4. Escolha um horário disponível  
5. Ative a opção de emergência, se for o caso  
6. Informe detalhes da emergência, se aplicável  
7. Clique em "Agendar Consulta"  

2. **Alterando o Idioma**:

1. Clique nos ícones de bandeira de idioma no cabeçalho  
2. Escolha entre Inglês (EUA) e Português (Brasil)  

### Para a Equipe da Clínica

1. **Acessando o Painel Administrativo**:

1. Acesse `/admin`  
2. Use as abas para alternar entre consultas e configurações  

2. **Gerenciando Consultas**:

1. Visualize todas as consultas na aba de Consultas  
2. Filtre as consultas selecionando uma data no calendário  
3. Clique em uma consulta para ver os detalhes  
4. Exclua consultas usando o botão de exclusão  

3. **Configurando as Configurações da Clínica**:

1. Acesse a aba de Configurações  
2. Defina o horário de funcionamento, intervalo para almoço e número máximo de consultas simultâneas  
3. Salve as alterações  

4. **Bloqueando Períodos de Tempo**:

1. Na aba de Configurações, role até a seção de Bloqueio de Horários  
2. Selecione uma data, hora de início, hora de término e forneça um motivo  
3. Clique em "Bloquear Horário"  
4. Visualize e gerencie os horários bloqueados na lista abaixo  

## Configuração

### Variáveis de Ambiente

| Variável                         | Descrição                                      | Obrigatório |
|----------------------------------|------------------------------------------------|-------------|
| `KV_URL`                         | URL do banco de dados Vercel KV                | Sim         |
| `KV_REST_API_TOKEN`              | Token de acesso de escrita do Vercel KV        | Sim         |
| `KV_REST_API_READ_ONLY_TOKEN`    | Token de acesso somente leitura do Vercel KV   | Sim         |
| `MAILGUN_API_KEY`                | Chave de API do Mailgun para envio de e-mails  | Sim         |
| `MAILGUN_DOMAIN`                 | Domínio do Mailgun                             | Sim         |
| `MAILGUN_FROM`                   | Endereço de e-mail remetente                   | Sim         |

### Configurações da Clínica

As seguintes configurações podem ser feitas pelo painel administrativo:

- **Horário de Funcionamento**: Definir horários de abertura e fechamento da clínica  
- **Intervalo para Almoço**: Habilitar/desabilitar o intervalo para almoço e definir sua duração  
- **Número Máximo de Consultas Simultâneas**: Definir quantas consultas podem ser agendadas ao mesmo tempo  

## Referência da API

A aplicação usa Server Actions do Next.js para funcionalidades de API. Aqui estão as principais ações:

### Ações de Consulta

- `createAppointment(formData)`: Cria uma nova consulta  
- `getAppointments()`: Recupera todas as consultas  
- `deleteAppointment(id)`: Exclui uma consulta pelo ID  

### Ações de Bloqueio de Horário

- `createBlockedTime(formData)`: Cria um novo período bloqueado  
- `getBlockedTimes()`: Recupera todos os períodos bloqueados  
- `deleteBlockedTime(id)`: Exclui um período bloqueado pelo ID  

### Ações de Configuração da Clínica

- `getClinicSettings()`: Recupera as configurações da clínica  
- `updateClinicSettings(formData)`: Atualiza as configurações da clínica  

### Ações de Horários Disponíveis

- `getAvailableTimeSlots(date)`: Recupera os horários disponíveis para uma data específica  

## Contribuindo

Contribuições são bem-vindas! Por favor, siga estes passos para contribuir:

1. Faça um fork do repositório  
2. Crie uma nova branch (`git checkout -b feature/amazing-feature`)  
3. Faça suas alterações  
4. Faça o commit das suas alterações (`git commit -m 'Add some amazing feature'`)  
5. Faça o push para a branch (`git push origin feature/amazing-feature`)  
6. Abra um Pull Request  

### Diretrizes de Estilo de Código

- Siga o estilo de código existente  
- Use TypeScript para segurança de tipos  
- Escreva mensagens de commit significativas  
- Adicione comentários para lógicas complexas  
- Atualize a documentação quando necessário  

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## Agradecimentos

- [Next.js](https://nextjs.org/) - O framework React para produção  
- [Vercel](https://vercel.com/) - Para hospedagem e banco de dados KV  
- [shadcn/ui](https://ui.shadcn.com/) - Para componentes de UI elegantes  
- [Tailwind CSS](https://tailwindcss.com/) - Para CSS utilitário  
- [Mailgun](https://www.mailgun.com/) - Para serviços de e-mail  
- [date-fns](https://date-fns.org/) - Para manipulação de datas  
- [Lucide React](https://lucide.dev/) - Para ícones  

## Capturas de Tela

### Portal do Paciente
![image](https://github.com/user-attachments/assets/e7ce1736-7e78-48eb-91ce-766f8a55fc18)

### Agendamento de Consultas
![image](https://github.com/user-attachments/assets/58baf2a7-c2ad-4be5-b886-2171d81f2edd)

### Painel Administrativo
![image](https://github.com/user-attachments/assets/048a04b6-d085-449a-b103-f7c0593dcdc4)

### Configurações da Clínica
![image](https://github.com/user-attachments/assets/4ea84bf3-3e9b-43bb-8216-e57e635608b7)

![image](https://github.com/user-attachments/assets/fe667286-48c1-4390-a0f0-00ef6b6bb3b8)


---

Feito com ❤️ para melhorar o agendamento na área da saúde
