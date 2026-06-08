with open(r'D:\JC\frontend\src\views\diary\DiaryEditorView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

old = '''// \u2500\u2500 Image upload \u2500\u2500
async function handleImageSelect(file: any) {
  const reader = new FileReader()
  reader.onload = (e) => { form.value.images.push(e.target?.result as string) }
  reader.readAsDataURL(file.raw)
}

function removeImage(idx: number) {
  form.value.images.splice(idx, 1)
}

// \u2500\u2500 Video upload \u2500\u2500
async function handleVideoSelect(file: any) {
  try {
    console.log('Uploading video:', file.name, file.raw?.size)
    const r = await fileApi.upload(file.raw)
    console.log('Upload response:', r.data)
    const data = r.data.data
    form.value.videoUrl = data.url
    form.value.videoMeta = { url: data.url, thumbnail: '' }
    ElMessage.success('\u89c6\u9891\u4e0a\u4f20\u6210\u529f')
  } catch (e: any) {
    console.error('Video upload error:', e)
    const msg = e?.response?.data?.message || e?.message || '\u89c6\u9891\u4e0a\u4f20\u5931\u8d25'
    ElMessage.error(msg)
  }
}'''

new_text = '''// \u2500\u2500 Image upload \u2500\u2500
const imageInput = ref<HTMLInputElement>()
const uploadingImage = ref(false)

async function onImageFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  uploadingImage.value = true
  try {
    const r = await fileApi.upload(file)
    if (r.data.data?.url) form.value.images.push(r.data.data.url)
    ElMessage.success('\u56fe\u7247\u4e0a\u4f20\u6210\u529f')
  } catch { ElMessage.error('\u56fe\u7247\u4e0a\u4f20\u5931\u8d25') }
  finally { uploadingImage.value = false; (input as any).value = '' }
}

function removeImage(idx: number) {
  form.value.images.splice(idx, 1)
}

// \u2500\u2500 Video upload \u2500\u2500
const videoInput = ref<HTMLInputElement>()
const uploadingVideo = ref(false)

async function onVideoFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  uploadingVideo.value = true
  try {
    const r = await fileApi.upload(file)
    if (r.data.data?.url) {
      form.value.videoUrl = r.data.data.url
      form.value.videoMeta = { url: r.data.data.url, thumbnail: '' }
    }
    ElMessage.success('\u89c6\u9891\u4e0a\u4f20\u6210\u529f')
  } catch { ElMessage.error('\u89c6\u9891\u4e0a\u4f20\u5931\u8d25') }
  finally { uploadingVideo.value = false; (input as any).value = '' }
}'''

if old in content:
    content = content.replace(old, new_text)
    with open(r'D:\JC\frontend\src\views\diary\DiaryEditorView.vue', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Replaced successfully')
else:
    print('Old text not found - checking by line...')
    # Find what doesn't match
    for keyword in ['handleImageSelect', 'handleVideoSelect', 'removeImage']:
        if keyword in content:
            idx = content.find(keyword)
            print(f'  {keyword} found at {idx}')
        else:
            print(f'  {keyword} NOT FOUND')
