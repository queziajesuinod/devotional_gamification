import { getDb } from "./db";
import { shopItems } from "../drizzle/schema";

/**
 * Seed free starter items that all users get automatically
 */

const freeItems = [
  // Free Backgrounds
  {
    name: "Fundo Branco",
    type: "BACKGROUND" as const,
    rarity: "COMMON" as const,
    priceDenario: 0,
    description: "Fundo branco simples e limpo",
    isAvailable: true,
  },
  {
    name: "Fundo Azul Claro",
    type: "BACKGROUND" as const,
    rarity: "COMMON" as const,
    priceDenario: 0,
    description: "Fundo azul claro suave",
    isAvailable: true,
  },
  {
    name: "Fundo Bege",
    type: "BACKGROUND" as const,
    rarity: "COMMON" as const,
    priceDenario: 0,
    description: "Fundo bege neutro",
    isAvailable: true,
  },

  // Free Clothes
  {
    name: "Camiseta Branca",
    type: "CLOTHES" as const,
    rarity: "COMMON" as const,
    priceDenario: 0,
    description: "Camiseta branca básica",
    isAvailable: true,
  },
  {
    name: "Camiseta Azul",
    type: "CLOTHES" as const,
    rarity: "COMMON" as const,
    priceDenario: 0,
    description: "Camiseta azul simples",
    isAvailable: true,
  },
  {
    name: "Camiseta Cinza",
    type: "CLOTHES" as const,
    rarity: "COMMON" as const,
    priceDenario: 0,
    description: "Camiseta cinza básica",
    isAvailable: true,
  },

  // Free Accessories
  {
    name: "Sem Acessório",
    type: "ACCESSORY" as const,
    rarity: "COMMON" as const,
    priceDenario: 0,
    description: "Nenhum acessório",
    isAvailable: true,
  },

  // Premium Items (cost Denários)
  {
    name: "Fundo Dourado",
    type: "BACKGROUND" as const,
    rarity: "RARE" as const,
    priceDenario: 100,
    description: "Fundo dourado luxuoso",
    isAvailable: true,
  },
  {
    name: "Fundo Roxo Místico",
    type: "BACKGROUND" as const,
    rarity: "EPIC" as const,
    priceDenario: 200,
    description: "Fundo roxo com efeito místico",
    isAvailable: true,
  },
  {
    name: "Camiseta Preta Estilosa",
    type: "CLOTHES" as const,
    rarity: "RARE" as const,
    priceDenario: 80,
    description: "Camiseta preta com estilo",
    isAvailable: true,
  },
  {
    name: "Jaqueta de Couro",
    type: "CLOTHES" as const,
    rarity: "EPIC" as const,
    priceDenario: 150,
    description: "Jaqueta de couro estilosa",
    isAvailable: true,
  },
  {
    name: "Óculos de Sol",
    type: "ACCESSORY" as const,
    rarity: "RARE" as const,
    priceDenario: 60,
    description: "Óculos de sol modernos",
    isAvailable: true,
  },
  {
    name: "Coroa Dourada",
    type: "ACCESSORY" as const,
    rarity: "EPIC" as const,
    priceDenario: 250,
    description: "Coroa dourada majestosa",
    isAvailable: true,
  },
  {
    name: "Auréola Brilhante",
    type: "ACCESSORY" as const,
    rarity: "EPIC" as const,
    priceDenario: 300,
    description: "Auréola brilhante celestial",
    isAvailable: true,
  },
];

export async function seedFreeItems() {
  console.log("🎨 Seeding shop items (free + premium)...");
  
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }
  
  try {
    // Clear existing shop items
    await db.delete(shopItems);
    
    // Insert all items
    for (const item of freeItems) {
      await db.insert(shopItems).values(item);
    }
    
    console.log(`✅ Seeded ${freeItems.length} shop items successfully`);
    console.log(`   - ${freeItems.filter(i => i.priceDenario === 0).length} free items`);
    console.log(`   - ${freeItems.filter(i => i.priceDenario > 0).length} premium items`);
  } catch (error) {
    console.error("❌ Error seeding shop items:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedFreeItems()
    .then(() => {
      console.log("✅ Shop items seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Shop items seeding failed:", error);
      process.exit(1);
    });
}
