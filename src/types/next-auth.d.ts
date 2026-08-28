import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      username: string;
      role: 'PLAYER' | 'ADMIN';
      status: 'PENDING' | 'APPROVED' | 'BANNED';
      dustBalance: number;
    };
  }
}
