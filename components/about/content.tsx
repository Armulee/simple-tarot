import NormalFooter from "@/components/footer/normal-footer"
import AboutHeader from "./header"
import ServicesSection from "./services"
import RoadmapSection from "./roadmap"
import TechnologySection from "./technology"
import TestimonialsSection from "./testimonials"
import StatisticsSection from "./statistics"
import CallToActionSection from "./call-to-action"

/**
 * The About sections themselves, in normal document flow.
 *
 * Kept separate from `AboutSections` so the home page can render them below its
 * hero without inheriting that component's internal scroll container and
 * swiper-coupling, which only make sense inside a swiper slide.
 */
export default function AboutContent({
    embedded = false,
}: {
    /** Set on the home page, which renders a footer of its own. */
    embedded?: boolean
}) {
    return (
        <div className='max-w-6xl mx-auto px-6 py-10 space-y-8'>
            <AboutHeader />
            <ServicesSection />
            <RoadmapSection />
            <TechnologySection />
            <TestimonialsSection />
            <StatisticsSection />
            <CallToActionSection />
            {embedded ? null : <NormalFooter />}
        </div>
    )
}
