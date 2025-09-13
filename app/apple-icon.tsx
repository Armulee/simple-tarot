import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a1a',
          borderRadius: '20px',
        }}
      >
        <div
          style={{
            fontSize: '120px',
            color: '#6366f1',
            fontWeight: 'bold',
            fontFamily: 'serif',
          }}
        >
          ✦
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}