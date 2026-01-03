import * as db from "../server/db";

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // Create devotional plan for 2026
    console.log("Creating devotional plan...");
    await db.seedDevotionalPlan({
      name: "Plano Devocional 2026",
      year: 2026,
      description: "Plano anual de leitura bíblica e devocional para adolescentes",
      isActive: true,
    });

    // Create devotional days for the first week of 2026 (Jan 1-7)
    console.log("Creating devotional days...");
    const devotionalDays = [
      {
        planId: 1,
        dayNumber: 1,
        date: "2026-01-01",
        bibleReference: "Gênesis 1",
        devotionalText:
          "No princípio, Deus criou os céus e a terra. Assim como Deus trouxe ordem ao caos, Ele pode trazer ordem à sua vida. Confie nEle para guiá-lo em cada novo começo.",
        reflectionQuestion: "Como você pode permitir que Deus traga ordem às áreas caóticas da sua vida?",
      },
      {
        planId: 1,
        dayNumber: 2,
        date: "2026-01-02",
        bibleReference: "Gênesis 2",
        devotionalText:
          "Deus descansou no sétimo dia. O descanso não é preguiça, mas uma confiança de que Deus está no controle. Reserve tempo para descansar e renovar suas forças.",
        reflectionQuestion: "Você tem reservado tempo para descansar e se conectar com Deus?",
      },
      {
        planId: 1,
        dayNumber: 3,
        date: "2026-01-03",
        bibleReference: "Salmos 1",
        devotionalText:
          "Bem-aventurado o homem que não anda segundo o conselho dos ímpios. Escolha suas amizades com sabedoria e busque conselho na Palavra de Deus.",
        reflectionQuestion: "Quem são as pessoas que influenciam suas decisões? Elas te aproximam de Deus?",
      },
      {
        planId: 1,
        dayNumber: 4,
        date: "2026-01-04",
        bibleReference: "Provérbios 3:5-6",
        devotionalText:
          "Confie no Senhor de todo o seu coração. Quando você confia em Deus, Ele dirige seus caminhos. Não dependa apenas da sua própria compreensão.",
        reflectionQuestion: "Em que área da sua vida você precisa confiar mais em Deus?",
      },
      {
        planId: 1,
        dayNumber: 5,
        date: "2026-01-05",
        bibleReference: "Mateus 5:1-12",
        devotionalText:
          "As bem-aventuranças mostram que os valores do Reino de Deus são diferentes dos valores do mundo. Ser humilde, misericordioso e pacificador é o caminho de Jesus.",
        reflectionQuestion: "Qual bem-aventurança você mais precisa praticar hoje?",
      },
      {
        planId: 1,
        dayNumber: 6,
        date: "2026-01-06",
        bibleReference: "Mateus 6:25-34",
        devotionalText:
          "Não se preocupe com o amanhã. Deus cuida dos pássaros e das flores, e Ele cuidará muito mais de você. Busque primeiro o Reino de Deus.",
        reflectionQuestion: "O que você está preocupado hoje? Como você pode entregar isso a Deus?",
      },
      {
        planId: 1,
        dayNumber: 7,
        date: "2026-01-07",
        bibleReference: "João 3:16",
        devotionalText:
          "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito. O amor de Deus por você é tão grande que Ele deu o melhor que tinha: Jesus.",
        reflectionQuestion: "Como você pode compartilhar o amor de Deus com alguém hoje?",
      },
    ];

    for (const day of devotionalDays) {
      await db.seedDevotionalDay(day as any);
    }

    // Create challenges for each devotional day
    console.log("Creating challenges...");
    for (let dayId = 1; dayId <= 7; dayId++) {
      // Reading challenge
      await db.seedChallenge({
        devotionalDayId: dayId,
        type: "READING",
        title: "Ler o texto bíblico",
        description: "Leia a passagem bíblica do dia com atenção",
        baseXp: 10,
        baseDenario: 5,
      });

      // Devotional challenge
      await db.seedChallenge({
        devotionalDayId: dayId,
        type: "DEVOTIONAL",
        title: "Ler o devocional",
        description: "Reflita sobre o devocional do dia",
        baseXp: 15,
        baseDenario: 7,
      });

      // Reflection challenge
      await db.seedChallenge({
        devotionalDayId: dayId,
        type: "REFLECTION",
        title: "Responder à reflexão",
        description: "Pense na pergunta de reflexão e aplique à sua vida",
        baseXp: 20,
        baseDenario: 10,
      });
    }

    // Create shop items
    console.log("Creating shop items...");
    const shopItems = [
      // Backgrounds
      {
        name: "Céu Estrelado",
        type: "BACKGROUND" as const,
        rarity: "COMMON" as const,
        imageUrl: null,
        priceDenario: 50,
        description: "Um lindo céu noturno cheio de estrelas",
        isAvailable: true,
      },
      {
        name: "Pôr do Sol",
        type: "BACKGROUND" as const,
        rarity: "COMMON" as const,
        imageUrl: null,
        priceDenario: 50,
        description: "Um belo pôr do sol alaranjado",
        isAvailable: true,
      },
      {
        name: "Floresta Mágica",
        type: "BACKGROUND" as const,
        rarity: "RARE" as const,
        imageUrl: null,
        priceDenario: 150,
        description: "Uma floresta encantada com luzes místicas",
        isAvailable: true,
      },
      {
        name: "Aurora Boreal",
        type: "BACKGROUND" as const,
        rarity: "EPIC" as const,
        imageUrl: null,
        priceDenario: 300,
        description: "As luzes dançantes da aurora boreal",
        isAvailable: true,
      },
      // Clothes
      {
        name: "Camiseta Básica",
        type: "CLOTHES" as const,
        rarity: "COMMON" as const,
        imageUrl: null,
        priceDenario: 30,
        description: "Uma camiseta simples e confortável",
        isAvailable: true,
      },
      {
        name: "Jaqueta Jeans",
        type: "CLOTHES" as const,
        rarity: "RARE" as const,
        imageUrl: null,
        priceDenario: 100,
        description: "Uma jaqueta jeans estilosa",
        isAvailable: true,
      },
      {
        name: "Armadura de Luz",
        type: "CLOTHES" as const,
        rarity: "EPIC" as const,
        imageUrl: null,
        priceDenario: 250,
        description: "A armadura espiritual de Efésios 6",
        isAvailable: true,
      },
      // Accessories
      {
        name: "Óculos de Sol",
        type: "ACCESSORY" as const,
        rarity: "COMMON" as const,
        imageUrl: null,
        priceDenario: 40,
        description: "Óculos de sol modernos",
        isAvailable: true,
      },
      {
        name: "Coroa Simples",
        type: "ACCESSORY" as const,
        rarity: "RARE" as const,
        imageUrl: null,
        priceDenario: 120,
        description: "Uma coroa elegante",
        isAvailable: true,
      },
      {
        name: "Auréola Brilhante",
        type: "ACCESSORY" as const,
        rarity: "EPIC" as const,
        imageUrl: null,
        priceDenario: 280,
        description: "Uma auréola dourada e brilhante",
        isAvailable: true,
      },
    ];

    for (const item of shopItems) {
      await db.seedShopItem(item);
    }

    // Create ranking periods
    console.log("Creating ranking periods...");
    
    // Monthly period for January 2026
    await db.seedRankingPeriod({
      periodType: "MONTH",
      startDate: "2026-01-01" as any,
      endDate: "2026-01-31" as any,
      isActive: true,
    });

    // Yearly period for 2026
    await db.seedRankingPeriod({
      periodType: "YEAR",
      startDate: "2026-01-01" as any,
      endDate: "2026-12-31" as any,
      isActive: true,
    });

    // Create sample groups
    console.log("Creating sample groups...");
    await db.createGroup({
      name: "Célula Jovens da Paz",
      description: "Grupo de jovens focado em estudos bíblicos e comunhão",
      leaderId: 1,
      memberCount: 0,
      totalPoints: 0,
    });

    await db.createGroup({
      name: "Guerreiros de Cristo",
      description: "Grupo de adolescentes comprometidos com a oração e evangelismo",
      leaderId: 1,
      memberCount: 0,
      totalPoints: 0,
    });

    await db.createGroup({
      name: "Luz do Mundo",
      description: "Célula dedicada a servir a comunidade e espalhar o amor de Cristo",
      leaderId: 1,
      memberCount: 0,
      totalPoints: 0,
    });

    await db.createGroup({
      name: "Fé e Ação",
      description: "Grupo que une estudo da palavra com ações práticas de fé",
      leaderId: 1,
      memberCount: 0,
      totalPoints: 0,
    });

    await db.createGroup({
      name: "Nova Geração",
      description: "Jovens transformando o mundo através do evangelho",
      leaderId: 1,
      memberCount: 0,
      totalPoints: 0,
    });

    console.log("✅ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("Seed completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
