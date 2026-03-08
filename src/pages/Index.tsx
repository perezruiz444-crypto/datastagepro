import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Benefits from "@/components/landing/Benefits";
import Audience from "@/components/landing/Audience";
import FAQ from "@/components/landing/FAQ";
import Reviews from "@/components/landing/Reviews";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import ThemeToggle from "@/components/landing/ThemeToggle";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle />
      <Hero />
      <HowItWorks />
      <Benefits />
      <Audience />
      <FAQ />
      <Reviews />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
