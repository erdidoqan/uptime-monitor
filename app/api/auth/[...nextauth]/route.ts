import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getD1Client } from '@/lib/d1-client';
import { signToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// NextAuth requires Node.js runtime for crypto operations (JWT signing)
export const runtime = 'nodejs';

export const { handlers, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        try {
          const db = getD1Client();
          
          // Check if user exists
          let dbUser = await db.queryFirst<{ id: string; name: string | null; image: string | null }>(
            'SELECT id, name, image FROM users WHERE email = ?',
            [user.email]
          );

          // Create user if doesn't exist
          if (!dbUser) {
            const userId = uuidv4();
            const now = Date.now();
            await db.execute(
              'INSERT INTO users (id, email, name, image, created_at) VALUES (?, ?, ?, ?, ?)',
              [userId, user.email, user.name || null, user.image || null, now]
            );
            dbUser = { id: userId, name: user.name || null, image: user.image || null };
          } else {
            // Update name and image if they changed (user might update their Google profile)
            if (user.name || user.image) {
              await db.execute(
                'UPDATE users SET name = COALESCE(?, name), image = COALESCE(?, image) WHERE id = ?',
                [user.name || null, user.image || null, dbUser.id]
              );
            }
          }

          // Store user ID in user object for JWT
          user.id = dbUser.id;
          return true;
        } catch (error) {
          console.error('SignIn error:', error);
          // Don't block sign-in if D1 fails, use temporary ID
          if (!user.id) {
            user.id = uuidv4();
          }
          return true;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      try {
        // Initial sign in - user object is available
        if (user?.id && user?.email) {
          token.userId = user.id;
          token.email = user.email;
          token.name = user.name;
          token.image = user.image;
        }
        // Subsequent requests - preserve existing token values
        // token.userId and token.email should already be set
      } catch (error) {
        console.error('JWT callback error:', error);
      }
      return token;
    },
    async session({ session, token }) {
      try {
        if (token.userId && token.email) {
          // Generate JWT token for API calls
          const apiToken = signToken({
            userId: token.userId as string,
            email: token.email as string,
          });
          
          if (session.user) {
            session.user = {
              ...session.user,
              id: token.userId as string,
              email: token.email as string,
              emailVerified: session.user.emailVerified || null,
              name: token.name as string | null | undefined,
              image: token.image as string | null | undefined,
              apiToken,
            };
          } else {
            session.user = {
              id: token.userId as string,
              email: token.email as string,
              emailVerified: null,
              name: token.name as string | null | undefined,
              image: token.image as string | null | undefined,
              apiToken,
            };
          }
        }
      } catch (error) {
        console.error('Session callback error:', error);
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});

export const { GET, POST } = handlers;

