"use client"

import { useCallback, useRef, useState } from "react"
import Image from "next/image"
import { Link } from "@/i18n/navigation"
import PageContextComposer from "@/components/chat/page-context-composer"
import type { OriginContext } from "@/lib/chat/origin-context"
import { CardReadingCta } from "./card-reading-cta"
import styles from "./card-article.module.css"

type Orientation = "upright" | "reversed"

export type AreaView = {
    key: "relationships" | "work" | "finance" | "health"
    title: string
    keys: string[]
    body: string
}

export type OrientationView = {
    lede: string
    quote: string
    overview: string
    core: string[]
    areas: AreaView[]
}

export type RelatedLink = {
    href: string
    title: string
    description: string
}

export type CardArticleProps = {
    cardName: string
    eyebrow: string
    topHint: string
    originContext: OriginContext
    deckId: number
    imageSrc: string
    badges: { yesNo?: string; zodiac?: string; element?: string }
    upright: OrientationView
    reversed: OrientationView
    related: RelatedLink[]
    labels: {
        upright: string
        reversed: string
        lightGathers: string
        lightRecedes: string
        theReading: string
        continue: string
        readArticle: string
        askPlaceholder: string
        askEyebrow: string
        askHint: string
        ctaPaid: string
        ctaFree: string
        ctaNote: string
        orientationGroup: string
        yesNo: string
        zodiac: string
        element: string
        rights: string
    }
}

const AREA_ICONS: Record<AreaView["key"], React.ReactNode> = {
    relationships: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.4'>
            <path
                d='M12 20s-7-4.5-9.2-8C1.3 9.4 2.4 6 5.6 6c1.9 0 3 1.3 3.7 2.4C10 7.3 11.1 6 13 6c3.2 0 4.3 3.4 2.8 6-2.2 3.5-9.2 8-9.2 8'
                transform='translate(2.6 0)'
            />
        </svg>
    ),
    work: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.4'>
            <rect x='3' y='7' width='18' height='13' rx='2' />
            <path d='M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18' />
        </svg>
    ),
    finance: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.4'>
            <path d='M12 3 21 9l-9 12L3 9l9-6Z' />
            <path d='M3 9h18M12 3v18' />
        </svg>
    ),
    health: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.4'>
            <path d='M12 21c6-3.5 8-7.5 8-11a4 4 0 0 0-8-1 4 4 0 0 0-8 1c0 3.5 2 7.5 8 11Z' />
            <path d='M5 12h4l1.5-3 2 6 1.5-3H19' />
        </svg>
    ),
}

const Arrow = () => (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
        <path d='M5 12h14M13 6l6 6-6 6' />
    </svg>
)

