"use client"

import Image from "next/image"
import { useMemo } from "react"
import {
    type RichBlock,
    extractKeywordsAndContent,
    parseDetailedHtml,
    slugifyCardName,
    stripCardNamesFromHtml,
    truncate,
    truncateRichBlocks,
} from "@/lib/share-rich-text"
import {
    ASTRO_BAND_FRACTION,
    ASTRO_TECHNICAL_BAND_FRACTION,
    buildAstroPlanetLabels,
    type TransitPlanetInput,
} from "@/lib/share-astrology-planets"

export type ShareImageAspect = "story" | "post" | "square" | "landscape"

const GOLD_SOFT = "rgba(232, 198, 106, 0.92)"
const PANEL_BG = "rgba(10, 16, 44, 0.66)"
const PANEL_BORDER = "1px solid rgba(216, 181, 109, 0.5)"
const SERIF =
    "'Playfair Display', ui-serif, Georgia, 'Times New Roman', serif"
const CRESCENT_PATH = "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
const STAR_GLYPH_PATH =
    "M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"

export interface ShareImageMockProps {
    aspect: ShareImageAspect
    question?: string
    cards: string[]
    interpretation?: string
    headline?: string
    subtitle?: string
    keyMessage?: string
    detailedHtml?: string
    insights?: string[]
    cta?: string
    /**
     * Selects the painted background set: "tarot" (default), the daily
     * "astrology" solar-system row, or the "astrology-technical" orbit wheel.
     */
    theme?: "tarot" | "astrology" | "astrology-technical"
    /** Transit positions stamped under the painted planets (astrology only). */
    planets?: TransitPlanetInput[]
    /**
     * Resolved timing-window date for a "when will X happen?" verdict. When
     * set (timing verdict strategy only) a gold date crest is painted between
     * the question and the key-message panel; other readings omit it.
     */
    verdictDate?: { primary: string; secondary?: string }
    /**
     * Loop this film behind the elements instead of the painted sky —
     * previews the video export, whose overlay carries its own gold frame.
     */
    videoBackgroundSrc?: string
}

/**
 * Instant client-side mock of the server-rendered share poster. It mirrors
 * the celestial gold layouts of /api/share-image — same painted background,
 * card art and text-parsing helpers — so the preview appears immediately;
 * the server is only asked for the real PNG when the user downloads.
 * All dimensions use container query width units (cqw), scaled from the
 * 1080- or 1920-wide reference canvas.
 */
