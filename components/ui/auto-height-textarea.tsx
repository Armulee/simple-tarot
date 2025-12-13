import { useEffect, useRef, useCallback } from "react"
import { Textarea } from "./textarea"

export default function AutoHeightTextarea({
    className = "",
    onChange,
    ...props
}: {
    className?: string
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    const ref = useRef<HTMLTextAreaElement>(null)

    const adjustHeight = useCallback(() => {
        const el = ref.current
        if (!el) return

        // 1) reset to minimum so it can shrink if needed
        el.style.height = `40px`
        // 2) expand to show all text (including wrapped lines)
        el.style.height = `${el.scrollHeight}px`
    }, [])

    // Adjust height when value changes
    useEffect(() => {
        adjustHeight()
    }, [props.value, adjustHeight])

    // Handle input changes and adjust height
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        // Call the original onChange if provided
        if (onChange) {
            onChange(e)
        }
        // Adjust height after the value has been updated
        setTimeout(adjustHeight, 0)
    }

    return (
        <Textarea
            {...props}
            ref={ref}
            onChange={handleChange}
            className={`${className} min-h-[40px] max-h-[200px] resize-none overflow-x-hidden scrollbar-hide appearance-none`}
        />
    )
}
