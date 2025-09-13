import { ImageResponse } from 'next/og'

export const alt = 'Asking Fate - AI Tarot Reading'
export const size = {
  width: 1200,
  height: 600,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a1a',
          backgroundImage: 'radial-gradient(circle at 20% 80%, #6366f1 0%, transparent 50%), radial-gradient(circle at 80% 20%, #8b5cf6 0%, transparent 50%)',
          position: 'relative',
        }}
      >
        {/* Background stars */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              radial-gradient(2px 2px at 20px 30px, #fff, transparent),
              radial-gradient(2px 2px at 40px 70px, #fff, transparent),
              radial-gradient(1px 1px at 90px 40px, #fff, transparent),
              radial-gradient(1px 1px at 130px 80px, #fff, transparent),
              radial-gradient(2px 2px at 160px 30px, #fff, transparent)
            `,
            backgroundRepeat: 'repeat',
            backgroundSize: '200px 100px',
            opacity: 0.3,
          }}
        />
        
        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '40px',
            maxWidth: '900px',
          }}
        >
          {/* Logo/Icon */}
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '30px',
              border: '3px solid #6366f1',
            }}
          >
            <div
              style={{
                fontSize: '50px',
                color: '#6366f1',
                fontWeight: 'bold',
              }}
            >
              ✦
            </div>
          </div>

          {/* Main title */}
          <h1
            style={{
              fontSize: '60px',
              fontWeight: 'bold',
              color: '#ffffff',
              margin: '0 0 15px 0',
              fontFamily: 'serif',
              lineHeight: 1.1,
            }}
          >
            Asking Fate
          </h1>

          {/* Subtitle */}
          <h2
            style={{
              fontSize: '28px',
              fontWeight: '600',
              color: '#e5e7eb',
              margin: '0 0 25px 0',
              lineHeight: 1.2,
            }}
          >
            AI-Powered Tarot Reading
          </h2>

          {/* Description */}
          <p
            style={{
              fontSize: '20px',
              color: '#9ca3af',
              margin: '0 0 30px 0',
              lineHeight: 1.4,
              maxWidth: '700px',
            }}
          >
            Get free AI tarot card readings and spiritual guidance. Ask questions about your destiny and receive personalized insights.
          </p>

          {/* Call to action */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              marginTop: '15px',
            }}
          >
            <div
              style={{
                backgroundColor: '#6366f1',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              Free AI Tarot Reading
            </div>
            <div
              style={{
                color: '#8b5cf6',
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              ✨ Spiritual Guidance
            </div>
          </div>
        </div>

        {/* Bottom gradient */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '150px',
            background: 'linear-gradient(to top, #0a0a1a, transparent)',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}