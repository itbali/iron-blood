import { useEffect, useRef } from 'react'

export interface GameContainerProps {
  width?: number
  height?: number
  children?: React.ReactNode
}

export function GameContainer({ width = 1920, height = 1080, children }: GameContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const handleResize = () => {
      const container = containerRef.current
      if (!container) return

      const vw = window.innerWidth
      const vh = window.innerHeight
      const gameRatio = width / height
      const screenRatio = vw / vh

      let w: number, h: number
      if (screenRatio > gameRatio) {
        h = vh
        w = vh * gameRatio
      } else {
        w = vw
        h = vw / gameRatio
      }

      container.style.width = `${w}px`
      container.style.height = `${h}px`
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [width, height])

  return (
    <div
      ref={containerRef}
      style={{
        margin: '0 auto',
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        overflow: 'hidden',
        background: '#000'
      }}
    >
      {children}
    </div>
  )
}
