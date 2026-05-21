"use client"

import { useMemo, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import {
    OrbitControls,
    PerspectiveCamera,
    Stars,
    useTexture,
} from "@react-three/drei"
import * as THREE from "three"

/** Stylized log-scaled radii so the inner planets stay readable next to the outers. */
const ORBIT_RADIUS: Record<string, number> = {
    Sun: 0,
    Moon: 1.5,
    Mercury: 2.4,
    Venus: 3.3,
    Earth: 4.2,
    Mars: 5.1,
    Jupiter: 6.4,
    Saturn: 7.7,
    Uranus: 8.8,
    Neptune: 9.9,
    Pluto: 11.0,
    Rahu: 12.0,
    Ketu: 12.0,
}

const PLANET_SIZE: Record<string, number> = {
    Sun: 0.65,
    Moon: 0.22,
    Mercury: 0.24,
    Venus: 0.3,
    Earth: 0.32,
    Mars: 0.28,
    Jupiter: 0.55,
    Saturn: 0.5,
    Uranus: 0.38,
    Neptune: 0.36,
    Pluto: 0.2,
    Rahu: 0.24,
    Ketu: 0.24,
}

const PLANET_TEXTURE: Record<string, string> = {
    Sun: "/assets/planetary/sun.png",
    Moon: "/assets/planetary/moon.png",
    Mercury: "/assets/planetary/mercury.png",
    Venus: "/assets/planetary/venus.png",
    Earth: "/assets/planetary/earth.png",
    Mars: "/assets/planetary/mars.png",
    Jupiter: "/assets/planetary/jupiter.png",
    Saturn: "/assets/planetary/saturn.png",
    Uranus: "/assets/planetary/uranus.png",
    Neptune: "/assets/planetary/neptune.png",
    Pluto: "/assets/planetary/pluto.png",
    Rahu: "/assets/planetary/rahu.png",
    Ketu: "/assets/planetary/rahu.png",
}

const ZODIAC_CANONICAL = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
] as const

const ZODIAC_ALIAS: Record<string, string> = {
    เมษ: "Aries",
    พฤษภ: "Taurus",
    มิถุน: "Gemini",
    กรกฎ: "Cancer",
    สิงห์: "Leo",
    กันย์: "Virgo",
    ตุลย์: "Libra",
    พิจิก: "Scorpio",
    ธนู: "Sagittarius",
    มกร: "Capricorn",
    มังกร: "Capricorn",
    กุมภ์: "Aquarius",
    มีน: "Pisces",
}

type OrbitPoint = {
    sign?: string | null
    degree?: number | string | null
    longitude?: number | string | null
}

/** Resolve a 0..360 ecliptic longitude from a chart point. */
function planetLongitude(point: unknown): number | null {
    if (!point || typeof point !== "object") return null
    const p = point as OrbitPoint
    const direct = Number(p.longitude)
    if (Number.isFinite(direct)) return ((direct % 360) + 360) % 360
    const sign = typeof p.sign === "string" ? p.sign : null
    const degree = Number(p.degree)
    if (!sign || !Number.isFinite(degree)) return null
    const canonical = ZODIAC_CANONICAL.includes(
        sign as (typeof ZODIAC_CANONICAL)[number],
    )
        ? sign
        : ZODIAC_ALIAS[sign]
    if (!canonical) return null
    const idx = ZODIAC_CANONICAL.indexOf(
        canonical as (typeof ZODIAC_CANONICAL)[number],
    )
    if (idx < 0) return null
    return (idx * 30 + degree) % 360
}

type PlacedPlanet = {
    name: string
    /** Texture path. */
    texture: string
    /** Orbit radius in scene units. */
    radius: number
    /** Sphere radius in scene units. */
    size: number
    /** Ecliptic longitude in radians (0 = +X axis). */
    theta: number
    highlighted: boolean
}

function ZodiacRing() {
    const points = useMemo(() => {
        const pts: THREE.Vector3[] = []
        const segments = 96
        const r = 12.4
        for (let i = 0; i <= segments; i++) {
            const a = (i / segments) * Math.PI * 2
            pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r))
        }
        return pts
    }, [])
    const geometry = useMemo(
        () => new THREE.BufferGeometry().setFromPoints(points),
        [points],
    )
    return (
        <line>
            <primitive object={geometry} attach='geometry' />
            <lineBasicMaterial
                attach='material'
                color='#a78bfa'
                transparent
                opacity={0.35}
            />
        </line>
    )
}

function OrbitLine({ radius }: { radius: number }) {
    const points = useMemo(() => {
        const pts: THREE.Vector3[] = []
        const segments = 96
        for (let i = 0; i <= segments; i++) {
            const a = (i / segments) * Math.PI * 2
            pts.push(
                new THREE.Vector3(
                    Math.cos(a) * radius,
                    0,
                    Math.sin(a) * radius,
                ),
            )
        }
        return pts
    }, [radius])
    const geometry = useMemo(
        () => new THREE.BufferGeometry().setFromPoints(points),
        [points],
    )
    return (
        <line>
            <primitive object={geometry} attach='geometry' />
            <lineBasicMaterial
                attach='material'
                color='#ffffff'
                transparent
                opacity={0.08}
            />
        </line>
    )
}

