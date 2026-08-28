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
    async jwt({ token, user }) {
      if (user) {
        const u = user as any;
        token.id = u.id;
        token.username = u.username;
        token.role = u.role;
        token.status = u.status;
        token.dustBalance = u.dustBalance;
        token.picture = u.image || u.avatarUrl || token.picture;
      }
      return token;
    },
    async session({ session, token, user }) {
      // JWT strategy: use token. Database fallback: use user if present
      const src: any = (token as any)?.id ? token : user;
      if (session.user && src) {
        (session.user as any).id = src.id || (src as any).sub;
        (session.user as any).username = src.username;
        (session.user as any).role = src.role;
        (session.user as any).status = src.status;
        (session.user as any).dustBalance = src.dustBalance;
        session.user.image = src.image || src.avatarUrl || session.user.image;
        session.user.name = src.name || src.username;
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
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
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