import { renderSocialImage, socialImageAlt } from "@/lib/og-image"

export const alt = socialImageAlt
export const size = {
    width: 1200,
    height: 600,
}
export const contentType = "image/png"

export default async function Image() {
    return renderSocialImage(size)
}
