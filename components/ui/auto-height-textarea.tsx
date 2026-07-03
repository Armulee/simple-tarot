import { forwardRef, useEffect, useRef, useCallback } from "react"
import { Textarea } from "./textarea"

type AutoHeightTextareaProps = {
    className?: string
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>

/**
 * Textarea that grows with its content. Forwards a ref to the underlying
 * <textarea> (while keeping its own ref for height adjustment) so callers can
 * read/modify the caret — used by the composer to insert @mentions.
 */
const AutoHeightTextarea = forwardRef<
    HTMLTextAreaElement,
    AutoHeightTextareaProps
>(function AutoHeightTextarea({ className = "", onChange, ...props }, forwardedRef) {
    const innerRef = useRef<HTMLTextAreaElement>(null)

    const setRefs = useCallback(
        (node: HTMLTextAreaElement | null) => {
            innerRef.current = node
            if (typeof forwardedRef === "function") {
                forwardedRef(node)
            } else if (forwardedRef) {
                forwardedRef.current = node
            }
        },
        [forwardedRef],
    )

    const adjustHeight = useCallback(() => {
        const el = innerRef.current
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
            ref={setRefs}
            onChange={handleChange}
            className={`${className} min-h-[40px] max-h-[200px] resize-none overflow-x-hidden scrollbar-hide appearance-none`}
        />
    )
})

export default AutoHeightTextarea
