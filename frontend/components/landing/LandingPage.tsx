"use client";

import CompareSection from "./CompareSection";
import CTASection from "./CTASection";
import CustomCursor from "./CustomCursor";
import DashboardPreviewSection from "./DashboardPreviewSection";
import FAQSection from "./FAQSection";
import FeaturesSection from "./FeaturesSection";
import Footer from "./Footer";
import HeroSection from "./HeroSection";
import LearningLoopSection from "./LearningLoopSection";
import MobileMenu from "./MobileMenu";
import Navbar from "./Navbar";
import PricingSection from "./PricingSection";
import ProblemSection from "./ProblemSection";
import PYQSection from "./PYQSection";
import StudyChatSection from "./StudyChatSection";
import TestimonialsSection from "./TestimonialsSection";
import { useLandingInteractions } from "./useLandingInteractions";

export default function LandingPage() {
  const {
    cursorRef,
    ringRef,
    isNavSticky,
    isMobileMenuOpen,
    toggleMobileMenu,
    closeMobileMenu,
  } = useLandingInteractions();

  return (
    <main className="landing-root">
      <CustomCursor cursorRef={cursorRef} ringRef={ringRef} />

      <MobileMenu isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />

      <Navbar
        isSticky={isNavSticky}
        isMenuOpen={isMobileMenuOpen}
        onToggleMenu={toggleMobileMenu}
      />

      <HeroSection />
      <ProblemSection />
      <LearningLoopSection />
      <FeaturesSection />
      <DashboardPreviewSection />
      <PYQSection />
      <StudyChatSection />
      <TestimonialsSection />
      <CompareSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
}