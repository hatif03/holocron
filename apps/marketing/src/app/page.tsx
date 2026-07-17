import { HeroSection } from "@/components/hero-section";
import { DemoVideoSection } from "@/components/demo-video-section";
import { ScreenshotShowcase } from "@/components/screenshot-showcase";
import { FeaturesGrid } from "@/components/features-grid";
import { PipelineSection } from "@/components/pipeline-section";
import { ProvidersSection } from "@/components/providers-section";
import { InstallCtaSection } from "@/components/install-cta-section";
import { FaqSection } from "@/components/faq-section";
import { FinalCtaSection } from "@/components/final-cta-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <DemoVideoSection />
      <ScreenshotShowcase />
      <FeaturesGrid />
      <PipelineSection />
      <ProvidersSection />
      <InstallCtaSection />
      <FaqSection />
      <FinalCtaSection />
    </>
  );
}