export default function ShareImageMock({
    aspect,
    question,
    cards,
    interpretation,
    headline,
    subtitle,
    keyMessage,
    detailedHtml,
    insights,
    cta,
    theme = "tarot",
    planets,
    verdictDate,
    videoBackgroundSrc,
}: ShareImageMockProps) {
    const isStory = aspect === "story"
    const isPost = aspect === "post"
    const isSquare = aspect === "square"
    const isLandscape = aspect === "landscape"
    const isPortraitColumn = isStory || isPost

    // Astrology posters reserve a bottom band for the painted planets and
    // (daily only) stamp the day's transit positions under each — mirrors the
    // server. The technical theme uses the orbit-wheel art, a larger band and
    // no per-planet labels.
    const isTechnical = theme === "astrology-technical"
    const isAstro =
        (theme === "astrology" || isTechnical) && !videoBackgroundSrc
    const astroBand = isAstro
        ? (isTechnical ? ASTRO_TECHNICAL_BAND_FRACTION : ASTRO_BAND_FRACTION)[
              aspect
          ]
        : 0
    const astroLabels = useMemo(
        () =>
            isAstro && !isTechnical
                ? buildAstroPlanetLabels(planets, aspect)
                : [],
        [isAstro, isTechnical, planets, aspect],
    )

    const refW = isLandscape ? 1920 : 1080
    const s = (px: number) => `${((px / refW) * 100).toFixed(3)}cqw`
    const ratioClass = isStory
        ? "aspect-[9/16]"
        : isPost
          ? "aspect-[3/4]"
          : isSquare
            ? "aspect-square"
            : "aspect-video"

    const parsedCards = useMemo(
        () =>
            cards
                .filter(Boolean)
                .slice(0, 12)
                .map((name) => ({ name, ...slugifyCardName(name) })),
        [cards],
    )
    const count = parsedCards.length

    const displayQuestion = truncate(question ?? "", isSquare ? 110 : 140)
    const displayHeadline = truncate(
        (headline ?? "").trim() || (keyMessage ?? "").trim(),
        120,
    )
    const displaySubtitle = truncate(subtitle ?? "", isSquare ? 140 : 200)

    // Same content pipeline as the server: strip card names, parse the
    // rich html, fall back to the plain interpretation, truncate.
    const blocks = useMemo<RichBlock[]>(() => {
        const budget = isAstro
            ? isSquare
                ? 0
                : isTechnical
                  ? isLandscape
                      ? 0
                      : isPost
                        ? 280
                        : 340
                  : isLandscape
                    ? 230
                    : isPost
                      ? 300
                      : 380
            : isLandscape
              ? 420
              : isSquare
                ? 0
                : isPost
                  ? count >= 4
                      ? 250
                      : 270
                  : count >= 7
                    ? 400
                    : count >= 4
                      ? 500
                      : 600
        if (budget === 0) return []
        let parsed = parseDetailedHtml(
            stripCardNamesFromHtml(detailedHtml ?? "", cards),
        )
        if (parsed.length === 0) {
            const { content } = extractKeywordsAndContent(
                truncate(interpretation ?? "", isLandscape ? 420 : 400),
            )
            const fallback = content || (interpretation ?? "").trim()
            if (fallback) {
                parsed = [{ type: "paragraph", runs: [{ text: fallback }] }]
            }
        }
        return truncateRichBlocks(parsed, budget)
    }, [
        detailedHtml,
        interpretation,
        cards,
        count,
        isAstro,
        isTechnical,
        isLandscape,
        isSquare,
        isPost,
    ])
    const detailChars = blocks.reduce(
        (sum, block) =>
            sum + block.runs.reduce((acc, run) => acc + run.text.length, 0),
        0,
    )
    const detailFontSize = isLandscape
        ? detailChars > 330
            ? 24
            : 27
        : isPost
          ? detailChars > 260
              ? 23
              : 25
          : detailChars > 430
            ? 26
            : 29

    // Card sizing mirrors the server's formulas per layout.
    const usePanels = count > 0 && count <= 6
    const perRow =
        count <= 0
            ? 1
            : isLandscape
              ? count <= 3
                  ? count
                  : count <= 6
                    ? 3
                    : Math.ceil(count / 2)
              : count <= 6
                ? count
                : Math.ceil(count / 2)
    const rowWidth = isLandscape ? 660 : 936
    const cardGap = isPortraitColumn && count <= 4 ? 18 : 14
    const panelPad = isPortraitColumn && count <= 3 && !isPost ? 14 : 10
    const maxCardW = isStory
        ? count <= 1
            ? 300
            : count === 2
              ? 256
              : count === 3
                ? 228
                : count === 4
                  ? 190
                  : 150
        : isPost
          ? count <= 1
              ? 200
              : count === 2
                ? 176
                : count === 3
                  ? 156
                  : count === 4
                    ? 136
                    : 112
          : isLandscape
            ? count <= 1
                ? 230
                : count <= 3
                  ? 184
                  : 150
            : count <= 1
              ? 190
              : count <= 3
                ? 165
                : count <= 6
                  ? 128
                  : 104
    const cardW = Math.round(
        Math.min(
            (rowWidth - (perRow - 1) * cardGap) / Math.max(perRow, 1) -
                (usePanels ? panelPad * 2 + 2 : 0),
            maxCardW,
        ),
    )
    const cardH = Math.round(cardW * 1.728)
    const labelSize = isStory
        ? count <= 3
            ? 24
            : count === 4
              ? 19
              : 15
        : isPost
          ? count <= 3
              ? 20
              : 15
          : count <= 3
            ? 19
            : 15

    const headlineFontSize = isStory
        ? displayHeadline.length <= 30
            ? 54
            : displayHeadline.length <= 60
              ? 46
              : 38
        : isPost
          ? displayHeadline.length <= 30
              ? 44
              : displayHeadline.length <= 60
                ? 38
                : 32
          : isLandscape
            ? displayHeadline.length <= 40
                ? 46
                : 38
            : displayHeadline.length <= 40
              ? 38
              : 32

    const showInsights =
        isStory &&
        count > 0 &&
        count <= 3 &&
        (insights ?? []).some((i) => i.trim().length > 0)
    const questionFontSize = isStory ? 38 : isPost ? 33 : isSquare ? 32 : 34
    const columnGap = isStory ? 26 : isPost ? 18 : isSquare ? 22 : 20
    // Mirrors the server: astrology fits the reading panel to its content and
    // hard-caps the height so the AI text truncates above the planet band.
    const astroReadingMaxH = isTechnical
        ? isLandscape
            ? 150
            : isPost
              ? 300
              : 380
        : isLandscape
          ? 212
          : isPost
            ? 320
            : 430
    const ctaText =
        truncate(cta ?? "", 70) || "Ask your own question at askingfate.com"

    const sectionLabel = (text: string, lineWidth = 84) => (
        <div
            className='flex items-center justify-center'
            style={{ gap: s(14) }}
        >
            <div
                style={{
                    width: s(lineWidth),
                    height: 1,
                    background:
                        "linear-gradient(90deg, rgba(216,181,109,0), rgba(216,181,109,0.65))",
                }}
            />
            <div
                style={{
                    width: s(7),
                    height: s(7),
                    transform: "rotate(45deg)",
                    background: GOLD_SOFT,
                }}
            />
            <div
                style={{
                    fontSize: s(21),
                    fontWeight: 700,
                    letterSpacing: s(6),
                    textTransform: "uppercase",
                    color: GOLD_SOFT,
                    whiteSpace: "nowrap",
                }}
            >
                {text}
            </div>
            <div
                style={{
                    width: s(7),
                    height: s(7),
                    transform: "rotate(45deg)",
                    background: GOLD_SOFT,
                }}
            />
            <div
                style={{
                    width: s(lineWidth),
                    height: 1,
                    background:
                        "linear-gradient(90deg, rgba(216,181,109,0.65), rgba(216,181,109,0))",
                }}
            />
        </div>
    )

    const cardRow = (
        <div
            className='flex flex-wrap items-stretch justify-center'
            style={{ gap: s(cardGap), maxWidth: "100%" }}
        >
            {parsedCards.map((card, idx) => {
                const insight =
                    showInsights && insights
                        ? truncate(insights[idx] ?? "", 90)
                        : ""
                const cardBox = (
                    <div
                        className='relative flex overflow-hidden'
                        style={{
                            width: s(cardW),
                            height: s(cardH),
                            borderRadius: s(12),
                            border: "1px solid rgba(216,181,109,0.55)",
                            background: "rgba(7,11,34,0.5)",
                        }}
                    >
                        <Image
                            src={`/assets/rider-waite-tarot-share/${card.slug}.jpg`}
                            alt={card.name}
                            fill
                            unoptimized
                            className='object-cover'
                            style={
                                card.isReversed
                                    ? { transform: "rotate(180deg)" }
                                    : undefined
                            }
                        />
                    </div>
                )
                return usePanels ? (
                    <div
                        key={`${card.slug}-${idx}`}
                        className='flex flex-col items-center'
                        style={{
                            gap: s(isPortraitColumn ? 10 : 8),
                            padding: s(panelPad),
                            paddingBottom: s(panelPad + 4),
                            borderRadius: s(isPortraitColumn ? 18 : 16),
                            background: PANEL_BG,
                            border: PANEL_BORDER,
                        }}
                    >
                        {cardBox}
                        <div
                            style={{
                                fontFamily: SERIF,
                                fontSize: s(labelSize),
                                fontWeight: 700,
                                color: GOLD_SOFT,
                                textAlign: "center",
                                lineHeight: 1.25,
                                maxWidth: s(cardW),
                            }}
                        >
                            {card.name}
                        </div>
                        {insight ? (
                            <div
                                style={{
                                    fontSize: s(17),
                                    lineHeight: 1.45,
                                    color: "rgba(255,255,255,0.72)",
                                    textAlign: "center",
                                    maxWidth: s(cardW),
                                }}
                            >
                                {insight}
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div key={`${card.slug}-${idx}`} className='flex'>
                        {cardBox}
                    </div>
                )
            })}
        </div>
    )

    const questionNode = displayQuestion ? (
        <div
            className='flex flex-col items-center text-center'
            style={{ gap: s(12), maxWidth: "100%" }}
        >
            {sectionLabel("Question")}
            <div
                style={{
                    fontFamily: SERIF,
                    fontSize: s(questionFontSize),
                    fontWeight: 800,
                    lineHeight: 1.25,
                    color: "#f6ecd2",
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    textShadow: "0 2px 10px rgba(7,11,34,0.8)",
                }}
            >
                {`"${displayQuestion}"`}
            </div>
        </div>
    ) : null

    // Timing verdicts ("when will X happen?") headline a resolved date; stamp
    // it as a gold serif crest between the question and the key message, the
    // same date that leads the in-app hero. Present only for the timing
    // strategy — every other reading passes no `verdictDate`.
    const verdictDateNode = verdictDate?.primary ? (
        <div
            className='flex flex-col items-center text-center'
            style={{ gap: s(4), maxWidth: "100%" }}
        >
            <div
                style={{
                    fontFamily: SERIF,
                    fontStyle: "italic",
                    fontSize: s(isStory ? 62 : isPost ? 54 : isSquare ? 50 : 52),
                    fontWeight: 800,
                    lineHeight: 1.05,
                    letterSpacing: s(1),
                    color: "#f4e4b0",
                    textShadow: "0 3px 18px rgba(216,181,109,0.4)",
                    whiteSpace: "nowrap",
                }}
            >
                {verdictDate.primary}
            </div>
            {verdictDate.secondary ? (
                <div
                    style={{
                        fontSize: s(22),
                        fontWeight: 600,
                        letterSpacing: s(8),
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.6)",
                        whiteSpace: "nowrap",
                    }}
                >
                    {verdictDate.secondary}
                </div>
            ) : null}
        </div>
    ) : null

    const keyMessageNode = displayHeadline ? (
        <div
            className='flex flex-col items-center overflow-hidden text-center'
            style={{
                gap: s(12),
                borderRadius: s(22),
                padding: isPortraitColumn
                    ? `${s(isPost ? 22 : 28)} ${s(40)} ${s(isPost ? 24 : 32)}`
                    : `${s(20)} ${s(38)} ${s(24)}`,
                background: PANEL_BG,
                border: PANEL_BORDER,
                maxWidth: "100%",
                ...(isSquare
                    ? { flex: 1, minHeight: 0, justifyContent: "center" }
                    : {}),
            }}
        >
            {(isStory || isSquare) && (
                <svg
                    viewBox='0 0 24 24'
                    fill='rgba(232,198,106,0.9)'
                    xmlns='http://www.w3.org/2000/svg'
                    style={{
                        width: s(isStory ? 30 : 26),
                        height: s(isStory ? 30 : 26),
                        transform: "rotate(-18deg)",
                    }}
                >
                    <path d={CRESCENT_PATH} />
                </svg>
            )}
            {sectionLabel("Key message", isPortraitColumn ? 60 : 52)}
            <div
                style={{
                    fontFamily: SERIF,
                    fontSize: s(headlineFontSize),
                    fontWeight: 800,
                    lineHeight: 1.25,
                    color: "#f8eed6",
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    textShadow: "0 2px 12px rgba(216,181,109,0.25)",
                }}
            >
                {displayHeadline}
            </div>
            {displaySubtitle ? (
                <div
                    style={{
                        fontSize: s(isStory ? 26 : isPost ? 23 : 22),
                        lineHeight: 1.45,
                        color: "rgba(255,255,255,0.72)",
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                    }}
                >
                    {displaySubtitle}
                </div>
            ) : null}
        </div>
    ) : null

    const readingNode =
        blocks.length > 0 ? (
            <div
                className='flex flex-col overflow-hidden'
                style={{
                    gap: s(14),
                    borderRadius: s(22),
                    padding: isPortraitColumn
                        ? `${s(26)} ${s(40)} ${s(30)}`
                        : `${s(20)} ${s(34)} ${s(24)}`,
                    background: PANEL_BG,
                    border: PANEL_BORDER,
                    maxWidth: "100%",
                    ...(isAstro
                        ? { maxHeight: s(astroReadingMaxH) }
                        : { flex: 1, minHeight: 0 }),
                }}
            >
                {sectionLabel("The reading", isPortraitColumn ? 60 : 52)}
                <div
                    className='flex flex-col overflow-hidden'
                    style={{
                        fontSize: s(detailFontSize),
                        lineHeight: 1.6,
                        ...(isAstro ? {} : { flex: 1, minHeight: 0 }),
                    }}
                >
                    {blocks.map((block, blockIdx) => (
                        <div
                            key={`block-${blockIdx}`}
                            style={{
                                marginTop:
                                    blockIdx === 0
                                        ? 0
                                        : s(
                                              Math.round(
                                                  detailFontSize * 0.55,
                                              ),
                                          ),
                                paddingLeft:
                                    block.type === "item" ? s(6) : 0,
                            }}
                        >
                            {block.marker ? (
                                <span
                                    style={{
                                        color: GOLD_SOFT,
                                        fontWeight: 700,
                                        marginRight: s(14),
                                    }}
                                >
                                    {block.marker}
                                </span>
                            ) : null}
                            {block.runs.map((run, runIdx) => (
                                <span
                                    key={`run-${blockIdx}-${runIdx}`}
                                    style={{
                                        color: run.gold
                                            ? "#e8c66a"
                                            : "rgba(255,255,255,0.93)",
                                        fontWeight:
                                            run.bold || run.gold ? 700 : 400,
                                        fontStyle: run.italic
                                            ? "italic"
                                            : "normal",
                                    }}
                                >
                                    {run.text}
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        ) : null

    const ctaNode = (
        <div
            className='flex items-center justify-center self-center'
            style={{
                gap: s(14),
                marginTop: isAstro || isStory ? undefined : "auto",
                padding: `${s(isStory ? 15 : 13)} ${s(isStory ? 42 : 38)}`,
                borderRadius: 9999,
                border: "1.5px solid rgba(216,181,109,0.65)",
                background: "rgba(216,181,109,0.1)",
                color: "#ecd9a8",
                fontSize: s(isStory ? 26 : 23),
                fontWeight: 600,
                whiteSpace: "nowrap",
            }}
        >
            <svg
                viewBox='0 0 24 24'
                fill='rgba(232,198,106,0.95)'
                xmlns='http://www.w3.org/2000/svg'
                style={{ width: s(22), height: s(22) }}
            >
                <path d={STAR_GLYPH_PATH} />
            </svg>
            {ctaText}
            <svg
                viewBox='0 0 24 24'
                fill='rgba(232,198,106,0.95)'
                xmlns='http://www.w3.org/2000/svg'
                style={{ width: s(22), height: s(22) }}
            >
                <path d={STAR_GLYPH_PATH} />
            </svg>
        </div>
    )

    const brandPill = (
        <div
            className='flex items-center justify-center self-center'
            style={{
                gap: s(14),
                padding: `${s(10)} ${s(26)}`,
                borderRadius: 9999,
                background: "rgba(10,16,44,0.55)",
                border: "1px solid rgba(216,181,109,0.4)",
            }}
        >
            <Image
                src='/assets/logo.png'
                alt='AskingFate logo'
                width={50}
                height={50}
                style={{ width: s(50), height: s(50) }}
            />
            <div
                style={{
                    fontFamily: SERIF,
                    fontSize: s(38),
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    color: "#ecd9a8",
                }}
            >
                AskingFate
            </div>
        </div>
    )

    return (
        <div
            className={`relative w-full ${ratioClass} overflow-hidden text-white`}
            style={{ containerType: "inline-size", background: "#0a1232" }}
        >
            {videoBackgroundSrc ? (
                <>
                    <video
                        src={videoBackgroundSrc}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className='absolute inset-0 h-full w-full object-cover'
                    />
                    {/* The painted skies bake the gold frame in; the video
                        overlay draws it, so the mock mirrors that here. */}
                    <div
                        className='pointer-events-none absolute z-10'
                        style={{
                            inset: s(22),
                            borderRadius: s(34),
                            border: "2px solid rgba(216,181,109,0.5)",
                        }}
                    />
                    <div
                        className='pointer-events-none absolute z-10'
                        style={{
                            inset: s(32),
                            borderRadius: s(26),
                            border: "1px solid rgba(216,181,109,0.26)",
                        }}
                    />
                </>
            ) : (
                <Image
                    src={`/assets/share/${theme === "astrology" ? "astrology/" : isTechnical ? "astrology-technical/" : ""}${aspect}-background.jpg`}
                    alt=''
                    fill
                    unoptimized
                    priority
                    className='object-cover'
                />
            )}
            {astroLabels.map((label) => (
                <div
                    key={`astro-${label.name}`}
                    className='absolute z-10'
                    style={{
                        left: `${(label.leftPct * 100).toFixed(2)}%`,
                        top: `${(label.topPct * 100).toFixed(2)}%`,
                        transform: "translateX(-50%)",
                    }}
                >
                    <div
                        style={{
                            padding: `${s(2)} ${s(12)}`,
                            borderRadius: 9999,
                            background: "rgba(7,11,34,0.62)",
                            border: "1px solid rgba(216,181,109,0.45)",
                            color: label.retrograde ? "#fda4af" : "#f3e2b0",
                            fontSize: s(isLandscape ? 22 : 24),
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            lineHeight: 1.2,
                        }}
                    >
                        {label.text}
                    </div>
                </div>
            ))}
            <div
                className='relative z-10 flex w-full flex-col'
                style={{
                    height: astroBand
                        ? `${((1 - astroBand) * 100).toFixed(2)}%`
                        : "100%",
                    padding: s(72),
                    boxSizing: "border-box",
                }}
            >
                <div
                    className='mx-auto flex w-full flex-col'
                    style={{
                        gap: s(isLandscape ? 20 : columnGap),
                        maxWidth: isPortraitColumn ? s(980) : "100%",
                        flex: 1,
                        minHeight: 0,
                    }}
                >
                    {brandPill}

                    {isLandscape ? (
                        <div
                            className='flex items-stretch'
                            style={{
                                gap: s(44),
                                flex: 1,
                                minHeight: 0,
                                width: "100%",
                            }}
                        >
                            {count > 0 ? (
                                <div
                                    className='flex flex-col items-center justify-center'
                                    style={{ gap: s(16), width: s(660) }}
                                >
                                    {sectionLabel("Your cards", 44)}
                                    {cardRow}
                                </div>
                            ) : null}
                            <div
                                className='flex flex-col'
                                style={{
                                    gap: s(20),
                                    flex: 1,
                                    minHeight: 0,
                                }}
                            >
                                {questionNode}
                                {verdictDateNode}
                                {keyMessageNode}
                                {readingNode}
                                {ctaNode}
                            </div>
                        </div>
                    ) : (
                        <>
                            {questionNode}
                            {verdictDateNode}
                            {count > 0 ? (
                                <div
                                    className='flex flex-col items-center'
                                    style={{
                                        gap: s(isPortraitColumn ? 18 : 14),
                                    }}
                                >
                                    {sectionLabel("Your cards")}
                                    {cardRow}
                                </div>
                            ) : null}
                            {keyMessageNode}
                            {!isSquare && readingNode}
                            {ctaNode}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
