export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

export const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/
    return phoneRegex.test(phone)
}

export const getDefaultCountry = (locale: string): string => {
    const localeToCountry: Record<string, string> = {
        en: "US",
        th: "TH",
    }
    return localeToCountry[locale] || "US"
}
