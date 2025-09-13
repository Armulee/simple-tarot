import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
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
          borderRadius: '6px',
        }}
      >
        <div
          style={{
            fontSize: '24px',
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