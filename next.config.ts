import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Google sign-in runs on Firebase's own pages (<project>.firebaseapp.com). Browsers that
   * partition storage per site (Firefox, Safari) lose the sign-in state when the app and those
   * pages are on different addresses ("missing initial state"). Serving them from the app's own
   * address fixes it: set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN to the app's address (for example
   * prism.vercel.app); these rewrites then pass the sign-in pages through from Firebase.
   */
  async rewrites() {
    const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!project) return [];
    const firebase = `https://${project}.firebaseapp.com`;
    return [
      { source: "/__/auth/:path*", destination: `${firebase}/__/auth/:path*` },
      { source: "/__/firebase/:path*", destination: `${firebase}/__/firebase/:path*` },
    ];
  },
};

export default nextConfig;