export function CardArticle(props: CardArticleProps) {
    const { upright, reversed, labels, badges } = props
    // `orientation` drives the attribute (card flip + accent shift, instant).
    // `content` drives the swappable text (fades out, then updates).
    const [orientation, setOrientation] = useState<Orientation>("upright")
    const [content, setContent] = useState<Orientation>("upright")
    const [fading, setFading] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const view = content === "upright" ? upright : reversed

    const choose = useCallback(
        (next: Orientation) => {
            setOrientation((curr) => {
                if (curr === next) return curr
                const reduce =
                    typeof window !== "undefined" &&
                    window.matchMedia("(prefers-reduced-motion:reduce)").matches
                if (reduce) {
                    setContent(next)
                    return next
                }
                setFading(true)
                if (timer.current) clearTimeout(timer.current)
                timer.current = setTimeout(() => {
                    setContent(next)
                    setFading(false)
                }, 300)
                return next
            })
        },
        []
    )

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowLeft") choose("upright")
        if (e.key === "ArrowRight") choose("reversed")
    }

    const swap = (extra?: string) =>
        `${styles.swap}${fading ? ` ${styles.out}` : ""}${extra ? ` ${extra}` : ""}`

    return (
        <>
            <div className={styles.root} data-orientation={orientation}>
                {/* top hint pointing at the orientation toggle below */}
                <header className={styles.head}>
                    <div className={styles.headMeta}>{props.topHint}</div>
                </header>

            <main className={styles.wrap}>
                {/* HERO — centered column: toggle → name → card → lede */}
                <section className={styles.hero}>
                    {/* TOGGLE — signature element, moved to the top */}
                    <div
                        className={styles.switch}
                        role='group'
                        aria-label={labels.orientationGroup}
                        onKeyDown={onKeyDown}
                    >
                        <button
                            className={styles.seg}
                            type='button'
                            aria-pressed={orientation === "upright"}
                            onClick={() => choose("upright")}
                        >
                            {labels.upright}
                            <span className={styles.sub}>{labels.lightGathers}</span>
                        </button>
                        <span className={styles.moon} aria-hidden='true' />
                        <button
                            className={styles.seg}
                            type='button'
                            aria-pressed={orientation === "reversed"}
                            onClick={() => choose("reversed")}
                        >
                            {labels.reversed}
                            <span className={styles.sub}>{labels.lightRecedes}</span>
                        </button>
                    </div>

                    <div className={styles.eyebrow}>{props.eyebrow}</div>
                    <h1 className={styles.title} data-text={props.cardName}>
                        {props.cardName}
                    </h1>

                    <div className={styles.cardStage}>
                        <div className={styles.glow} aria-hidden='true' />
                        <div className={styles.glow2} aria-hidden='true' />
                        <div className={styles.cardFrame}>
                            <span className={styles.corner} data-c='tl' aria-hidden='true' />
                            <span className={styles.corner} data-c='tr' aria-hidden='true' />
                            <span className={styles.corner} data-c='bl' aria-hidden='true' />
                            <span className={styles.corner} data-c='br' aria-hidden='true' />
                            <div className={styles.tarotCard}>
                                <Image
                                    src={props.imageSrc}
                                    alt={
                                        orientation === "reversed"
                                            ? `${props.cardName} (reversed)`
                                            : props.cardName
                                    }
                                    fill
                                    sizes='190px'
                                    priority
                                />
                                <span className={styles.sheen} aria-hidden='true' />
                            </div>
                        </div>
                    </div>

                    <p className={swap(styles.lede)}>{view.lede}</p>
                    <div className={swap(styles.chips)}>
                        {view.core.map((k) => (
                            <span key={k} className={`${styles.chip} ${styles.chipKey}`}>
                                {k}
                            </span>
                        ))}
                    </div>
                    <div className={styles.badges}>
                        {badges.yesNo && (
                            <div className={styles.badge}>
                                <span className={styles.lab}>{labels.yesNo}</span>
                                <span className={styles.val}>{badges.yesNo}</span>
                            </div>
                        )}
                        {badges.zodiac && (
                            <div className={styles.badge}>
                                <span className={styles.lab}>{labels.zodiac}</span>
                                <span className={styles.val}>{badges.zodiac}</span>
                            </div>
                        )}
                        {badges.element && (
                            <div className={styles.badge}>
                                <span className={styles.lab}>{labels.element}</span>
                                <span className={styles.val}>{badges.element}</span>
                            </div>
                        )}
                    </div>
                </section>

                {/* QUOTE */}
                <section className={styles.quote}>
                    <span className={styles.mark} aria-hidden='true'>
                        &ldquo;
                    </span>
                    <p className={swap(styles.q)}>{view.quote}</p>
                </section>

                {/* READING */}
                <section>
                    <div className={styles.sectionHead}>
                        <span className={styles.num}>✦</span>
                        <h2>{labels.theReading}</h2>
                        <span className={styles.rule} aria-hidden='true' />
                    </div>
                    <p className={swap(styles.overview)}>{view.overview}</p>

                    <div className={swap(styles.grid)}>
                        {view.areas.map((a) => (
                            <article key={a.key} className={styles.area}>
                                <div className={styles.ico}>{AREA_ICONS[a.key]}</div>
                                <h3>{a.title}</h3>
                                <div className={styles.chips}>
                                    {a.keys.map((k) => (
                                        <span key={k} className={styles.chip}>
                                            {k}
                                        </span>
                                    ))}
                                </div>
                                <p>{a.body}</p>
                            </article>
                        ))}
                    </div>

                    <CardReadingCta
                        cardName={props.cardName}
                        imageSrc={props.imageSrc}
                        deckId={props.deckId}
                        isReversed={orientation === "reversed"}
                        meaning={view.lede}
                        labels={{
                            paid: labels.ctaPaid,
                            free: labels.ctaFree,
                            note: labels.ctaNote,
                        }}
                    />
                </section>

                {/* SUGGESTED */}
                <section className={styles.more}>
                    <div className={styles.sectionHead}>
                        <span className={styles.num}>✦</span>
                        <h2>{labels.continue}</h2>
                        <span className={styles.rule} aria-hidden='true' />
                    </div>
                    <div className={styles.moreGrid}>
                        {props.related.map((r) => (
                            <Link key={r.href} className={styles.scard} href={r.href}>
                                <h4>{r.title}</h4>
                                <p>{r.description}</p>
                                <span className={styles.go}>
                                    {labels.readArticle} <Arrow />
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>
            </main>

                {/* slim footer */}
                <footer className={styles.foot}>
                    <div>{labels.rights}</div>
                </footer>
            </div>

            {/* fixed composer pinned to the bottom (same as the calendar page),
                carrying this card as page context into the chat session */}
            <PageContextComposer
                originContext={props.originContext}
                placeholder={labels.askPlaceholder}
                eyebrow={labels.askEyebrow}
                hint={labels.askHint}
            />
        </>
    )
}
