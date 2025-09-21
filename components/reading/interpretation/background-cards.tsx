import { TarotCard } from "@/contexts/tarot-context"
import { CardImage } from "../../card-image"

const positions = [
    {
        top: "10%",
        left: "5%",
        transform: "rotate(-15deg)",
    },
    {
        top: "15%",
        right: "8%",
        transform: "rotate(20deg)",
    },
    {
        bottom: "20%",
        left: "10%",
        transform: "rotate(-10deg)",
    },
    {
        bottom: "15%",
        right: "12%",
        transform: "rotate(25deg)",
    },
    {
        top: "50%",
        left: "2%",
        transform: "rotate(-5deg)",
    },
    {
        top: "60%",
        right: "5%",
        transform: "rotate(15deg)",
    },
]

export default function BackgroundCards({
    selectedCards,
}: {
    selectedCards: TarotCard[]
}) {
    return (
        <div className='absolute inset-0 pointer-events-none'>
            {selectedCards.map((card, index) => (
                <div
                    key={`bg-${index}`}
                    className='absolute opacity-20'
                    style={positions[index % positions.length]}
                >
                    <CardImage
                        card={card}
                        size='sm'
                        showAura={true}
                        showLabel={false}
                        className='scale-75'
                    />
                </div>
            ))}
        </div>
    )
}
