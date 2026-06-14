<template>
  <div class="music-player-wrapper" :class="{ 'compact': compact, 'playing': isPlaying }">
    <!-- Hidden native audio element for control -->
    <audio ref="audioRef" :src="src" @timeupdate="onTimeUpdate" @loadedmetadata="onLoaded" @ended="onEnded" @play="isPlaying = true" @pause="isPlaying = false" />

    <div class="mp-controls">
      <!-- Play/Pause button -->
      <button class="mp-play-btn" @click="togglePlay" :title="isPlaying ? '暂停' : '播放'">
        <span v-if="isPlaying" class="mp-icon-pause">⏸</span>
        <span v-else class="mp-icon-play">▶</span>
      </button>

      <!-- Progress bar -->
      <div class="mp-progress-area" ref="progressArea" @click="seek">
        <div class="mp-progress-track">
          <div class="mp-progress-fill" :style="{ width: progressPercent + '%' }" />
          <div class="mp-progress-thumb" :style="{ left: progressPercent + '%' }" />
        </div>
      </div>

      <!-- Time display -->
      <span class="mp-time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>

      <!-- Volume control -->
      <div class="mp-volume-area" @mouseenter="showVolume = true" @mouseleave="showVolume = false">
        <button class="mp-vol-btn" @click="toggleMute" :title="isMuted ? '取消静音' : '静音'">
          <span v-if="isMuted || volume === 0">🔇</span>
          <span v-else-if="volume < 0.5">🔉</span>
          <span v-else>🔊</span>
        </button>
        <div class="mp-volume-slider" v-show="showVolume">
          <div class="mp-volume-track" @click="setVolume">
            <div class="mp-volume-fill" :style="{ height: (isMuted ? 0 : volume * 100) + '%' }" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  src: string
  compact?: boolean
}>()

const audioRef = ref<HTMLAudioElement>()
const progressArea = ref<HTMLElement>()
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(0.7)
const isMuted = ref(false)
const showVolume = ref(false)

const progressPercent = computed(() => {
  if (duration.value <= 0) return 0
  return (currentTime.value / duration.value) * 100
})

function onTimeUpdate() {
  if (audioRef.value) currentTime.value = audioRef.value.currentTime
}
function onLoaded() {
  if (audioRef.value) duration.value = audioRef.value.duration
}
function onEnded() {
  isPlaying.value = false
  currentTime.value = 0
}
function togglePlay() {
  if (!audioRef.value) return
  if (isPlaying.value) {
    audioRef.value.pause()
  } else {
    audioRef.value.play().catch(() => {})
  }
}
function seek(e: MouseEvent) {
  if (!audioRef.value || !progressArea.value) return
  const rect = progressArea.value.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  audioRef.value.currentTime = ratio * duration.value
}
function toggleMute() {
  if (!audioRef.value) return
  isMuted.value = !isMuted.value
  audioRef.value.muted = isMuted.value
}
function setVolume(e: MouseEvent) {
  if (!audioRef.value) return
  const track = e.currentTarget as HTMLElement
  const rect = track.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height))
  volume.value = ratio
  audioRef.value.volume = ratio
  isMuted.value = false
  audioRef.value.muted = false
}
function formatTime(t: number): string {
  if (!t || isNaN(t) || t < 0) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
</script>

<style scoped>
.music-player-wrapper {
  --mp-bg: rgba(42,40,40,0.65);
  --mp-border: rgba(255,255,255,0.08);
  --mp-accent: #3ad29f;
  --mp-text: #e8e8e8;
  --mp-text-secondary: #999;
  --mp-height: 40px;

  background: var(--mp-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--mp-border);
  border-radius: 10px;
  padding: 6px 10px;
  transition: border-color 0.3s, box-shadow 0.3s;
  font-family: inherit;
}
.music-player-wrapper:hover {
  border-color: rgba(58,210,159,0.3);
  box-shadow: 0 0 12px rgba(58,210,159,0.08);
}
.music-player-wrapper.playing {
  border-color: rgba(58,210,159,0.25);
}

.mp-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  height: var(--mp-height);
}

/* ── Play button ── */
.mp-play-btn {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(58,210,159,0.15);
  border: 1px solid rgba(58,210,159,0.25);
  border-radius: 50%;
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='rgba(124,215,238,0.9)' stroke-width='2'/%3E%3Cline x1='11' y1='16' x2='21' y2='16' stroke='rgba(124,215,238,1)' stroke-width='2.5' stroke-linecap='round'/%3E%3Cline x1='16' y1='11' x2='16' y2='21' stroke='rgba(124,215,238,1)' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E") 16 16, pointer;
  color: var(--mp-accent);
  font-size: 12px;
  flex-shrink: 0;
  transition: all 0.2s;
}
.mp-play-btn:hover {
  background: rgba(58,210,159,0.25);
  border-color: rgba(58,210,159,0.5);
  transform: scale(1.08);
}

/* ── Progress bar ── */
.mp-progress-area {
  flex: 1;
  min-width: 60px;
  height: 100%;
  display: flex;
  align-items: center;
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='rgba(124,215,238,0.9)' stroke-width='2'/%3E%3Cline x1='11' y1='16' x2='21' y2='16' stroke='rgba(124,215,238,1)' stroke-width='2.5' stroke-linecap='round'/%3E%3Cline x1='16' y1='11' x2='16' y2='21' stroke='rgba(124,215,238,1)' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E") 16 16, pointer;
}
.mp-progress-track {
  width: 100%;
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  position: relative;
  overflow: visible;
  transition: height 0.15s;
}
.mp-progress-area:hover .mp-progress-track {
  height: 6px;
}
.mp-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--mp-accent), #7cd7ee);
  border-radius: 2px;
  transition: width 0.1s linear;
}
.mp-progress-thumb {
  position: absolute;
  top: 50%;
  width: 10px; height: 10px;
  background: var(--mp-accent);
  border: 2px solid #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
.mp-progress-area:hover .mp-progress-thumb {
  opacity: 1;
}

/* ── Time display ── */
.mp-time {
  font-size: 11px;
  color: var(--mp-text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 70px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* ── Volume control ── */
.mp-volume-area {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.mp-vol-btn {
  background: none;
  border: none;
  font-size: 14px;
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='rgba(124,215,238,0.9)' stroke-width='2'/%3E%3Cline x1='11' y1='16' x2='21' y2='16' stroke='rgba(124,215,238,1)' stroke-width='2.5' stroke-linecap='round'/%3E%3Cline x1='16' y1='11' x2='16' y2='21' stroke='rgba(124,215,238,1)' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E") 16 16, pointer;
  padding: 2px;
  line-height: 1;
  color: var(--mp-text-secondary);
  transition: color 0.2s;
}
.mp-vol-btn:hover { color: var(--mp-accent); }

.mp-volume-slider {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 6px;
  padding: 8px 4px;
  background: var(--mp-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--mp-border);
  border-radius: 8px;
  box-shadow: var(--neu-shadow-sm);
  z-index: 10;
}
.mp-volume-track {
  width: 4px;
  height: 60px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  position: relative;
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='rgba(124,215,238,0.9)' stroke-width='2'/%3E%3Cline x1='11' y1='16' x2='21' y2='16' stroke='rgba(124,215,238,1)' stroke-width='2.5' stroke-linecap='round'/%3E%3Cline x1='16' y1='11' x2='16' y2='21' stroke='rgba(124,215,238,1)' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E") 16 16, pointer;
}
.mp-volume-fill {
  position: absolute;
  bottom: 0;
  width: 100%;
  background: var(--mp-accent);
  border-radius: 2px;
  transition: height 0.1s;
}
</style>
