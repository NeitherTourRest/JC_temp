<template>
  <div class="rich-editor">
    <div class="editor-toolbar">
      <div class="toolbar-group">
        <button class="tb-btn" title="加粗" @click="exec('bold')"><strong>B</strong></button>
        <button class="tb-btn" title="斜体" @click="exec('italic')"><em>I</em></button>
        <button class="tb-btn" title="下划线" @click="exec('underline')"><u>U</u></button>
      </div>
      <div class="toolbar-group">
        <select class="tb-select" title="字体" v-model="fontFamily" @change="setFontFamily">
          <option value="Lucida Console">Lucida Console</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="SimSun, serif">宋体</option>
          <option value="SimHei, sans-serif">黑体</option>
          <option value="Microsoft YaHei, sans-serif">微软雅黑</option>
          <option value="KaiTi, serif">楷体</option>
        </select>
        <select class="tb-select" title="字号" v-model="fontSize" @change="setFontSize">
          <option value="12">12px</option>
          <option value="14">14px</option>
          <option value="16" selected>16px</option>
          <option value="18">18px</option>
          <option value="24">24px</option>
          <option value="32">32px</option>
          <option value="48">48px</option>
        </select>
        <input type="color" class="tb-color" title="文字颜色" v-model="textColor" @input="setColor" />
      </div>
      <div class="toolbar-group">
        <button class="tb-btn" title="左对齐" @click="exec('justifyLeft')">≡</button>
        <button class="tb-btn" title="居中" @click="exec('justifyCenter')">≡</button>
        <button class="tb-btn" title="右对齐" @click="exec('justifyRight')">≡</button>
      </div>
      <div class="toolbar-group">
        <button class="tb-btn" title="插入图片" @click="triggerImageUpload">🖼️</button>
        <button class="tb-btn" title="插入视频" @click="triggerVideoUpload">🎬</button>
      </div>
      <div class="toolbar-group">
        <button class="tb-btn" title="清除格式" @click="exec('removeFormat')">🧹</button>
      </div>
    </div>

    <div
      ref="editorRef"
      class="editor-content"
      contenteditable="true"
      @input="onInput"
      @paste="onPaste"
    ></div>

    <input ref="imageInputRef" type="file" accept="image/*" style="display:none" @change="onImageSelected" />
    <input ref="videoInputRef" type="file" accept="video/*" style="display:none" @change="onVideoSelected" />

    <div v-if="uploading" class="editor-upload-overlay">
      <div class="editor-upload-box glass-sm">
        <span class="upload-spinner"></span>
        <span>{{ uploadStatus }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { fileApi } from '@/api/aiGenApi'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

/** Insert HTML at cursor position in the editor. Called by parent component. */
function insertHTML(html: string) {
  saveSelection()
  restoreSelection()
  const sel = window.getSelection()
  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0)
    range.deleteContents()
    const el = document.createElement('div')
    el.innerHTML = html
    const fragment = document.createDocumentFragment()
    let child: Node | null
    while ((child = el.firstChild)) {
      fragment.appendChild(child)
    }
    range.insertNode(fragment)
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
  }
  editorRef.value?.focus()
  emitContent()
}

defineExpose({ insertHTML })

const editorRef = ref<HTMLDivElement>()
const imageInputRef = ref<HTMLInputElement>()
const videoInputRef = ref<HTMLInputElement>()
const uploading = ref(false)
const uploadStatus = ref('')
const fontFamily = ref('Lucida Console')
const fontSize = ref('16')
const textColor = ref('#ffffff')

// Selection bookmark — store as node path + offset for robustness
let bookmark: { path: number[]; offset: number } | null = null

function saveSelection() {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount || !editorRef.value) return
  const range = sel.getRangeAt(0)
  bookmark = {
    path: getNodePath(editorRef.value, range.startContainer),
    offset: range.startOffset,
  }
}

function restoreSelection() {
  if (!bookmark || !editorRef.value) return
  const node = resolveNodePath(editorRef.value, bookmark.path)
  if (!node) return
  const sel = window.getSelection()
  if (!sel) return
  try {
    const range = document.createRange()
    range.setStart(node, bookmark.offset)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
  } catch {
    // Graceful fallback
  }
  editorRef.value.focus()
}

function getNodePath(root: Node, target: Node): number[] {
  const path: number[] = []
  let current: Node = target
  while (current !== root) {
    const parent = current.parentNode
    if (!parent) break
    const children = parent.childNodes
    for (let i = 0; i < children.length; i++) {
      if (children[i] === current) {
        path.unshift(i)
        break
      }
    }
    current = parent
  }
  return path
}

function resolveNodePath(root: Node, path: number[]): Node | null {
  let node: Node = root
  for (const idx of path) {
    if (idx >= 0 && idx < node.childNodes.length) {
      node = node.childNodes[idx]
    } else {
      return node
    }
  }
  return node
}

function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value)
  editorRef.value?.focus()
  emitContent()
}

function setFontFamily() {
  document.execCommand('styleWithCSS', true)
  document.execCommand('fontName', false, fontFamily.value)
  editorRef.value?.focus()
}

