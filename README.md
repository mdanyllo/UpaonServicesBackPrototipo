# Upaon Services – Backend

Backend da plataforma **Upaon Services**, que conecta clientes a prestadores de serviços locais.

## Sobre o projeto

O Upaon Services permite que usuários encontrem prestadores de serviços
filtrando por categoria, cidade e descrição do serviço.

Prestadores podem se cadastrar informando seus dados e área de atuação. 

Clientes solicitam os serviços pelo WhatsApp, deixando tudo mais simples.

Este repositório contém apenas o backend da aplicação.

---

##  Tecnologias utilizadas

- Node.js
- Express
- Prisma ORM
- PostgreSQL (Neon)
- Cloudinary (Armazenar as fotos de perfil dos usuários)
- Resend (Envio de códigos de autenticação por email)
- JWT (Autenticação)
- Bcrypt (Hash de senha)
- Render (Deploy)

---

## Rotas Auth

- POST /register

Inicia o cadastro de um usuário cliente ou prestador.

- POST /verify

Valida o código de verificação enviado por email e ativa a conta.

- POST /resend-code

Reenvia o código de verificação para o email do usuário.

- POST /forgot-password

Inicia o processo de recuperação de senha.

- POST /reset-password

Permite redefinir a senha após validação do código.

- POST /login

Autentica o usuário e retorna um token JWT de acesso válido por 7 dias.

---

## Rotas Categories

- /GET

Lista todas as categorias disponíveis na plataforma. Total de 12.

## Rotas Providers

- GET /

Lista prestadores com filtros opcionais por categoria e texto de busca.

- POST /:id/contact

Registra o contato de um cliente com um prestador.

- POST /:id/stats

Retorna estatísticas de contato de um prestador autenticado.

## Rotas Reviews

- POST /

Permite que um cliente avalie um prestador de 1 a 5 estrelas e adicione um comentário.

- GET /

Lista as avaliações de um prestador e sua média.

## Rota Stats

- GET /

Lista as estatísticas públicas da plataforma. quantidade de clientes, prestadores.

## Rota Users

- GET / 

Lista os usuários.

- PATCH /profile

editar o perfil do cliente e prestador. Carrega a foto de perfil para o Cloudinary.

- GET /:id/history

Retorna o histórico de serviços solicitados pelo usuário.






