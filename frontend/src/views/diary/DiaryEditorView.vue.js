/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus, Delete, Location, Flag, Document, VideoCamera } from '@element-plus/icons-vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { diaryApi } from '@/api/diaryApi';
import { spotApi } from '@/api/spotApi';
import { aiGenApi, fileApi } from '@/api/aiGenApi';
const route = useRoute();
const router = useRouter();
// ── 模式判断 ──
const isEditMode = computed(() => !!route.params.id);
const diaryId = computed(() => route.params.id);
// ── 响应式 ──
const isMobile = ref(window.innerWidth < 768);
window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 768;
});
// ── 表单 ──
const formRef = ref();
const saving = ref(false);
const loading = ref(false);
const form = ref({
    title: '',
    content: '',
    destination: '',
    images: [],
    spotId: null,
    isPublic: true,
});
const rules = {
    title: [
        { required: true, message: '请输入日记标题', trigger: 'blur' },
        { min: 2, max: 100, message: '标题长度在 2 到 100 个字符', trigger: 'blur' },
    ],
    content: [
        { required: true, message: '请输入日记内容', trigger: 'blur' },
        { min: 10, message: '内容至少 10 个字符', trigger: 'blur' },
    ],
};
// ── 景点搜索 ──
const spotOptions = ref([]);
const spotLoading = ref(false);
let searchTimer = null;
const selectedSpotName = computed(() => {
    if (!form.value.spotId)
        return '';
    const spot = spotOptions.value.find((s) => s.id === form.value.spotId);
    return spot?.name ?? '';
});
async function searchSpots(query) {
    if (!query || query.length < 1) {
        spotOptions.value = [];
        return;
    }
    spotLoading.value = true;
    if (searchTimer)
        clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
        try {
            const res = await spotApi.search({ keyword: query, size: 20 });
            spotOptions.value = res.data.data.content ?? [];
        }
        catch {
            spotOptions.value = [];
        }
        finally {
            spotLoading.value = false;
        }
    }, 300);
}
// ── 图片处理 ──
const imageInput = ref();
const uploadingImage = ref(false);
async function onImageFileChange(e) {
    const input = e.target;
    if (!input.files?.length)
        return;
    const file = input.files[0];
    if (file.size > 10 * 1024 * 1024) {
        ElMessage.warning('图片大小不能超过 10MB');
        return;
    }
    uploadingImage.value = true;
    try {
        const r = await fileApi.upload(file);
        if (r.data.data?.url)
            form.value.images.push(r.data.data.url);
        ElMessage.success('图片上传成功');
    }
    catch {
        ElMessage.error('图片上传失败');
    }
    finally {
        uploadingImage.value = false;
        input.value = '';
    }
}
function removeImage(idx) {
    form.value.images.splice(idx, 1);
}
// ── Video upload ──
const videoInput = ref();
const uploadingVideo = ref(false);
async function onVideoFileChange(e) {
    const input = e.target;
    if (!input.files?.length)
        return;
    const file = input.files[0];
    if (file.size > 200 * 1024 * 1024) {
        ElMessage.warning('视频大小不能超过 200MB');
        input.value = '';
        return;
    }
    uploadingVideo.value = true;
    try {
        const r = await fileApi.upload(file);
        if (r.data.data?.url) {
            form.value.videoUrl = r.data.data.url;
            form.value.videoMeta = { url: r.data.data.url, thumbnail: '' };
            ElMessage.success('视频上传成功');
        }
        else {
            ElMessage.error('上传返回数据异常');
        }
    }
    catch (e) {
        const msg = e?.response?.status === 413 ? '视频文件过大，请压缩后上传' : '视频上传失败';
        ElMessage.error(msg);
    }
    finally {
        uploadingVideo.value = false;
        input.value = '';
    }
}
// ── AI Image generation ──
const aiImagePrompt = ref('');
const aiImageLoading = ref(false);
const aiImageResult = ref('');
async function genImage() {
    if (!aiImagePrompt.value.trim())
        return;
    aiImageLoading.value = true;
    aiImageResult.value = '';
    try {
        const r = await aiGenApi.generateImage(aiImagePrompt.value);
        if (r.data.data?.imageUrl)
            aiImageResult.value = r.data.data.imageUrl;
        else
            ElMessage.error('生成失败');
    }
    catch {
        ElMessage.error('生成请求失败');
    }
    finally {
        aiImageLoading.value = false;
    }
}
function addAiImage() {
    if (aiImageResult.value && !form.value.images.includes(aiImageResult.value)) {
        form.value.images.push(aiImageResult.value);
        ElMessage.success('已添加到日记');
    }
}
// ── AI Music generation ──
const aiMusicPrompt = ref('');
const aiMusicLoading = ref(false);
const aiMusicResult = ref('');
async function genMusic() {
    if (!aiMusicPrompt.value.trim())
        return;
    aiMusicLoading.value = true;
    aiMusicResult.value = '';
    try {
        const r = await aiGenApi.generateMusic(aiMusicPrompt.value, '', true);
        if (r.data.data?.audioUrl)
            aiMusicResult.value = r.data.data.audioUrl;
        else
            ElMessage.error('生成失败');
    }
    catch {
        ElMessage.error('生成请求失败');
    }
    finally {
        aiMusicLoading.value = false;
    }
}
function addAiMusic() {
    if (aiMusicResult.value) {
        form.value.musicUrl = aiMusicResult.value;
        ElMessage.success('已添加到日记');
    }
}
// ── AI Video generation ──
const aiVideoPrompt = ref('');
const aiVideoLoading = ref(false);
const aiVideoTaskId = ref('');
const aiVideoStatus = ref('');
const aiVideoDownloadUrl = ref('');
async function genVideo() {
    if (!aiVideoPrompt.value.trim())
        return;
    aiVideoLoading.value = true;
    aiVideoTaskId.value = '';
    aiVideoStatus.value = '';
    aiVideoDownloadUrl.value = '';
    try {
        const r = await aiGenApi.createVideo(aiVideoPrompt.value);
        if (r.data.data?.taskId) {
            aiVideoTaskId.value = r.data.data.taskId;
            aiVideoStatus.value = 'Processing';
            ElMessage.success('视频任务已提交，点击刷新检查状态');
        }
        else
            ElMessage.error('创建失败');
    }
    catch {
        ElMessage.error('请求失败');
    }
    finally {
        aiVideoLoading.value = false;
    }
}
async function checkVideoStatus() {
    if (!aiVideoTaskId.value)
        return;
    try {
        const r = await aiGenApi.queryVideo(aiVideoTaskId.value);
        const data = r.data.data;
        aiVideoStatus.value = data.status || '';
        if (data.downloadUrl)
            aiVideoDownloadUrl.value = data.downloadUrl;
        if (data.status === 'Success' && data.downloadUrl) {
            ElMessage.success('视频生成完成！');
        }
        else if (data.status === 'Fail') {
            ElMessage.error('视频生成失败');
        }
    }
    catch {
        ElMessage.error('查询失败');
    }
}
function addAiVideo() {
    if (aiVideoDownloadUrl.value) {
        form.value.videoUrl = aiVideoDownloadUrl.value;
        form.value.videoMeta = { url: aiVideoDownloadUrl.value, thumbnail: '' };
        ElMessage.success('已添加到日记');
    }
}
// ── Preview ──
const previewMode = ref(false);
const hasContent = computed(() => form.value.title.trim() || form.value.content.trim() || form.value.images.length > 0);
const renderedContent = computed(() => {
    let text = form.value.content || '';
    // 基础 Markdown 渲染：粗体、斜体、换行
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/\n\n/g, '</p><p>');
    text = text.replace(/\n/g, '<br>');
    return `<p>${text}</p>`;
});
// ── 加载已有日记（编辑模式） ──
async function loadDiary() {
    if (!isEditMode.value || !diaryId.value)
        return;
    loading.value = true;
    try {
        const res = await diaryApi.get(diaryId.value);
        const d = res.data.data;
        form.value.title = d.title ?? '';
        form.value.content = d.content ?? '';
        form.value.destination = d.destination ?? '';
        form.value.images = d.images ?? [];
        form.value.spotId = d.spotId ?? null;
        form.value.isPublic = d.isPublic ?? true;
        // 预加载关联景点名称到下拉选项
        if (form.value.spotId) {
            try {
                const spotRes = await spotApi.getDetail(form.value.spotId);
                spotOptions.value = [spotRes.data.data];
            }
            catch { /* 景点详情加载失败不影响编辑 */ }
        }
    }
    catch {
        ElMessage.error('日记加载失败');
        router.push('/diaries');
    }
    finally {
        loading.value = false;
    }
}
// ── 保存 ──
async function handleSave() {
    const valid = await formRef.value?.validate().catch(() => false);
    if (!valid)
        return;
    saving.value = true;
    try {
        const payload = {
            title: form.value.title,
            content: form.value.content,
            destination: form.value.destination,
            images: form.value.images,
            spotId: form.value.spotId,
            isPublic: form.value.isPublic,
            musicUrl: form.value.musicUrl || undefined,
        };
        if (form.value.videoMeta)
            payload.videoMeta = form.value.videoMeta;
        if (isEditMode.value && diaryId.value) {
            await diaryApi.update(diaryId.value, payload);
            ElMessage.success('日记更新成功');
        }
        else {
            await diaryApi.create(payload);
            ElMessage.success('日记发布成功');
        }
        router.push('/diaries');
    }
    catch {
        ElMessage.error('保存失败，请稍后再试');
    }
    finally {
        saving.value = false;
    }
}
// ── 未保存更改提示 ──
const hasUnsavedChanges = computed(() => {
    return !!form.value.title || !!form.value.content || form.value.images.length > 0;
});
onBeforeRouteLeave((_to, _from, next) => {
    if (hasUnsavedChanges.value) {
        const answer = window.confirm('有未保存的更改，确定要离开吗？');
        if (!answer) {
            next(false);
            return;
        }
    }
    next();
});
window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges.value) {
        e.preventDefault();
        e.returnValue = '';
    }
});
onBeforeUnmount(() => {
    // Remove the beforeunload listener if we navigate away cleanly
});
// ── 生命周期 ──
onMounted(() => {
    loadDiary();
});
// 同组件路由切换（编辑A → 编辑B）时重新加载
watch(() => route.params.id, () => {
    if (route.params.id) {
        form.value = { title: '', content: '', destination: '', images: [], spotId: null, isPublic: true };
        spotOptions.value = [];
        loadDiary();
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['editor-header']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-body']} */ ;
/** @type {__VLS_StyleScopedClasses['image-thumb']} */ ;
/** @type {__VLS_StyleScopedClasses['upload-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-tool-header']} */ ;
/** @type {__VLS_StyleScopedClasses['upload-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['upload-trigger--wide']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-body']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-form-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-preview-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-gallery']} */ ;
/** @type {__VLS_StyleScopedClasses['image-thumb']} */ ;
/** @type {__VLS_StyleScopedClasses['is-cover']} */ ;
// CSS variable injection 
// CSS variable injection end 
/** @type {[typeof DefaultLayout, typeof DefaultLayout, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(DefaultLayout, new DefaultLayout({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
var __VLS_3 = {};
__VLS_2.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "diary-editor" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "editor-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
(__VLS_ctx.isEditMode ? '编辑日记' : '新建日记');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-actions" },
});
const __VLS_4 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    modelValue: (__VLS_ctx.previewMode),
    activeText: (__VLS_ctx.isMobile ? '预览' : ''),
    inactiveText: (__VLS_ctx.isMobile ? '编辑' : ''),
    size: "large",
}));
const __VLS_6 = __VLS_5({
    modelValue: (__VLS_ctx.previewMode),
    activeText: (__VLS_ctx.isMobile ? '预览' : ''),
    inactiveText: (__VLS_ctx.isMobile ? '编辑' : ''),
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
if (!__VLS_ctx.isMobile) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "mode-label" },
    });
    (__VLS_ctx.previewMode ? '仅预览' : '编辑 + 预览');
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "editor-body" },
    ...{ class: ({ 'stacked': __VLS_ctx.isMobile && __VLS_ctx.previewMode }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "editor-form-panel" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (!__VLS_ctx.isMobile || !__VLS_ctx.previewMode) }, null, null);
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
const __VLS_8 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onSubmit': {} },
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelPosition: "top",
}));
const __VLS_10 = __VLS_9({
    ...{ 'onSubmit': {} },
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_12;
let __VLS_13;
let __VLS_14;
const __VLS_15 = {
    onSubmit: () => { }
};
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_16 = {};
__VLS_11.slots.default;
const __VLS_18 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
    label: "标题",
    prop: "title",
}));
const __VLS_20 = __VLS_19({
    label: "标题",
    prop: "title",
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
__VLS_21.slots.default;
const __VLS_22 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent(__VLS_22, new __VLS_22({
    modelValue: (__VLS_ctx.form.title),
    placeholder: "给你的旅行日记起个名字",
    maxlength: "100",
    showWordLimit: true,
}));
const __VLS_24 = __VLS_23({
    modelValue: (__VLS_ctx.form.title),
    placeholder: "给你的旅行日记起个名字",
    maxlength: "100",
    showWordLimit: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
var __VLS_21;
const __VLS_26 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
    label: "关联景点",
}));
const __VLS_28 = __VLS_27({
    label: "关联景点",
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
__VLS_29.slots.default;
const __VLS_30 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
    modelValue: (__VLS_ctx.form.spotId),
    filterable: true,
    remote: true,
    reserveKeyword: true,
    clearable: true,
    placeholder: "搜索并选择景点（可选）",
    remoteMethod: (__VLS_ctx.searchSpots),
    loading: (__VLS_ctx.spotLoading),
    ...{ class: "spot-select" },
}));
const __VLS_32 = __VLS_31({
    modelValue: (__VLS_ctx.form.spotId),
    filterable: true,
    remote: true,
    reserveKeyword: true,
    clearable: true,
    placeholder: "搜索并选择景点（可选）",
    remoteMethod: (__VLS_ctx.searchSpots),
    loading: (__VLS_ctx.spotLoading),
    ...{ class: "spot-select" },
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
__VLS_33.slots.default;
for (const [spot] of __VLS_getVForSourceType((__VLS_ctx.spotOptions))) {
    const __VLS_34 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({
        key: (spot.id),
        label: (spot.name),
        value: (spot.id),
    }));
    const __VLS_36 = __VLS_35({
        key: (spot.id),
        label: (spot.name),
        value: (spot.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_35));
    __VLS_37.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (spot.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "spot-category" },
    });
    (spot.category);
    var __VLS_37;
}
var __VLS_33;
var __VLS_29;
const __VLS_38 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
    label: "目的地",
}));
const __VLS_40 = __VLS_39({
    label: "目的地",
}, ...__VLS_functionalComponentArgsRest(__VLS_39));
__VLS_41.slots.default;
const __VLS_42 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
    modelValue: (__VLS_ctx.form.destination),
    placeholder: "目的地（可选）",
}));
const __VLS_44 = __VLS_43({
    modelValue: (__VLS_ctx.form.destination),
    placeholder: "目的地（可选）",
}, ...__VLS_functionalComponentArgsRest(__VLS_43));
var __VLS_41;
const __VLS_46 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_47 = __VLS_asFunctionalComponent(__VLS_46, new __VLS_46({
    label: "内容",
    prop: "content",
}));
const __VLS_48 = __VLS_47({
    label: "内容",
    prop: "content",
}, ...__VLS_functionalComponentArgsRest(__VLS_47));
__VLS_49.slots.default;
const __VLS_50 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_51 = __VLS_asFunctionalComponent(__VLS_50, new __VLS_50({
    modelValue: (__VLS_ctx.form.content),
    type: "textarea",
    rows: (10),
    placeholder: "记录你的旅行故事…",
    maxlength: "5000",
    showWordLimit: true,
}));
const __VLS_52 = __VLS_51({
    modelValue: (__VLS_ctx.form.content),
    type: "textarea",
    rows: (10),
    placeholder: "记录你的旅行故事…",
    maxlength: "5000",
    showWordLimit: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_51));
var __VLS_49;
const __VLS_54 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_55 = __VLS_asFunctionalComponent(__VLS_54, new __VLS_54({
    label: "图片",
}));
const __VLS_56 = __VLS_55({
    label: "图片",
}, ...__VLS_functionalComponentArgsRest(__VLS_55));
__VLS_57.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "image-upload-area" },
});
for (const [img, idx] of __VLS_getVForSourceType((__VLS_ctx.form.images))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (idx),
        ...{ class: "image-thumb" },
        ...{ class: ({ 'is-cover': idx === 0 }) },
    });
    const __VLS_58 = {}.ElImage;
    /** @type {[typeof __VLS_components.ElImage, typeof __VLS_components.elImage, ]} */ ;
    // @ts-ignore
    const __VLS_59 = __VLS_asFunctionalComponent(__VLS_58, new __VLS_58({
        src: (img),
        fit: "cover",
        ...{ class: "thumb-img" },
        previewTeleported: true,
        previewSrcList: (__VLS_ctx.form.images),
        initialIndex: (idx),
    }));
    const __VLS_60 = __VLS_59({
        src: (img),
        fit: "cover",
        ...{ class: "thumb-img" },
        previewTeleported: true,
        previewSrcList: (__VLS_ctx.form.images),
        initialIndex: (idx),
    }, ...__VLS_functionalComponentArgsRest(__VLS_59));
    if (idx === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "cover-badge" },
        });
    }
    const __VLS_62 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_63 = __VLS_asFunctionalComponent(__VLS_62, new __VLS_62({
        ...{ 'onClick': {} },
        ...{ class: "remove-btn" },
        circle: true,
        size: "small",
        type: "danger",
        icon: (__VLS_ctx.Delete),
    }));
    const __VLS_64 = __VLS_63({
        ...{ 'onClick': {} },
        ...{ class: "remove-btn" },
        circle: true,
        size: "small",
        type: "danger",
        icon: (__VLS_ctx.Delete),
    }, ...__VLS_functionalComponentArgsRest(__VLS_63));
    let __VLS_66;
    let __VLS_67;
    let __VLS_68;
    const __VLS_69 = {
        onClick: (...[$event]) => {
            __VLS_ctx.removeImage(idx);
        }
    };
    var __VLS_65;
}
if (__VLS_ctx.form.images.length < 9) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.form.images.length < 9))
                    return;
                __VLS_ctx.imageInput?.click();
            } },
        ...{ class: "upload-trigger" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "upload-placeholder" },
    });
    const __VLS_70 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_71 = __VLS_asFunctionalComponent(__VLS_70, new __VLS_70({
        size: (28),
    }));
    const __VLS_72 = __VLS_71({
        size: (28),
    }, ...__VLS_functionalComponentArgsRest(__VLS_71));
    __VLS_73.slots.default;
    const __VLS_74 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_75 = __VLS_asFunctionalComponent(__VLS_74, new __VLS_74({}));
    const __VLS_76 = __VLS_75({}, ...__VLS_functionalComponentArgsRest(__VLS_75));
    var __VLS_73;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onChange: (__VLS_ctx.onImageFileChange) },
        ref: "imageInput",
        type: "file",
        accept: "image/*",
        hidden: true,
    });
    /** @type {typeof __VLS_ctx.imageInput} */ ;
}
var __VLS_57;
const __VLS_78 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({
    label: "视频",
}));
const __VLS_80 = __VLS_79({
    label: "视频",
}, ...__VLS_functionalComponentArgsRest(__VLS_79));
__VLS_81.slots.default;
if (__VLS_ctx.form.videoUrl) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "video-preview" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.video)({
        src: (__VLS_ctx.form.videoUrl),
        controls: true,
        ...{ class: "video-player" },
    });
    const __VLS_82 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_83 = __VLS_asFunctionalComponent(__VLS_82, new __VLS_82({
        ...{ 'onClick': {} },
        ...{ class: "video-remove-btn" },
        size: "small",
        type: "danger",
        icon: (__VLS_ctx.Delete),
    }));
    const __VLS_84 = __VLS_83({
        ...{ 'onClick': {} },
        ...{ class: "video-remove-btn" },
        size: "small",
        type: "danger",
        icon: (__VLS_ctx.Delete),
    }, ...__VLS_functionalComponentArgsRest(__VLS_83));
    let __VLS_86;
    let __VLS_87;
    let __VLS_88;
    const __VLS_89 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.form.videoUrl))
                return;
            __VLS_ctx.form.videoUrl = '';
            __VLS_ctx.form.videoMeta = undefined;
        }
    };
    __VLS_85.slots.default;
    var __VLS_85;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.form.videoUrl))
                    return;
                __VLS_ctx.videoInput?.click();
            } },
        ...{ class: "upload-trigger upload-trigger--wide" },
        ...{ class: ({ 'is-uploading': __VLS_ctx.uploadingVideo }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "upload-placeholder" },
    });
    if (!__VLS_ctx.uploadingVideo) {
        const __VLS_90 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({
            size: (28),
        }));
        const __VLS_92 = __VLS_91({
            size: (28),
        }, ...__VLS_functionalComponentArgsRest(__VLS_91));
        __VLS_93.slots.default;
        const __VLS_94 = {}.VideoCamera;
        /** @type {[typeof __VLS_components.VideoCamera, ]} */ ;
        // @ts-ignore
        const __VLS_95 = __VLS_asFunctionalComponent(__VLS_94, new __VLS_94({}));
        const __VLS_96 = __VLS_95({}, ...__VLS_functionalComponentArgsRest(__VLS_95));
        var __VLS_93;
    }
    if (!__VLS_ctx.uploadingVideo) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "uploading-text" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onChange: (__VLS_ctx.onVideoFileChange) },
        ref: "videoInput",
        type: "file",
        accept: "video/*",
        hidden: true,
    });
    /** @type {typeof __VLS_ctx.videoInput} */ ;
}
var __VLS_81;
const __VLS_98 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_99 = __VLS_asFunctionalComponent(__VLS_98, new __VLS_98({}));
const __VLS_100 = __VLS_99({}, ...__VLS_functionalComponentArgsRest(__VLS_99));
__VLS_101.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ai-tools-section glass-sm" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ai-tools-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ai-tools-body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ai-tool" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ai-tool-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_102 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_103 = __VLS_asFunctionalComponent(__VLS_102, new __VLS_102({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
    loading: (__VLS_ctx.aiImageLoading),
    disabled: (!__VLS_ctx.aiImagePrompt.trim()),
}));
const __VLS_104 = __VLS_103({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
    loading: (__VLS_ctx.aiImageLoading),
    disabled: (!__VLS_ctx.aiImagePrompt.trim()),
}, ...__VLS_functionalComponentArgsRest(__VLS_103));
let __VLS_106;
let __VLS_107;
let __VLS_108;
const __VLS_109 = {
    onClick: (__VLS_ctx.genImage)
};
__VLS_105.slots.default;
var __VLS_105;
const __VLS_110 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({
    modelValue: (__VLS_ctx.aiImagePrompt),
    placeholder: "描述你想要生成的图片，如：夕阳下的海滩",
}));
const __VLS_112 = __VLS_111({
    modelValue: (__VLS_ctx.aiImagePrompt),
    placeholder: "描述你想要生成的图片，如：夕阳下的海滩",
}, ...__VLS_functionalComponentArgsRest(__VLS_111));
if (__VLS_ctx.aiImageResult) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ai-preview" },
    });
    const __VLS_114 = {}.ElImage;
    /** @type {[typeof __VLS_components.ElImage, typeof __VLS_components.elImage, ]} */ ;
    // @ts-ignore
    const __VLS_115 = __VLS_asFunctionalComponent(__VLS_114, new __VLS_114({
        src: (__VLS_ctx.aiImageResult),
        fit: "cover",
        ...{ class: "ai-thumb" },
    }));
    const __VLS_116 = __VLS_115({
        src: (__VLS_ctx.aiImageResult),
        fit: "cover",
        ...{ class: "ai-thumb" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_115));
    const __VLS_118 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_119 = __VLS_asFunctionalComponent(__VLS_118, new __VLS_118({
        ...{ 'onClick': {} },
        size: "small",
    }));
    const __VLS_120 = __VLS_119({
        ...{ 'onClick': {} },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_119));
    let __VLS_122;
    let __VLS_123;
    let __VLS_124;
    const __VLS_125 = {
        onClick: (__VLS_ctx.addAiImage)
    };
    __VLS_121.slots.default;
    var __VLS_121;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ai-tool" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ai-tool-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_126 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_127 = __VLS_asFunctionalComponent(__VLS_126, new __VLS_126({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
    loading: (__VLS_ctx.aiMusicLoading),
    disabled: (!__VLS_ctx.aiMusicPrompt.trim()),
}));
const __VLS_128 = __VLS_127({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
    loading: (__VLS_ctx.aiMusicLoading),
    disabled: (!__VLS_ctx.aiMusicPrompt.trim()),
}, ...__VLS_functionalComponentArgsRest(__VLS_127));
let __VLS_130;
let __VLS_131;
let __VLS_132;
const __VLS_133 = {
    onClick: (__VLS_ctx.genMusic)
};
__VLS_129.slots.default;
var __VLS_129;
const __VLS_134 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_135 = __VLS_asFunctionalComponent(__VLS_134, new __VLS_134({
    modelValue: (__VLS_ctx.aiMusicPrompt),
    placeholder: "描述音乐风格，如：轻快的吉他曲",
}));
const __VLS_136 = __VLS_135({
    modelValue: (__VLS_ctx.aiMusicPrompt),
    placeholder: "描述音乐风格，如：轻快的吉他曲",
}, ...__VLS_functionalComponentArgsRest(__VLS_135));
if (__VLS_ctx.aiMusicResult) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ai-preview" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.audio)({
        src: (__VLS_ctx.aiMusicResult),
        controls: true,
        ...{ class: "audio-player" },
    });
    const __VLS_138 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_139 = __VLS_asFunctionalComponent(__VLS_138, new __VLS_138({
        ...{ 'onClick': {} },
        size: "small",
    }));
    const __VLS_140 = __VLS_139({
        ...{ 'onClick': {} },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_139));
    let __VLS_142;
    let __VLS_143;
    let __VLS_144;
    const __VLS_145 = {
        onClick: (__VLS_ctx.addAiMusic)
    };
    __VLS_141.slots.default;
    var __VLS_141;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ai-tool" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ai-tool-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_146 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_147 = __VLS_asFunctionalComponent(__VLS_146, new __VLS_146({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
    loading: (__VLS_ctx.aiVideoLoading),
    disabled: (!__VLS_ctx.aiVideoPrompt.trim()),
}));
const __VLS_148 = __VLS_147({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
    loading: (__VLS_ctx.aiVideoLoading),
    disabled: (!__VLS_ctx.aiVideoPrompt.trim()),
}, ...__VLS_functionalComponentArgsRest(__VLS_147));
let __VLS_150;
let __VLS_151;
let __VLS_152;
const __VLS_153 = {
    onClick: (__VLS_ctx.genVideo)
};
__VLS_149.slots.default;
var __VLS_149;
const __VLS_154 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_155 = __VLS_asFunctionalComponent(__VLS_154, new __VLS_154({
    modelValue: (__VLS_ctx.aiVideoPrompt),
    placeholder: "描述视频场景",
}));
const __VLS_156 = __VLS_155({
    modelValue: (__VLS_ctx.aiVideoPrompt),
    placeholder: "描述视频场景",
}, ...__VLS_functionalComponentArgsRest(__VLS_155));
if (__VLS_ctx.aiVideoTaskId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ai-preview" },
    });
    if (__VLS_ctx.aiVideoStatus === 'Processing' || __VLS_ctx.aiVideoStatus === 'Queueing' || __VLS_ctx.aiVideoStatus === 'Preparing') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ai-video-pending" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.aiVideoStatus);
        const __VLS_158 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_159 = __VLS_asFunctionalComponent(__VLS_158, new __VLS_158({
            ...{ 'onClick': {} },
            size: "small",
        }));
        const __VLS_160 = __VLS_159({
            ...{ 'onClick': {} },
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_159));
        let __VLS_162;
        let __VLS_163;
        let __VLS_164;
        const __VLS_165 = {
            onClick: (__VLS_ctx.checkVideoStatus)
        };
        __VLS_161.slots.default;
        var __VLS_161;
    }
    else if (__VLS_ctx.aiVideoDownloadUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.video)({
            src: (__VLS_ctx.aiVideoDownloadUrl),
            controls: true,
            ...{ class: "video-player" },
        });
        const __VLS_166 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_167 = __VLS_asFunctionalComponent(__VLS_166, new __VLS_166({
            ...{ 'onClick': {} },
            size: "small",
        }));
        const __VLS_168 = __VLS_167({
            ...{ 'onClick': {} },
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_167));
        let __VLS_170;
        let __VLS_171;
        let __VLS_172;
        const __VLS_173 = {
            onClick: (__VLS_ctx.addAiVideo)
        };
        __VLS_169.slots.default;
        var __VLS_169;
    }
    else if (__VLS_ctx.aiVideoStatus === 'Fail') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ai-video-fail" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
}
var __VLS_101;
const __VLS_174 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_175 = __VLS_asFunctionalComponent(__VLS_174, new __VLS_174({
    label: "公开可见",
}));
const __VLS_176 = __VLS_175({
    label: "公开可见",
}, ...__VLS_functionalComponentArgsRest(__VLS_175));
__VLS_177.slots.default;
const __VLS_178 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_179 = __VLS_asFunctionalComponent(__VLS_178, new __VLS_178({
    modelValue: (__VLS_ctx.form.isPublic),
    activeText: "公开",
    inactiveText: "私密",
}));
const __VLS_180 = __VLS_179({
    modelValue: (__VLS_ctx.form.isPublic),
    activeText: "公开",
    inactiveText: "私密",
}, ...__VLS_functionalComponentArgsRest(__VLS_179));
var __VLS_177;
const __VLS_182 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_183 = __VLS_asFunctionalComponent(__VLS_182, new __VLS_182({}));
const __VLS_184 = __VLS_183({}, ...__VLS_functionalComponentArgsRest(__VLS_183));
__VLS_185.slots.default;
const __VLS_186 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_187 = __VLS_asFunctionalComponent(__VLS_186, new __VLS_186({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    loading: (__VLS_ctx.saving),
    ...{ class: "save-btn" },
}));
const __VLS_188 = __VLS_187({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    loading: (__VLS_ctx.saving),
    ...{ class: "save-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_187));
let __VLS_190;
let __VLS_191;
let __VLS_192;
const __VLS_193 = {
    onClick: (__VLS_ctx.handleSave)
};
__VLS_189.slots.default;
(__VLS_ctx.isEditMode ? '保存修改' : '发布日记');
var __VLS_189;
const __VLS_194 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_195 = __VLS_asFunctionalComponent(__VLS_194, new __VLS_194({
    ...{ 'onClick': {} },
    size: "large",
}));
const __VLS_196 = __VLS_195({
    ...{ 'onClick': {} },
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_195));
let __VLS_198;
let __VLS_199;
let __VLS_200;
const __VLS_201 = {
    onClick: (...[$event]) => {
        __VLS_ctx.router.back();
    }
};
__VLS_197.slots.default;
var __VLS_197;
var __VLS_185;
var __VLS_11;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "editor-preview-panel" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.isMobile ? __VLS_ctx.previewMode : true) }, null, null);
if (__VLS_ctx.hasContent) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-card" },
    });
    if (__VLS_ctx.form.images.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-cover" },
        });
        const __VLS_202 = {}.ElImage;
        /** @type {[typeof __VLS_components.ElImage, typeof __VLS_components.elImage, ]} */ ;
        // @ts-ignore
        const __VLS_203 = __VLS_asFunctionalComponent(__VLS_202, new __VLS_202({
            src: (__VLS_ctx.form.images[0]),
            fit: "cover",
            ...{ class: "cover-img" },
        }));
        const __VLS_204 = __VLS_203({
            src: (__VLS_ctx.form.images[0]),
            fit: "cover",
            ...{ class: "cover-img" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_203));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cover-overlay" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (__VLS_ctx.form.title || '未命名日记');
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-cover preview-cover--empty" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cover-overlay" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (__VLS_ctx.form.title || '未命名日记');
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-meta" },
    });
    if (__VLS_ctx.form.destination) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "meta-item" },
        });
        const __VLS_206 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_207 = __VLS_asFunctionalComponent(__VLS_206, new __VLS_206({}));
        const __VLS_208 = __VLS_207({}, ...__VLS_functionalComponentArgsRest(__VLS_207));
        __VLS_209.slots.default;
        const __VLS_210 = {}.Location;
        /** @type {[typeof __VLS_components.Location, ]} */ ;
        // @ts-ignore
        const __VLS_211 = __VLS_asFunctionalComponent(__VLS_210, new __VLS_210({}));
        const __VLS_212 = __VLS_211({}, ...__VLS_functionalComponentArgsRest(__VLS_211));
        var __VLS_209;
        (__VLS_ctx.form.destination);
    }
    if (__VLS_ctx.selectedSpotName) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "meta-item" },
        });
        const __VLS_214 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_215 = __VLS_asFunctionalComponent(__VLS_214, new __VLS_214({}));
        const __VLS_216 = __VLS_215({}, ...__VLS_functionalComponentArgsRest(__VLS_215));
        __VLS_217.slots.default;
        const __VLS_218 = {}.Flag;
        /** @type {[typeof __VLS_components.Flag, ]} */ ;
        // @ts-ignore
        const __VLS_219 = __VLS_asFunctionalComponent(__VLS_218, new __VLS_218({}));
        const __VLS_220 = __VLS_219({}, ...__VLS_functionalComponentArgsRest(__VLS_219));
        var __VLS_217;
        (__VLS_ctx.selectedSpotName);
    }
    const __VLS_222 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_223 = __VLS_asFunctionalComponent(__VLS_222, new __VLS_222({
        type: (__VLS_ctx.form.isPublic ? 'success' : 'info'),
        size: "small",
    }));
    const __VLS_224 = __VLS_223({
        type: (__VLS_ctx.form.isPublic ? 'success' : 'info'),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_223));
    __VLS_225.slots.default;
    (__VLS_ctx.form.isPublic ? '公开' : '私密');
    var __VLS_225;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "preview-content" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderedContent) }, null, null);
    if (__VLS_ctx.form.images.length > 1) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-gallery" },
        });
        for (const [img, idx] of __VLS_getVForSourceType((__VLS_ctx.form.images.slice(1)))) {
            const __VLS_226 = {}.ElImage;
            /** @type {[typeof __VLS_components.ElImage, typeof __VLS_components.elImage, ]} */ ;
            // @ts-ignore
            const __VLS_227 = __VLS_asFunctionalComponent(__VLS_226, new __VLS_226({
                key: (idx),
                src: (img),
                fit: "cover",
                ...{ class: "gallery-img" },
                previewTeleported: true,
                previewSrcList: (__VLS_ctx.form.images),
                initialIndex: (idx + 1),
            }));
            const __VLS_228 = __VLS_227({
                key: (idx),
                src: (img),
                fit: "cover",
                ...{ class: "gallery-img" },
                previewTeleported: true,
                previewSrcList: (__VLS_ctx.form.images),
                initialIndex: (idx + 1),
            }, ...__VLS_functionalComponentArgsRest(__VLS_227));
        }
    }
    if (__VLS_ctx.form.videoUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-media" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.video)({
            src: (__VLS_ctx.form.videoUrl),
            controls: true,
            ...{ class: "preview-video" },
        });
    }
    if (__VLS_ctx.form.musicUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-media" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.audio)({
            src: (__VLS_ctx.form.musicUrl),
            controls: true,
            ...{ class: "preview-audio" },
        });
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-empty" },
    });
    const __VLS_230 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_231 = __VLS_asFunctionalComponent(__VLS_230, new __VLS_230({
        size: (48),
        color: "#c0c4cc",
    }));
    const __VLS_232 = __VLS_231({
        size: (48),
        color: "#c0c4cc",
    }, ...__VLS_functionalComponentArgsRest(__VLS_231));
    __VLS_233.slots.default;
    const __VLS_234 = {}.Document;
    /** @type {[typeof __VLS_components.Document, ]} */ ;
    // @ts-ignore
    const __VLS_235 = __VLS_asFunctionalComponent(__VLS_234, new __VLS_234({}));
    const __VLS_236 = __VLS_235({}, ...__VLS_functionalComponentArgsRest(__VLS_235));
    var __VLS_233;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
}
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['diary-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-header']} */ ;
/** @type {__VLS_StyleScopedClasses['header-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-label']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-body']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-form-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['spot-select']} */ ;
/** @type {__VLS_StyleScopedClasses['spot-category']} */ ;
/** @type {__VLS_StyleScopedClasses['image-upload-area']} */ ;
/** @type {__VLS_StyleScopedClasses['image-thumb']} */ ;
/** @type {__VLS_StyleScopedClasses['thumb-img']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['upload-trigger']} */ ;
/** @type {__VLS_StyleScopedClasses['upload-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['video-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['video-player']} */ ;
/** @type {__VLS_StyleScopedClasses['video-remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['upload-trigger']} */ ;
/** @type {__VLS_StyleScopedClasses['upload-trigger--wide']} */ ;
/** @type {__VLS_StyleScopedClasses['upload-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['uploading-text']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-tools-section']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-tools-header']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-tools-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-tool']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-tool-header']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-thumb']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-tool']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-tool-header']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['audio-player']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-tool']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-tool-header']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-video-pending']} */ ;
/** @type {__VLS_StyleScopedClasses['video-player']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-video-fail']} */ ;
/** @type {__VLS_StyleScopedClasses['save-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-preview-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-img']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-cover--empty']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-item']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-item']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-gallery']} */ ;
/** @type {__VLS_StyleScopedClasses['gallery-img']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-media']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-video']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-media']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-audio']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
// @ts-ignore
var __VLS_17 = __VLS_16;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Plus: Plus,
            Delete: Delete,
            Location: Location,
            Flag: Flag,
            Document: Document,
            VideoCamera: VideoCamera,
            DefaultLayout: DefaultLayout,
            router: router,
            isEditMode: isEditMode,
            isMobile: isMobile,
            formRef: formRef,
            saving: saving,
            loading: loading,
            form: form,
            rules: rules,
            spotOptions: spotOptions,
            spotLoading: spotLoading,
            selectedSpotName: selectedSpotName,
            searchSpots: searchSpots,
            imageInput: imageInput,
            onImageFileChange: onImageFileChange,
            removeImage: removeImage,
            videoInput: videoInput,
            uploadingVideo: uploadingVideo,
            onVideoFileChange: onVideoFileChange,
            aiImagePrompt: aiImagePrompt,
            aiImageLoading: aiImageLoading,
            aiImageResult: aiImageResult,
            genImage: genImage,
            addAiImage: addAiImage,
            aiMusicPrompt: aiMusicPrompt,
            aiMusicLoading: aiMusicLoading,
            aiMusicResult: aiMusicResult,
            genMusic: genMusic,
            addAiMusic: addAiMusic,
            aiVideoPrompt: aiVideoPrompt,
            aiVideoLoading: aiVideoLoading,
            aiVideoTaskId: aiVideoTaskId,
            aiVideoStatus: aiVideoStatus,
            aiVideoDownloadUrl: aiVideoDownloadUrl,
            genVideo: genVideo,
            checkVideoStatus: checkVideoStatus,
            addAiVideo: addAiVideo,
            previewMode: previewMode,
            hasContent: hasContent,
            renderedContent: renderedContent,
            handleSave: handleSave,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
