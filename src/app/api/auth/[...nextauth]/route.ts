import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from '@/lib/db';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email! },
      });

      if (!existingUser) {
        // New user: create with PENDING status
        // Admin email gets auto-approved with ADMIN role
        const isAdmin = user.email === process.env.ADMIN_EMAIL;
        await prisma.user.create({
          data: {
            email: user.email!,
            username: user.name || user.email!.split('@')[0],
            avatarUrl: user.image,
            role: isAdmin ? 'ADMIN' : 'PLAYER',
            status: isAdmin ? 'APPROVED' : 'PENDING',
            approvedAt: isAdmin ? new Date() : null,
          },
        });
      }

      return true; // Allow sign in (whitelist check happens in session callback)
    },

    async session({ session }) {
      if (session.user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: {
            id: true,
            username: true,
            role: true,
            status: true,
            dustBalance: true,
            avatarUrl: true,
          },
        });

        if (dbUser) {
          (session.user as any).id = dbUser.id;
          (session.user as any).username = dbUser.username;
          (session.user as any).role = dbUser.role;
          (session.user as any).status = dbUser.status;
          (session.user as any).dustBalance = dbUser.dustBalance;
          if (dbUser.avatarUrl) {
            session.user.image = dbUser.avatarUrl;
          }
        }
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // After sign in, redirect to home
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'database',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
