import { Cormorant_Garamond, Manrope } from "next/font/google"

// Display face — card name, section headings, pull-quote
export const cormorant = Cormorant_Garamond({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-cormorant",
    weight: ["400", "500", "600"],
    style: ["normal", "italic"],
})

// Body / UI face — paragraphs, chips, labels
export const manrope = Manrope({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-manrope",
    weight: ["400", "500", "600", "700"],
})
