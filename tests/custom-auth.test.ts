import { describe, expect, it, beforeAll } from "vitest";
import axios from "axios";

const API_URL = "http://127.0.0.1:3000/api";

describe("Custom Authentication", () => {
  const testUser = {
    nickname: "TestUser" + Date.now(),
    email: `test${Date.now()}@example.com`,
    password: "test123456",
  };

  let sessionCookie: string | undefined;

  it("should register a new user", async () => {
    const response = await axios.post(`${API_URL}/auth/register`, testUser, {
      withCredentials: true,
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.user).toBeDefined();
    expect(response.data.user.email).toBe(testUser.email);
    expect(response.data.user.nickname).toBe(testUser.nickname);
    expect(response.data.sessionToken).toBeDefined();

    // Save session cookie for next test
    const cookies = response.headers["set-cookie"];
    if (cookies && cookies.length > 0) {
      sessionCookie = cookies[0];
    }
  });

  it("should not register duplicate email", async () => {
    try {
      await axios.post(`${API_URL}/auth/register`, testUser, {
        withCredentials: true,
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.error).toContain("já cadastrado");
    }
  });

  it("should login with correct credentials", async () => {
    const response = await axios.post(
      `${API_URL}/auth/login`,
      {
        email: testUser.email,
        password: testUser.password,
      },
      {
        withCredentials: true,
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.user).toBeDefined();
    expect(response.data.user.email).toBe(testUser.email);
    expect(response.data.sessionToken).toBeDefined();
  });

  it("should not login with wrong password", async () => {
    try {
      await axios.post(
        `${API_URL}/auth/login`,
        {
          email: testUser.email,
          password: "wrongpassword",
        },
        {
          withCredentials: true,
        }
      );
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.response.status).toBe(401);
      expect(error.response.data.error).toContain("incorretos");
    }
  });

  it("should not login with non-existent email", async () => {
    try {
      await axios.post(
        `${API_URL}/auth/login`,
        {
          email: "nonexistent@example.com",
          password: "anypassword",
        },
        {
          withCredentials: true,
        }
      );
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.response.status).toBe(401);
      expect(error.response.data.error).toContain("incorretos");
    }
  });
});
