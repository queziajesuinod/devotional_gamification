import { describe, expect, it, beforeAll } from "vitest";
import axios from "axios";

const API_URL = "http://127.0.0.1:3009/api";

describe("Profile Updates", () => {
  let sessionCookie: string;
  let currentEmail: string;
  const testUser = {
    nickname: "ProfileTest" + Date.now(),
    email: `profile${Date.now()}@example.com`,
    password: "test123456",
  };
  currentEmail = testUser.email;

  beforeAll(async () => {
    // Register and login
    const response = await axios.post(`${API_URL}/auth/register`, testUser, {
      withCredentials: true,
    });
    
    const cookies = response.headers["set-cookie"];
    if (cookies && cookies.length > 0) {
      sessionCookie = cookies[0];
    }
  });

  it("should update user nickname", async () => {
    const newNickname = "UpdatedNickname" + Date.now();
    
    const response = await axios.put(
      `${API_URL}/auth/profile`,
      { nickname: newNickname },
      {
        headers: {
          Cookie: sessionCookie,
        },
        withCredentials: true,
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.user.nickname).toBe(newNickname);
  });

  it("should update user email", async () => {
    const newEmail = `updated${Date.now()}@example.com`;
    
    const response = await axios.put(
      `${API_URL}/auth/profile`,
      { email: newEmail },
      {
        headers: {
          Cookie: sessionCookie,
        },
        withCredentials: true,
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.user.email).toBe(newEmail);
    
    // Update current email for subsequent tests
    currentEmail = newEmail;
  });

  it("should not update with duplicate email", async () => {
    // Create another user
    const anotherUser = {
      nickname: "Another" + Date.now(),
      email: `another${Date.now()}@example.com`,
      password: "test123456",
    };
    await axios.post(`${API_URL}/auth/register`, anotherUser);

    // Try to update to the other user's email
    try {
      await axios.put(
        `${API_URL}/auth/profile`,
        { email: anotherUser.email },
        {
          headers: {
            Cookie: sessionCookie,
          },
          withCredentials: true,
        }
      );
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.error).toContain("em uso");
    }
  });

  it("should change password", async () => {
    const newPassword = "newpassword123";
    
    const response = await axios.put(
      `${API_URL}/auth/password`,
      {
        currentPassword: testUser.password,
        newPassword,
      },
      {
        headers: {
          Cookie: sessionCookie,
        },
        withCredentials: true,
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);

    // Test login with new password (use current email)
    const loginResponse = await axios.post(
      `${API_URL}/auth/login`,
      {
        email: currentEmail,
        password: newPassword,
      },
      {
        withCredentials: true,
      }
    );

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.data.success).toBe(true);
  });

  it("should not change password with wrong current password", async () => {
    try {
      await axios.put(
        `${API_URL}/auth/password`,
        {
          currentPassword: "wrongpassword",
          newPassword: "newpassword456",
        },
        {
          headers: {
            Cookie: sessionCookie,
          },
          withCredentials: true,
        }
      );
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.response.status).toBe(401);
      expect(error.response.data.error).toContain("incorreta");
    }
  });

  it("should not change password with short new password", async () => {
    try {
      await axios.put(
        `${API_URL}/auth/password`,
        {
          currentPassword: testUser.password,
          newPassword: "123",
        },
        {
          headers: {
            Cookie: sessionCookie,
          },
          withCredentials: true,
        }
      );
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.error).toContain("6 caracteres");
    }
  });
});
