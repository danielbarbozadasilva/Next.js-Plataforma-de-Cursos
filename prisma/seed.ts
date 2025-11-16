import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar categorias
  console.log('📚 Criando categorias...');
  const categorias = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'programacao' },
      update: {},
      create: {
        name: 'Programação',
        slug: 'programacao',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'design' },
      update: {},
      create: {
        name: 'Design',
        slug: 'design',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'marketing' },
      update: {},
      create: {
        name: 'Marketing',
        slug: 'marketing',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'negocios' },
      update: {},
      create: {
        name: 'Negócios',
        slug: 'negocios',
      },
    }),
  ]);

  console.log(`✅ ${categorias.length} categorias criadas`);

  // Criar usuário admin
  console.log('👤 Criando usuário administrador...');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@plataforma.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@plataforma.com',
      passwordHash: '$2a$10$YourHashedPasswordHere', // Lembre-se de usar bcrypt na produção
      role: 'ADMIN',
    },
  });

  console.log('✅ Usuário administrador criado');

  // Criar usuário instrutor
  console.log('👨‍🏫 Criando usuário instrutor...');
  const instrutor = await prisma.user.upsert({
    where: { email: 'instrutor@plataforma.com' },
    update: {},
    create: {
      name: 'João Silva',
      email: 'instrutor@plataforma.com',
      passwordHash: '$2a$10$YourHashedPasswordHere',
      role: 'INSTRUCTOR',
      instructorProfile: {
        create: {
          bio: 'Desenvolvedor Full Stack com 10 anos de experiência',
          websiteUrl: 'https://joaosilva.dev',
          balance: 0,
        },
      },
    },
  });

  console.log('✅ Usuário instrutor criado');

  // Criar usuário aluno
  console.log('🎓 Criando usuário aluno...');
  const aluno = await prisma.user.upsert({
    where: { email: 'aluno@plataforma.com' },
    update: {},
    create: {
      name: 'Maria Santos',
      email: 'aluno@plataforma.com',
      passwordHash: '$2a$10$YourHashedPasswordHere',
      role: 'STUDENT',
    },
  });

  console.log('✅ Usuário aluno criado');

  // Criar curso de exemplo
  console.log('📖 Criando curso de exemplo...');
  const curso = await prisma.course.create({
    data: {
      title: 'Desenvolvimento Web Completo com Next.js',
      description: 'Aprenda a criar aplicações web modernas com Next.js, React, TypeScript e muito mais!',
      price: 299.99,
      isPublished: true,
      level: 'INTERMEDIATE',
      language: 'pt-br',
      instructorId: instrutor.id,
      categoryId: categorias[0].id, // Programação
      requirements: {
        create: [
          { text: 'Conhecimento básico de JavaScript' },
          { text: 'Familiaridade com HTML e CSS' },
        ],
      },
      learnObjectives: {
        create: [
          { text: 'Criar aplicações full-stack com Next.js' },
          { text: 'Implementar autenticação e autorização' },
          { text: 'Trabalhar com banco de dados usando Prisma' },
          { text: 'Deploy de aplicações em produção' },
        ],
      },
      sections: {
        create: [
          {
            title: 'Introdução ao Next.js',
            order: 1,
            lessons: {
              create: [
                {
                  title: 'Bem-vindo ao curso',
                  order: 1,
                  isFreePreview: true,
                  videoData: {
                    create: {
                      duration: 300,
                      processingStatus: 'SUCCESS',
                    },
                  },
                },
                {
                  title: 'Configurando o ambiente de desenvolvimento',
                  order: 2,
                  isFreePreview: true,
                  textContent: {
                    create: {
                      content: '# Configurando o Ambiente\n\nNesta aula você aprenderá a configurar seu ambiente...',
                    },
                  },
                },
              ],
            },
          },
          {
            title: 'Fundamentos do React',
            order: 2,
            lessons: {
              create: [
                {
                  title: 'Componentes e Props',
                  order: 1,
                  videoData: {
                    create: {
                      duration: 600,
                      processingStatus: 'SUCCESS',
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('✅ Curso criado');

  // Criar matrícula de exemplo
  console.log('📝 Criando matrícula de exemplo...');
  await prisma.enrollment.create({
    data: {
      userId: aluno.id,
      courseId: curso.id,
    },
  });

  console.log('✅ Matrícula criada');

  // Criar review de exemplo
  console.log('⭐ Criando avaliação de exemplo...');
  await prisma.review.create({
    data: {
      rating: 5,
      comment: 'Excelente curso! Aprendi muito sobre Next.js.',
      userId: aluno.id,
      courseId: curso.id,
    },
  });

  console.log('✅ Avaliação criada');

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('\n📊 Dados criados:');
  console.log(`- ${categorias.length} categorias`);
  console.log('- 3 usuários (1 admin, 1 instrutor, 1 aluno)');
  console.log('- 1 curso com 2 seções e 3 aulas');
  console.log('- 1 matrícula');
  console.log('- 1 avaliação');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
