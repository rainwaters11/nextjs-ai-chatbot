import NextAuth from "next-auth";
// (You can import any providers here if you plan to add them later)

export const authOptions = {
  // You can add providers later if needed
  secret: process.env.NEXTAUTH_SECRET, // This tells NextAuth to use your secret
  // other options can go here...
};

export default NextAuth(authOptions);
