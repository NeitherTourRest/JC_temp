<template>
  <router-view />
  <canvas ref="cometCanvas" class="comet-canvas"></canvas>
</template>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/authStore'

const auth = useAuthStore()
const cometCanvas = ref<HTMLCanvasElement | null>(null)
let animId = 0

onMounted(() => {
  auth.checkAuth()
  initComet()
})

onBeforeUnmount(() => cancelAnimationFrame(animId))

/* ── Mouse comet trail ── */
interface Particle { x: number; y: number; age: number; maxAge: number }
const particles: Particle[] = []
const MAX_PARTICLES = 20
const TRAIL_LENGTH = 18

function initComet() {
  const canvas = cometCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  function resize() {
    canvas!.width = window.innerWidth
    canvas!.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  let mx = -100, my = -100
  document.addEventListener('mousemove', (e) => {
    mx = e.clientX
    my = e.clientY
    particles.push({ x: mx, y: my, age: 0, maxAge: TRAIL_LENGTH })
    if (particles.length > MAX_PARTICLES) particles.shift()
  })

  function draw() {
    ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.age++
      if (p.age > p.maxAge) { particles.splice(i, 1); continue }
      const progress = p.age / p.maxAge
      const opacity = (1 - progress) * 0.6
      const size = (1 - progress) * 5 + 1
      ctx!.beginPath()
      ctx!.arc(p.x, p.y, size, 0, Math.PI * 2)
      ctx!.fillStyle = `rgba(124, 215, 238, ${opacity})`
      ctx!.fill()
    }
    animId = requestAnimationFrame(draw)
  }
  draw()
}
</script>
<style>
.comet-canvas {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
}
</style>