function PlanetBody({ planet }: { planet: PlacedPlanet }) {
    const texture = useTexture(planet.texture)
    const meshRef = useRef<THREE.Mesh>(null)
    // Slow self-rotation gives the bodies life without hiding the texture.
    useFrame((_, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.1
        }
    })
    const x = Math.cos(planet.theta) * planet.radius
    const z = Math.sin(planet.theta) * planet.radius

    return (
        <group position={[x, 0, z]}>
            {planet.highlighted ? (
                <mesh>
                    <sphereGeometry args={[planet.size * 1.6, 32, 32]} />
                    <meshBasicMaterial
                        color='#fbbf24'
                        transparent
                        opacity={0.18}
                    />
                </mesh>
            ) : null}
            <mesh ref={meshRef}>
                <sphereGeometry args={[planet.size, 48, 48]} />
                <meshStandardMaterial
                    map={texture}
                    emissive={planet.name === "Sun" ? "#fcd34d" : "#000000"}
                    emissiveIntensity={planet.name === "Sun" ? 0.8 : 0}
                    roughness={0.85}
                    metalness={0.05}
                />
            </mesh>
            {planet.name === "Sun" ? (
                <pointLight
                    intensity={1.5}
                    distance={50}
                    decay={1.5}
                    color='#fde68a'
                />
            ) : null}
        </group>
    )
}

function CenterStar() {
    return (
        <>
            {/* Subtle ambient + a key light so non-Sun planets aren't pitch black. */}
            <ambientLight intensity={0.18} color='#c7d2fe' />
            <directionalLight
                position={[8, 12, 6]}
                intensity={0.4}
                color='#e2e8f0'
            />
        </>
    )
}

export type Orbit3DSceneProps = {
    /** Planet payload keyed by canonical English planet name. */
    planets?: Record<string, unknown> | null
    /** Optional list of planet names to highlight with an amber halo. */
    highlightPlanets?: ReadonlyArray<string>
}

export default function Orbit3DScene({
    planets,
    highlightPlanets,
}: Orbit3DSceneProps) {
    const highlightSet = useMemo(
        () => new Set(highlightPlanets ?? []),
        [highlightPlanets],
    )

    const placed = useMemo<PlacedPlanet[]>(() => {
        const list: PlacedPlanet[] = []
        const seen = new Set<string>()
        if (planets) {
            for (const [name, value] of Object.entries(planets)) {
                if (name === "Ascendant") continue
                const radius = ORBIT_RADIUS[name]
                const texture = PLANET_TEXTURE[name]
                const size = PLANET_SIZE[name] ?? 0.3
                if (radius === undefined || !texture) continue
                const lng = planetLongitude(value)
                if (lng === null) continue
                const theta = (lng * Math.PI) / 180
                list.push({
                    name,
                    texture,
                    radius,
                    size,
                    theta,
                    highlighted: highlightSet.has(name),
                })
                seen.add(name)
            }
        }
        // Always show the Sun if it wasn't in the payload (acts as the
        // anchor at the center). The Earth is intentionally omitted —
        // natal / transit charts are geocentric, so Earth is the camera.
        if (!seen.has("Sun")) {
            list.push({
                name: "Sun",
                texture: PLANET_TEXTURE.Sun,
                radius: 0,
                size: PLANET_SIZE.Sun,
                theta: 0,
                highlighted: highlightSet.has("Sun"),
            })
        }
        return list
    }, [planets, highlightSet])

    const orbitRadii = useMemo(() => {
        const set = new Set<number>()
        for (const p of placed) {
            if (p.radius > 0) set.add(p.radius)
        }
        return Array.from(set).sort((a, b) => a - b)
    }, [placed])

    return (
        <Canvas
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true }}
            className='!h-full !w-full'
        >
            <color attach='background' args={["#04060f"]} />
            <fog attach='fog' args={["#04060f", 24, 60]} />

            <PerspectiveCamera makeDefault position={[0, 11, 18]} fov={45} />
            <OrbitControls
                enablePan={false}
                enableDamping
                dampingFactor={0.08}
                minDistance={6}
                maxDistance={40}
                minPolarAngle={Math.PI / 6}
                maxPolarAngle={Math.PI / 2.05}
                target={[0, 0, 0]}
            />

            <Stars
                radius={80}
                depth={50}
                count={3500}
                factor={3.5}
                saturation={0}
                fade
                speed={0.3}
            />

            <CenterStar />
            <ZodiacRing />
            {orbitRadii.map((r) => (
                <OrbitLine key={r} radius={r} />
            ))}
            {placed.map((planet) => (
                <PlanetBody key={planet.name} planet={planet} />
            ))}
        </Canvas>
    )
}
