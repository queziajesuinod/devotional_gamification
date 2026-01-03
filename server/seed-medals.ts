import { getDb } from "./db";
import { medals } from "../drizzle/schema";

/**
 * Seed medals data
 * Categories:
 * - BIBLE_BOOK: Complete reading specific Bible books
 * - STREAK: Consecutive days achievements
 * - MILESTONE: Total devotionals/challenges completed
 * - SPECIAL: Unique achievements
 */

const medalData = [
  // ============================================
  // BIBLE BOOK MEDALS (Novo Testamento)
  // ============================================
  {
    name: "Mateus Completo",
    description: "Complete a leitura do Evangelho de Mateus (28 capítulos)",
    category: "BIBLE_BOOK" as const,
    iconEmoji: "📖",
    requirement: JSON.stringify({ type: "book", bookName: "Mateus", chapters: 28 }),
    order: 1,
  },
  {
    name: "Marcos Completo",
    description: "Complete a leitura do Evangelho de Marcos (16 capítulos)",
    category: "BIBLE_BOOK" as const,
    iconEmoji: "📕",
    requirement: JSON.stringify({ type: "book", bookName: "Marcos", chapters: 16 }),
    order: 2,
  },
  {
    name: "Lucas Completo",
    description: "Complete a leitura do Evangelho de Lucas (24 capítulos)",
    category: "BIBLE_BOOK" as const,
    iconEmoji: "📗",
    requirement: JSON.stringify({ type: "book", bookName: "Lucas", chapters: 24 }),
    order: 3,
  },
  {
    name: "João Completo",
    description: "Complete a leitura do Evangelho de João (21 capítulos)",
    category: "BIBLE_BOOK" as const,
    iconEmoji: "📘",
    requirement: JSON.stringify({ type: "book", bookName: "João", chapters: 21 }),
    order: 4,
  },
  {
    name: "Atos Completo",
    description: "Complete a leitura do livro de Atos (28 capítulos)",
    category: "BIBLE_BOOK" as const,
    iconEmoji: "🔥",
    requirement: JSON.stringify({ type: "book", bookName: "Atos", chapters: 28 }),
    order: 5,
  },
  {
    name: "Romanos Completo",
    description: "Complete a leitura da carta aos Romanos (16 capítulos)",
    category: "BIBLE_BOOK" as const,
    iconEmoji: "✉️",
    requirement: JSON.stringify({ type: "book", bookName: "Romanos", chapters: 16 }),
    order: 6,
  },
  {
    name: "Salmos Completo",
    description: "Complete a leitura do livro de Salmos (150 capítulos)",
    category: "BIBLE_BOOK" as const,
    iconEmoji: "🎵",
    requirement: JSON.stringify({ type: "book", bookName: "Salmos", chapters: 150 }),
    order: 7,
  },
  {
    name: "Provérbios Completo",
    description: "Complete a leitura do livro de Provérbios (31 capítulos)",
    category: "BIBLE_BOOK" as const,
    iconEmoji: "💡",
    requirement: JSON.stringify({ type: "book", bookName: "Provérbios", chapters: 31 }),
    order: 8,
  },
  {
    name: "Gênesis Completo",
    description: "Complete a leitura do livro de Gênesis (50 capítulos)",
    category: "BIBLE_BOOK" as const,
    iconEmoji: "🌍",
    requirement: JSON.stringify({ type: "book", bookName: "Gênesis", chapters: 50 }),
    order: 9,
  },
  {
    name: "Apocalipse Completo",
    description: "Complete a leitura do livro de Apocalipse (22 capítulos)",
    category: "BIBLE_BOOK" as const,
    iconEmoji: "👑",
    requirement: JSON.stringify({ type: "book", bookName: "Apocalipse", chapters: 22 }),
    order: 10,
  },

  // ============================================
  // STREAK MEDALS
  // ============================================
  {
    name: "Primeira Semana",
    description: "Complete 7 dias consecutivos de devocionais",
    category: "STREAK" as const,
    iconEmoji: "🔥",
    requirement: JSON.stringify({ type: "streak", days: 7 }),
    order: 1,
  },
  {
    name: "Mês Fiel",
    description: "Complete 30 dias consecutivos de devocionais",
    category: "STREAK" as const,
    iconEmoji: "⭐",
    requirement: JSON.stringify({ type: "streak", days: 30 }),
    order: 2,
  },
  {
    name: "Guerreiro da Fé",
    description: "Complete 100 dias consecutivos de devocionais",
    category: "STREAK" as const,
    iconEmoji: "🛡️",
    requirement: JSON.stringify({ type: "streak", days: 100 }),
    order: 3,
  },
  {
    name: "Ano de Vitória",
    description: "Complete 365 dias consecutivos de devocionais",
    category: "STREAK" as const,
    iconEmoji: "👑",
    requirement: JSON.stringify({ type: "streak", days: 365 }),
    order: 4,
  },

  // ============================================
  // MILESTONE MEDALS
  // ============================================
  {
    name: "Primeiros Passos",
    description: "Complete 10 devocionais (não precisam ser consecutivos)",
    category: "MILESTONE" as const,
    iconEmoji: "👣",
    requirement: JSON.stringify({ type: "total_devotionals", count: 10 }),
    order: 1,
  },
  {
    name: "Dedicado",
    description: "Complete 50 devocionais (não precisam ser consecutivos)",
    category: "MILESTONE" as const,
    iconEmoji: "📚",
    requirement: JSON.stringify({ type: "total_devotionals", count: 50 }),
    order: 2,
  },
  {
    name: "Campeão",
    description: "Complete 100 devocionais (não precisam ser consecutivos)",
    category: "MILESTONE" as const,
    iconEmoji: "🏆",
    requirement: JSON.stringify({ type: "total_devotionals", count: 100 }),
    order: 3,
  },
  {
    name: "Lenda",
    description: "Complete 365 devocionais (não precisam ser consecutivos)",
    category: "MILESTONE" as const,
    iconEmoji: "💎",
    requirement: JSON.stringify({ type: "total_devotionals", count: 365 }),
    order: 4,
  },
  {
    name: "Reflexivo",
    description: "Complete 50 desafios de reflexão",
    category: "MILESTONE" as const,
    iconEmoji: "💭",
    requirement: JSON.stringify({ type: "total_reflections", count: 50 }),
    order: 5,
  },
  {
    name: "Mestre da Reflexão",
    description: "Complete 200 desafios de reflexão",
    category: "MILESTONE" as const,
    iconEmoji: "🧠",
    requirement: JSON.stringify({ type: "total_reflections", count: 200 }),
    order: 6,
  },

  // ============================================
  // SPECIAL MEDALS
  // ============================================
  {
    name: "Bem-vindo!",
    description: "Complete seu primeiro devocional",
    category: "SPECIAL" as const,
    iconEmoji: "🎉",
    requirement: JSON.stringify({ type: "first_devotional" }),
    order: 1,
  },
  {
    name: "Evangelista",
    description: "Complete os 4 Evangelhos (Mateus, Marcos, Lucas e João)",
    category: "SPECIAL" as const,
    iconEmoji: "✝️",
    requirement: JSON.stringify({ 
      type: "multiple_books", 
      books: ["Mateus", "Marcos", "Lucas", "João"] 
    }),
    order: 2,
  },
  {
    name: "Sabedoria",
    description: "Complete Provérbios e Salmos",
    category: "SPECIAL" as const,
    iconEmoji: "🦉",
    requirement: JSON.stringify({ 
      type: "multiple_books", 
      books: ["Provérbios", "Salmos"] 
    }),
    order: 3,
  },
  {
    name: "Madrugador",
    description: "Complete um devocional antes das 6h da manhã",
    category: "SPECIAL" as const,
    iconEmoji: "🌅",
    requirement: JSON.stringify({ type: "early_bird", hour: 6 }),
    order: 4,
  },
  {
    name: "Noturno",
    description: "Complete um devocional depois das 22h",
    category: "SPECIAL" as const,
    iconEmoji: "🌙",
    requirement: JSON.stringify({ type: "night_owl", hour: 22 }),
    order: 5,
  },
];

export async function seedMedals() {
  console.log("🏅 Seeding medals...");
  
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }
  
  try {
    // Clear existing medals
    await db.delete(medals);
    
    // Insert medals
    for (const medal of medalData) {
      await db.insert(medals).values(medal);
    }
    
    console.log(`✅ Seeded ${medalData.length} medals successfully`);
  } catch (error) {
    console.error("❌ Error seeding medals:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedMedals()
    .then(() => {
      console.log("✅ Medal seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Medal seeding failed:", error);
      process.exit(1);
    });
}
