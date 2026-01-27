export function SolarSystem({ className = "w-6 h-6" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 300 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Solar System with planets in order */}
            <defs>
                {/* Sun glow */}
                <radialGradient id="sunGlow">
                    <stop offset="0%" stopColor="#FDB813" />
                    <stop offset="50%" stopColor="#FD8D13" />
                    <stop offset="100%" stopColor="#FC6D13" />
                </radialGradient>
                
                {/* Jupiter gradient */}
                <linearGradient id="jupiterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#E8D4B0" />
                    <stop offset="50%" stopColor="#D4A574" />
                    <stop offset="100%" stopColor="#C89B5C" />
                </linearGradient>
                
                {/* Saturn gradient */}
                <linearGradient id="saturnGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#F4E7D7" />
                    <stop offset="50%" stopColor="#E6D5BE" />
                    <stop offset="100%" stopColor="#D4C3A8" />
                </linearGradient>
            </defs>
            
            {/* Sun */}
            <circle cx="20" cy="50" r="12" fill="url(#sunGlow)" />
            <circle cx="20" cy="50" r="12" fill="#FDB813" opacity="0.3" />
            
            {/* Mercury - Gray */}
            <circle cx="50" cy="50" r="3" fill="#8C8C8C" />
            
            {/* Venus - Pale Yellow */}
            <circle cx="70" cy="50" r="5" fill="#FFC649" />
            
            {/* Earth - Blue/Green */}
            <circle cx="95" cy="50" r="5.5" fill="#4A90E2" />
            <path d="M 92 48 Q 95 47 98 49" stroke="#7CB342" strokeWidth="1.5" fill="none" />
            
            {/* Mars - Red */}
            <circle cx="120" cy="50" r="4" fill="#E27B58" />
            
            {/* Jupiter - Tan with bands */}
            <circle cx="155" cy="50" r="11" fill="url(#jupiterGrad)" />
            <ellipse cx="155" cy="46" rx="9" ry="1.5" fill="#C89B5C" opacity="0.6" />
            <ellipse cx="155" cy="51" rx="10" ry="1.2" fill="#B88A50" opacity="0.5" />
            <ellipse cx="155" cy="55" rx="9" ry="1.3" fill="#C89B5C" opacity="0.5" />
            {/* Great Red Spot */}
            <ellipse cx="160" cy="52" rx="2.5" ry="2" fill="#D47B5C" opacity="0.8" />
            
            {/* Saturn - Pale tan with rings */}
            <circle cx="195" cy="50" r="9" fill="url(#saturnGrad)" />
            <ellipse cx="195" cy="50" rx="15" ry="3" fill="none" stroke="#E6D5BE" strokeWidth="1.5" opacity="0.8" />
            <ellipse cx="195" cy="50" rx="13" ry="2.2" fill="none" stroke="#D4C3A8" strokeWidth="1" opacity="0.6" />
            
            {/* Uranus - Light blue */}
            <circle cx="230" cy="50" r="7" fill="#4FD0E7" />
            
            {/* Neptune - Deep blue */}
            <circle cx="260" cy="50" r="7" fill="#4166F5" />
        </svg>
    )
}
