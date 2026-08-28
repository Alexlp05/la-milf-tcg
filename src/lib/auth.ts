import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './db';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });
        if (existingUser?.status === 'BANNED') {
          return false;
        }
        if (existingUser?.status === 'PENDING') {
          return '/waiting-approval';
        }
      }
      return true;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'database',
  },
  secret: process.env.NEXTAUTH_SECRET,
  events: {
    async createUser({ user }) {
      // Fill username/avatarUrl from Google profile if default
      if (user.name || user.image) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            username: user.name || user.email?.split('@')[0] || 'Joueur',
            avatarUrl: user.image || undefined,
          },
        });
      }
      // Give 3 welcome packs to new user (will be PENDING until approved, but created now)
      // Packs are usable only after APPROVED, so safe to grant now
      const welcomeCount = 3;
      await prisma.boosterPack.createMany({
        data: Array.from({ length: welcomeCount }, () => ({
          ownerId: user.id,
          packType: 'WELCOME',
        })),
      });
    },
  },
};