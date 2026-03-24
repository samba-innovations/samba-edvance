import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Problem } from "@/components/Problem";
import { Solution } from "@/components/Solution";
import { Benefits } from "@/components/Benefits";
import { HowItWorks } from "@/components/HowItWorks";
import { Demo } from "@/components/Demo";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col relative w-full overflow-hidden">
      <Navbar />

      <Hero />
      <Problem />
      <Solution />
      <Benefits />
      <HowItWorks />
      <Demo />
      <Contact />

      <Footer />
    </main>
  );
}
