import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";

type DbUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

function toAdapterUser(user: DbUser): AdapterUser {
  return {
    id: user.id,
    email: user.email ?? "",
    name: user.displayName,
    emailVerified: null,
  };
}

/**
 * Auth.js PrismaAdapter expects User.name / emailVerified, but MotoTwin stores
 * display names on User.displayName. Map fields at the adapter boundary.
 */
export function mototwinPrismaAdapter(): Adapter {
  const base = PrismaAdapter(prisma);

  return {
    ...base,
    createUser: async (data: Omit<AdapterUser, "id">) => {
      const normalizedEmail = data.email?.trim().toLowerCase() || null;
      if (normalizedEmail) {
        const existing = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (existing) {
          return toAdapterUser(existing);
        }
      }

      const user = await prisma.user.create({
        data: {
          email: data.email,
          displayName: data.name ?? null,
        },
      });
      return toAdapterUser(user);
    },
    getUser: async (id) => {
      const user = await prisma.user.findUnique({ where: { id } });
      return user ? toAdapterUser(user) : null;
    },
    getUserByEmail: async (email) => {
      const user = await prisma.user.findUnique({ where: { email } });
      return user ? toAdapterUser(user) : null;
    },
    getUserByAccount: async (providerAccountId) => {
      const account = await prisma.account.findUnique({
        where: { provider_providerAccountId: providerAccountId },
        include: { user: true },
      });
      return account?.user ? toAdapterUser(account.user) : null;
    },
    updateUser: async ({ id, email, name }) => {
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(email !== undefined ? { email } : {}),
          ...(name !== undefined ? { displayName: name } : {}),
        },
      });
      return toAdapterUser(user);
    },
    getSessionAndUser: async (sessionToken) => {
      const userAndSession = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });
      if (!userAndSession) {
        return null;
      }
      const { user, ...session } = userAndSession;
      return {
        user: toAdapterUser(user),
        session,
      };
    },
  };
}
