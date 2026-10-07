import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Credenciales inválidas");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          throw new Error("Usuario no encontrado");
        }

        if (user.isLocked) {
          throw new Error("Cuenta bloqueada por múltiples intentos fallidos. Contacte al administrador.");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          const newAttempts = user.failedLoginAttempts + 1;
          if (newAttempts >= 3) {
            await prisma.user.update({
              where: { id: user.id },
              data: { isLocked: true, failedLoginAttempts: newAttempts }
            });
            throw new Error("Cuenta bloqueada por múltiples intentos fallidos. Contacte al administrador.");
          }
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: newAttempts }
          });
          throw new Error(`Contraseña incorrecta. Intentos fallidos: ${newAttempts}/3`);
        }

        if (user.failedLoginAttempts > 0) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0 }
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