function setFontSize() {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount || sel.isCollapsed || !editorRef.value) {
    const sizeMap: Record<string, string> = { '12': '1', '14': '2', '16': '3', '18': '4', '24': '5', '32': '6', '48': '7' }
    document.execCommand('fontSize', false, sizeMap[fontSize.value] || '3')
    editorRef.value?.focus()
    return
  }
  const range = sel.getRangeAt(0)
  const selectedText = range.extractContents()
  const span = document.createElement('span')
  span.style.fontSize = fontSize.value + 'px'
  span.appendChild(selectedText)
  range.insertNode(span)
  sel.removeAllRanges()
  sel.addRange(range)
  emitContent()
}

function setColor() {
  document.execCommand('styleWithCSS', true)
  document.execCommand('foreColor', false, textColor.value)
  editorRef.value?.focus()
}

function triggerImageUpload() {
  saveSelection()
  imageInputRef.value?.click()
}

function triggerVideoUpload() {
  saveSelection()
  videoInputRef.value?.click()
}

async function onImageSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) return
  input.value = ''
  await uploadAndInsert(file, 'image')
}

async function onVideoSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) return
  input.value = ''
  await uploadAndInsert(file, 'video')
}

async function uploadAndInsert(file: File, type: 'image' | 'video') {
  uploading.value = true
  uploadStatus.value = `正在上传 ${type === 'image' ? '图片' : '视频'}...`
  try {
    const res = await fileApi.upload(file)
    const url = res.data.data?.url
    if (!url) throw new Error('No URL returned')

    uploadStatus.value = '正在插入...'

    // Restore cursor position from bookmark
    restoreSelection()

    // Insert the media element at cursor via DOM
    const sel = window.getSelection()
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0)
      if (type === 'image') {
        const el = document.createElement('img')
        el.src = url
        el.alt = '上传图片'
        el.style.cssText = 'max-width:100%;border-radius:8px;margin:8px 0;display:block'
        range.deleteContents()
        range.insertNode(el)
        range.setStartAfter(el)
      } else {
        const el = document.createElement('video')
        el.src = url
        el.controls = true
        el.preload = 'metadata'
        el.style.cssText = 'max-width:100%;max-height:400px;border-radius:8px;margin:8px 0;display:block'
        range.deleteContents()
        range.insertNode(el)
        range.setStartAfter(el)
      }
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    }

    emitContent()
  } catch (e) {
    console.error(`上传 ${type} 失败:`, e)
    uploadStatus.value = '上传失败'
    await new Promise(r => setTimeout(r, 1000))
  } finally {
    uploading.value = false
  }
}

function onInput() {
  emitContent()
}

function onPaste(e: ClipboardEvent) {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain')
  if (text) {
    document.execCommand('insertText', false, text)
  }
}

function emitContent() {
  if (editorRef.value) {
    emit('update:modelValue', editorRef.value.innerHTML)
  }
}

// Set initial content once on mount — never re-set from outside to avoid cursor jumps
onMounted(() => {
  if (editorRef.value) {
    editorRef.value.innerHTML = props.modelValue || ''
  }
})
</script>

<style scoped>
.rich-editor {
  position: relative;
  border: 1px solid var(--frosted-border);
  border-radius: var(--radius-card);
  overflow: hidden;
  background: var(--frosted-bg);
}
.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--frosted-border);
  background: rgba(0,0,0,0.15);
  align-items: center;
}
.toolbar-group {
  display: flex;
  gap: 2px;
  align-items: center;
  padding-right: 8px;
  border-right: 1px solid var(--frosted-border);
}
.toolbar-group:last-child { border-right: none; }
.tb-btn {
  width: 32px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid transparent; border-radius: 4px;
  color: var(--text-regular); font-family: inherit; font-size: 13px;
  cursor: pointer; transition: all 0.15s;
}
.tb-btn:hover { background: rgba(255,255,255,0.08); border-color: var(--frosted-border); color: var(--text-primary); }
.tb-select {
  height: 26px; background: rgba(0,0,0,0.2); border: 1px solid var(--frosted-border);
  border-radius: 4px; color: var(--text-regular); font-family: inherit;
  font-size: 12px; padding: 0 4px; cursor: pointer; outline: none;
}
.tb-select:hover { border-color: rgba(124,215,238,0.3); }
.tb-select option { background: #1e1e1e; color: #e0e0e0; }
.tb-color {
  width: 28px; height: 26px; border: 1px solid var(--frosted-border);
  border-radius: 4px; background: transparent; cursor: pointer; padding: 1px;
}
.tb-color::-webkit-color-swatch-wrapper { padding: 0; }
.tb-color::-webkit-color-swatch { border: none; border-radius: 3px; }
.editor-content {
  min-height: 300px; max-height: 600px; overflow-y: auto;
  padding: 16px 20px; font-size: 15px; line-height: 1.8;
  color: var(--text-primary); outline: none;
  font-family: 'Lucida Console', monospace;
  word-wrap: break-word; overflow-wrap: break-word;
}
.editor-content:empty::before {
  content: attr(data-placeholder);
  color: var(--text-muted); pointer-events: none;
}
.editor-content img {
  max-width: 100%; border-radius: 8px; margin: 8px 0; display: block;
}
.editor-content video {
  max-width: 100%; max-height: 400px; border-radius: 8px; margin: 8px 0; display: block;
}
.editor-upload-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; z-index: 10;
}
.editor-upload-box {
  padding: 20px 32px; display: flex; align-items: center;
  gap: 12px; font-size: 14px; color: var(--text-regular);
}
.upload-spinner {
  width: 20px; height: 20px;
  border: 2px solid var(--frosted-border);
  border-top-color: #7cd7ee;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
