import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { getUserByEmail, createUser, getUserById, grantFreeItemsToUser } from "./db";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import multer from "multer";
import { storagePut } from "./storage";
import { cacheSession, getSession, deleteSession } from "./redis";

const upload = multer({ storage: multer.memoryStorage() });

const COOKIE_NAME = "app_session_id";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const SALT_ROUNDS = 10;
const normalizeGenderOption = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.toString().trim().toLowerCase();
  if (["masculino", "male"].includes(normalized)) return "male";
  if (["feminino", "female"].includes(normalized)) return "female";
  return null;
};
const isFullNameValid = (value: string) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words.length >= 2;
};

export function createAuthRouter(): Router {
  const router = Router();

  // Register new user
  router.post("/register", async (req: Request, res: Response) => {
    try {
      const { email, password, nickname } = req.body;

      // Validation
      if (!email || !password || !nickname) {
        res.status(400).json({ error: "Email, password e nickname são obrigatórios" });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: "Senha deve ter no mínimo 6 caracteres" });
        return;
      }

      // Check if user already exists
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        res.status(400).json({ error: "Email já cadastrado" });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const user = await createUser({
        email,
        passwordHash,
        nickname,
        name: nickname,
        loginMethod: "email",
      });

      // Grant free items to new user
      await grantFreeItemsToUser(user.id);

      // Create session token using openId (which is the user's ID for custom auth)
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.nickname,
        fallbackName: user.email?.split("@")[0] || user.openId || undefined,
        expiresInMs: ONE_YEAR_MS,
      });

      // Cache session in Redis
      await cacheSession(sessionToken, {
        userId: user.id,
        email: user.email || '',
        nickname: user.nickname || '',
        createdAt: Date.now(),
      });

      // Set cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        user: {
          id: user.id,
          openId: user.openId,
          email: user.email,
          nickname: user.nickname,
          role: user.role,
          level: user.level,
          xpTotal: user.xpTotal,
          denarioBalance: user.denarioBalance,
        },
        sessionToken,
      });
    } catch (error) {
      console.error("[Auth] Register error:", error);
      res.status(500).json({ error: "Erro ao criar usuário" });
    }
  });

  // Login existing user
  router.post("/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        res.status(400).json({ error: "Email e senha são obrigatórios" });
        return;
      }

      // Get user
      const user = await getUserByEmail(email);
      if (!user) {
        res.status(401).json({ error: "Email ou senha incorretos" });
        return;
      }

      // Check if user has password (not OAuth user)
      if (!user.passwordHash) {
        res.status(401).json({ error: "Usuário registrado via OAuth. Use o login social." });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        res.status(401).json({ error: "Email ou senha incorretos" });
        return;
      }

      // Create session token
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.nickname,
        fallbackName: user.email?.split("@")[0] || user.openId || undefined,
        expiresInMs: ONE_YEAR_MS,
      });

      // Cache session in Redis
      await cacheSession(sessionToken, {
        userId: user.id,
        email: user.email || '',
        nickname: user.nickname || '',
        createdAt: Date.now(),
      });

      // Set cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        user: {
          id: user.id,
          openId: user.openId,
          email: user.email,
          nickname: user.nickname,
          role: user.role,
          level: user.level,
          xpTotal: user.xpTotal,
          denarioBalance: user.denarioBalance,
        },
        sessionToken,
      });
    } catch (error) {
      console.error("[Auth] Login error:", error);
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  });

  // Update profile (nickname, email)
  router.put("/profile", async (req: Request, res: Response) => {
    try {
      // Authenticate user
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Não autenticado" });
        return;
      }

      const { nickname, email, gender, birthDate, whatsapp, name } = req.body;

      const cleanedNickname = typeof nickname === "string" ? nickname.trim() : undefined;
      const cleanedEmail = typeof email === "string" ? email.trim().toLowerCase() : undefined;
      const cleanedName = typeof name === "string" ? name.trim() : undefined;
      const hasUpdate =
        Boolean(cleanedNickname) ||
        Boolean(cleanedEmail) ||
        name !== undefined ||
        gender !== undefined ||
        birthDate !== undefined ||
        whatsapp !== undefined;

      if (!hasUpdate) {
        res.status(400).json({ error: "Nenhum campo para atualizar" });
        return;
      }

      // Check if email is already taken by another user
      if (cleanedEmail) {
        const existingUser = await getUserByEmail(cleanedEmail);
        if (existingUser && existingUser.id !== user.id) {
          res.status(400).json({ error: "Email já está em uso" });
          return;
        }
      }

      // Update user in database
      const db = await import("./db").then(m => m.getDb());
      if (!db) {
        res.status(500).json({ error: "Database not available" });
        return;
      }

      const { users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const updateData: any = {};
      if (name !== undefined) {
        if (cleanedName && !isFullNameValid(cleanedName)) {
          res
            .status(400)
            .json({ error: "Informe um nome completo com pelo menos duas palavras" });
          return;
        }
        updateData.name = cleanedName || null;
      }
      if (cleanedNickname) updateData.nickname = cleanedNickname;
      if (cleanedEmail) updateData.email = cleanedEmail;
      if (gender !== undefined) {
        updateData.gender = normalizeGenderOption(gender);
      }
      if (birthDate !== undefined) {
        updateData.birthDate = birthDate || null;
      }
      if (whatsapp !== undefined) {
        const normalizedWhatsapp = typeof whatsapp === "string" ? whatsapp.trim() : whatsapp;
        updateData.whatsapp = normalizedWhatsapp || null;
      }

      await db.update(users).set(updateData).where(eq(users.id, user.id));

      // Fetch updated user
      const updatedUser = await getUserById(user.id);

      res.json({
        success: true,
        user: {
          id: updatedUser!.id,
          openId: updatedUser!.openId,
          email: updatedUser!.email,
          nickname: updatedUser!.nickname,
          level: updatedUser!.level,
          xpTotal: updatedUser!.xpTotal,
          denarioBalance: updatedUser!.denarioBalance,
          gender: updatedUser!.gender,
          birthDate: updatedUser!.birthDate,
          whatsapp: updatedUser!.whatsapp,
        },
      });
    } catch (error) {
      console.error("[Auth] Profile update error:", error);
      res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
  });

  // Change password
  router.put("/password", async (req: Request, res: Response) => {
    try {
      // Authenticate user
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Não autenticado" });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: "Nova senha deve ter no mínimo 6 caracteres" });
        return;
      }

      // Get user with password hash
      const fullUser = await getUserById(user.id);
      if (!fullUser || !fullUser.passwordHash) {
        res.status(400).json({ error: "Usuário não possui senha (login via OAuth)" });
        return;
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, fullUser.passwordHash);
      if (!isValidPassword) {
        res.status(401).json({ error: "Senha atual incorreta" });
        return;
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update password in database
      const db = await import("./db").then(m => m.getDb());
      if (!db) {
        res.status(500).json({ error: "Database not available" });
        return;
      }

      const { users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, user.id));

      res.json({ success: true, message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("[Auth] Password change error:", error);
      res.status(500).json({ error: "Erro ao alterar senha" });
    }
  });

  // Upload avatar
  router.post("/avatar", upload.single("avatar"), async (req: Request, res: Response) => {
    try {
      // Authenticate user
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Não autenticado" });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "Nenhum arquivo enviado" });
        return;
      }

      // Upload to S3
      const fileExtension = req.file.mimetype.split("/")[1];
      const { url: fileUrl } = await storagePut(
        `avatars/avatar-${user.id}-${Date.now()}.${fileExtension}`,
        req.file.buffer,
        req.file.mimetype
      );

      // Update user avatar URL
      const db = await import("./db").then(m => m.getDb());
      if (!db) {
        res.status(500).json({ error: "Database not available" });
        return;
      }

      const { users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      await db.update(users).set({ avatarUrl: fileUrl }).where(eq(users.id, user.id));

      const updatedUser = await getUserById(user.id);

      res.json({ success: true, avatarUrl: fileUrl, user: updatedUser });
    } catch (error) {
      console.error("[Auth] Avatar upload error:", error);
      res.status(500).json({ error: "Erro ao fazer upload da imagem" });
    }
  });

  return router;
}
