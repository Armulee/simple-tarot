import AboutHeader from "./header"
import ServicesSection from "./services"
import RoadmapSection from "./roadmap"
import TechnologySection from "./technology"
import TestimonialsSection from "./testimonials"
import StatisticsSection from "./statistics"
import CallToActionSection from "./call-to-action"

/**
 * The "about AskingFate" story — what it does, the roadmap, the technology,
 * testimonials, the numbers, and the call to action.
 *
 * This used to be its own route at `/about`. It now lives below the fold on
 * the landing page, which is where SCROLL TO EXPLORE leads, so a visitor can
 * read the whole pitch without leaving Astra. The footer is deliberately not
 * rendered here: the layout already puts one below the page.
 */
export default function AboutSections() {
    return (
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
            <AboutHeader />
            <ServicesSection />
            <RoadmapSection />
            <TechnologySection />
            <TestimonialsSection />
            <StatisticsSection />
            <CallToActionSection />
        </div>
    )
}
