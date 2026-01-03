import { describe, it, expect } from "vitest";
import axios from "axios";

const API_URL = process.env.API_URL || "http://127.0.0.1:3000";

describe("Medal System", () => {
  let authCookie: string;
  let userId: number;

  it("should register and login a test user", async () => {
    const email = `medal_test_${Date.now()}@test.com`;
    const password = "Test123!";

    // Register
    const registerResponse = await axios.post(`${API_URL}/auth/register`, {
      email,
      password,
      nickname: "Medal Tester",
    });

    expect(registerResponse.status).toBe(200);
    expect(registerResponse.data.success).toBe(true);

    // Login
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.data.success).toBe(true);

    // Extract cookie
    const cookies = loginResponse.headers["set-cookie"];
    authCookie = cookies![0];

    // Get user ID
    const meResponse = await axios.get(`${API_URL}/trpc/user.me`, {
      headers: {
        Cookie: authCookie,
      },
    });

    userId = meResponse.data.result.data.json.id;
    expect(userId).toBeDefined();
  });

  it("should fetch all medals with user progress", async () => {
    const response = await axios.get(`${API_URL}/trpc/medals.list`, {
      headers: {
        Cookie: authCookie,
      },
    });

    expect(response.status).toBe(200);
    const medals = response.data.result.data.json;
    
    expect(Array.isArray(medals)).toBe(true);
    expect(medals.length).toBeGreaterThan(0);
    
    // Check medal structure
    const medal = medals[0];
    expect(medal).toHaveProperty("id");
    expect(medal).toHaveProperty("name");
    expect(medal).toHaveProperty("description");
    expect(medal).toHaveProperty("category");
    expect(medal).toHaveProperty("isEarned");
    expect(medal.isEarned).toBe(false); // New user shouldn't have medals yet
  });

  it("should fetch only earned medals (should be empty for new user)", async () => {
    const response = await axios.get(`${API_URL}/trpc/medals.earned`, {
      headers: {
        Cookie: authCookie,
      },
    });

    expect(response.status).toBe(200);
    const earnedMedals = response.data.result.data.json;
    
    expect(Array.isArray(earnedMedals)).toBe(true);
    expect(earnedMedals.length).toBe(0); // New user should have no medals
  });

  it("should award 'Bem-vindo!' medal after first challenge completion", async () => {
    // Get today's challenges
    const todayResponse = await axios.get(`${API_URL}/trpc/devotional.today`, {
      headers: {
        Cookie: authCookie,
      },
    });

    const challenges = todayResponse.data.result.data.json.challenges;
    expect(challenges.length).toBeGreaterThan(0);

    // Complete first challenge
    const firstChallenge = challenges[0];
    const completeResponse = await axios.post(
      `${API_URL}/trpc/devotional.completeChallenge`,
      {
        challengeId: firstChallenge.id,
        responseText: firstChallenge.type === "REFLECTION" ? "Test reflection" : undefined,
      },
      {
        headers: {
          Cookie: authCookie,
          "Content-Type": "application/json",
        },
      }
    );

    expect(completeResponse.status).toBe(200);
    expect(completeResponse.data.result.data.json.success).toBe(true);

    // Check if "Bem-vindo!" medal was awarded
    const medalsResponse = await axios.get(`${API_URL}/trpc/medals.earned`, {
      headers: {
        Cookie: authCookie,
      },
    });

    const earnedMedals = medalsResponse.data.result.data.json;
    const welcomeMedal = earnedMedals.find((m: any) => m.name === "Bem-vindo!");
    
    expect(welcomeMedal).toBeDefined();
    expect(welcomeMedal.category).toBe("SPECIAL");
  });

  it("should track Bible reading progress", async () => {
    const response = await axios.post(
      `${API_URL}/trpc/medals.updateBibleProgress`,
      {
        bookName: "Mateus",
        chaptersRead: 5,
        totalChapters: 28,
      },
      {
        headers: {
          Cookie: authCookie,
          "Content-Type": "application/json",
        },
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.result.data.json.success).toBe(true);

    // Check progress
    const progressResponse = await axios.get(`${API_URL}/trpc/medals.bibleProgress`, {
      headers: {
        Cookie: authCookie,
      },
    });

    const progress = progressResponse.data.result.data.json;
    expect(Array.isArray(progress)).toBe(true);
    
    const mateusProgress = progress.find((p: any) => p.bookName === "Mateus");
    expect(mateusProgress).toBeDefined();
    expect(mateusProgress.chaptersRead).toBe(5);
    expect(mateusProgress.totalChapters).toBe(28);
    expect(mateusProgress.isCompleted).toBe(false);
  });

  it("should award medal when Bible book is completed", async () => {
    // Complete Mateus
    const response = await axios.post(
      `${API_URL}/trpc/medals.updateBibleProgress`,
      {
        bookName: "Mateus",
        chaptersRead: 28,
        totalChapters: 28,
      },
      {
        headers: {
          Cookie: authCookie,
          "Content-Type": "application/json",
        },
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.result.data.json.success).toBe(true);

    // Check if Mateus medal was awarded
    const medalsResponse = await axios.get(`${API_URL}/trpc/medals.earned`, {
      headers: {
        Cookie: authCookie,
      },
    });

    const earnedMedals = medalsResponse.data.result.data.json;
    const mateusMedal = earnedMedals.find((m: any) => m.name === "Mateus Completo");
    
    expect(mateusMedal).toBeDefined();
    expect(mateusMedal.category).toBe("BIBLE_BOOK");
  });

  it("should manually check and award medals", async () => {
    const response = await axios.post(
      `${API_URL}/trpc/medals.checkMedals`,
      {},
      {
        headers: {
          Cookie: authCookie,
          "Content-Type": "application/json",
        },
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.result.data.json.success).toBe(true);
  });

  it("should have correct medal categories", async () => {
    const response = await axios.get(`${API_URL}/trpc/medals.list`, {
      headers: {
        Cookie: authCookie,
      },
    });

    const medals = response.data.result.data.json;
    const categories = new Set(medals.map((m: any) => m.category));
    
    expect(categories.has("BIBLE_BOOK")).toBe(true);
    expect(categories.has("STREAK")).toBe(true);
    expect(categories.has("MILESTONE")).toBe(true);
    expect(categories.has("SPECIAL")).toBe(true);
  });
});
