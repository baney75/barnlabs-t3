// Home.tsx - Add min-h-screen flex-col for stacking; main flex-grow pushes footer down
import { lazy, Suspense, useEffect } from "react";
import Footer from "./Footer";
import Header from "./Header";
import Hero from "./Hero";

const Features = lazy(() => import("./Features")); // Lazy-load to split chunk
const Contact = lazy(() => import("./Contact")); // Lazy-load contact section

function Home() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = "/login";
    document.head.appendChild(link);
    return () => {
      if (link.parentNode) {
        document.head.removeChild(link);
      }
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col scroll-smooth">
      {/* Key fix: Full height, column stack */}
      <Header /> {/* Fixed at top via its own classes */}
      <main className="flex-grow">
        {/* Expands to fill space, prevents footer float */}
        <Hero />
        <Suspense
          fallback={<div className="py-8 text-center">Loading Features...</div>}
        >
          <Features />
        </Suspense>
        <Suspense
          fallback={<div className="py-8 text-center">Loading Contact...</div>}
        >
          <Contact />
        </Suspense>
      </main>
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}

export default Home;
