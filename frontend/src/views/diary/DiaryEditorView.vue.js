/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Location, Flag, Document } from '@element-plus/icons-vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import RichEditor from '@/components/RichEditor.vue';
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
    contentHtml: '',
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
// ── 封面图片上传 ──
const coverInput = ref();
const uploadingCover = ref(false);
async function onCoverSelected(e) {
    const input = e.target;
    if (!input.files?.length)
        return;
    const file = input.files[0];
    if (file.size > 10 * 1024 * 1024) {
        ElMessage.warning('图片大小不能超过 10MB');
        return;
    }
    uploadingCover.value = true;
    try {
        const r = await fileApi.upload(file);
        if (r.data.data?.url)
            form.value.images = [r.data.data.url];
        ElMessage.success('封面上传成功');
    }
    catch {
        ElMessage.error('封面上传失败');
    }
    finally {
        uploadingCover.value = false;
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
            ElMessage.error(r.data.message || '图片生成失败');
    }
    catch {
        ElMessage.error('图片生成请求失败');
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
            ElMessage.error(r.data.message || '音乐生成失败');
    }
    catch {
        ElMessage.error('音乐生成请求失败');
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
            ElMessage.error(r.data.message || '视频创建失败');
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
const hasContent = computed(() => form.value.title.trim() || form.value.contentHtml.trim() || form.value.images.length > 0);
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
        form.value.contentHtml = d.contentHtml || '';
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
            content: form.value.content || '',
            contentHtml: form.value.contentHtml || undefined,
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
        // Clear form so unsaved-changes guard doesn't fire
        form.value = { title: '', content: '', contentHtml: '', destination: '', images: [], spotId: null, isPublic: true };
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
    return !!form.value.title || !!form.value.contentHtml || form.value.images.length > 0;
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
// Auto-extract plain text from contentHtml for backward compat
watch(() => form.value.contentHtml, (html) => {
    if (html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        form.value.content = div.textContent || div.innerText || '';
    }
});
onMounted(() => {
    loadDiary();
});
// 同组件路由切换（编辑A → 编辑B）时重新加载
watch(() => route.params.id, () => {
    if (route.params.id) {
        form.value = { title: '', content: '', contentHtml: '', destination: '', images: [], spotId: null, isPublic: true };
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
(__VLS_ctx.isEditMode ? '编辑游记' : '写游记');
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
/** @type {[typeof RichEditor, ]} */ ;
// @ts-ignore
const __VLS_50 = __VLS_asFunctionalComponent(RichEditor, new RichEditor({
    modelValue: (__VLS_ctx.form.contentHtml),
    key: ('editor-' + __VLS_ctx.diaryId),
}));
const __VLS_51 = __VLS_50({
    modelValue: (__VLS_ctx.form.contentHtml),
    key: ('editor-' + __VLS_ctx.diaryId),
}, ...__VLS_functionalComponentArgsRest(__VLS_50));
var __VLS_49;
const __VLS_53 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_54 = __VLS_asFunctionalComponent(__VLS_53, new __VLS_53({
    label: "封面图片",
}));
const __VLS_55 = __VLS_54({
    label: "封面图片",
}, ...__VLS_functionalComponentArgsRest(__VLS_54));
__VLS_56.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cover-upload-area" },
});
if (__VLS_ctx.form.images[0]) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cover-preview" },
    });
    const __VLS_57 = {}.ElImage;
    /** @type {[typeof __VLS_components.ElImage, typeof __VLS_components.elImage, ]} */ ;
    // @ts-ignore
    const __VLS_58 = __VLS_asFunctionalComponent(__VLS_57, new __VLS_57({
        src: (__VLS_ctx.form.images[0]),
        fit: "cover",
        ...{ class: "cover-thumb" },
    }));
    const __VLS_59 = __VLS_58({
        src: (__VLS_ctx.form.images[0]),
        fit: "cover",
        ...{ class: "cover-thumb" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_58));
    const __VLS_61 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_62 = __VLS_asFunctionalComponent(__VLS_61, new __VLS_61({
        ...{ 'onClick': {} },
        ...{ class: "cover-remove-btn" },
        size: "small",
        type: "danger",
        circle: true,
    }));
    const __VLS_63 = __VLS_62({
        ...{ 'onClick': {} },
        ...{ class: "cover-remove-btn" },
        size: "small",
        type: "danger",
        circle: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_62));
    let __VLS_65;
    let __VLS_66;
    let __VLS_67;
    const __VLS_68 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.form.images[0]))
                return;
            __VLS_ctx.form.images = [];
        }
    };
    __VLS_64.slots.default;
    var __VLS_64;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.form.images[0]))
                    return;
                __VLS_ctx.coverInput?.click();
            } },
        ...{ class: "cover-upload-trigger" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cover-placeholder" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cover-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onChange: (__VLS_ctx.onCoverSelected) },
        ref: "coverInput",
        type: "file",
        accept: "image/*",
        hidden: true,
    });
    /** @type {typeof __VLS_ctx.coverInput} */ ;
}
var __VLS_56;
const __VLS_69 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_70 = __VLS_asFunctionalComponent(__VLS_69, new __VLS_69({}));
const __VLS_71 = __VLS_70({}, ...__VLS_functionalComponentArgsRest(__VLS_70));
__VLS_72.slots.default;
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
const __VLS_73 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_74 = __VLS_asFunctionalComponent(__VLS_73, new __VLS_73({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
    loading: (__VLS_ctx.aiImageLoading),
    disabled: (!__VLS_ctx.aiImagePrompt.trim()),
}));
const __VLS_75 = __VLS_74({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
    loading: (__VLS_ctx.aiImageLoading),
    disabled: (!__VLS_ctx.aiImagePrompt.trim()),
}, ...__VLS_functionalComponentArgsRest(__VLS_74));
let __VLS_77;
let __VLS_78;
let __VLS_79;
const __VLS_80 = {
    onClick: (__VLS_ctx.genImage)
};
__VLS_76.slots.default;
var __VLS_76;
const __VLS_81 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_82 = __VLS_asFunctionalComponent(__VLS_81, new __VLS_81({
    modelValue: (__VLS_ctx.aiImagePrompt),
    placeholder: "描述你想要生成的图片，如：夕阳下的海滩",
}));
const __VLS_83 = __VLS_82({
    modelValue: (__VLS_ctx.aiImagePrompt),
    placeholder: "描述你想要生成的图片，如：夕阳下的海滩",
}, ...__VLS_functionalComponentArgsRest(__VLS_82));
if (__VLS_ctx.aiImageResult) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ai-preview" },
    });
    const __VLS_85 = {}.ElImage;
    /** @type {[typeof __VLS_components.ElImage, typeof __VLS_components.elImage, ]} */ ;
    // @ts-ignore
    const __VLS_86 = __VLS_asFunctionalComponent(__VLS_85, new __VLS_85({
        src: (__VLS_ctx.aiImageResult),
        fit: "cover",
        ...{ class: "ai-thumb" },
    }));
    const __VLS_87 = __VLS_86({
        src: (__VLS_ctx.aiImageResult),
        fit: "cover",
        ...{ class: "ai-thumb" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_86));
    const __VLS_89 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_90 = __VLS_asFunctionalComponent(__VLS_89, new __VLS_89({
        ...{ 'onClick': {} },
        size: "small",
    }));
    const __VLS_91 = __VLS_90({
        ...{ 'onClick': {} },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_90));
    let __VLS_93;
    let __VLS_94;
    let __VLS_95;
    const __VLS_96 = {
        onClick: (__VLS_ctx.addAiImage)
    };
    __VLS_92.slots.default;
    var __VLS_92;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ai-tool" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ai-tool-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_97 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_98 = __VLS_asFunctionalComponent(__VLS_97, new __VLS_97({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
    loading: (__VLS_ctx.aiMusicLoading),
    disabled: (!__VLS_ctx.aiMusicPrompt.trim()),
}));
const __VLS_99 = __VLS_98({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
    loading: (__VLS_ctx.aiMusicLoading),
    disabled: (!__VLS_ctx.aiMusicPrompt.trim()),
}, ...__VLS_functionalComponentArgsRest(__VLS_98));
let __VLS_101;
let __VLS_102;
let __VLS_103;
const __VLS_104 = {
    onClick: (__VLS_ctx.genMusic)
};
__VLS_100.slots.default;
var __VLS_100;
const __VLS_105 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_106 = __VLS_asFunctionalComponent(__VLS_105, new __VLS_105({
    modelValue: (__VLS_ctx.aiMusicPrompt),
    placeholder: "描述音乐风格，如：轻快的吉他曲",
}));
const __VLS_107 = __VLS_106({
    modelValue: (__VLS_ctx.aiMusicPrompt),
    placeholder: "描述音乐风格，如：轻快的吉他曲",
}, ...__VLS_functionalComponentArgsRest(__VLS_106));
if (__VLS_ctx.aiMusicResult) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ai-preview" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.audio)({
        src: (__VLS_ctx.aiMusicResult),
        controls: true,
        ...{ class: "audio-player" },
    });
    const __VLS_109 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_110 = __VLS_asFunctionalComponent(__VLS_109, new __VLS_109({
        ...{ 'onClick': {} },
        size: "small",
    }));
    const __VLS_111 = __VLS_110({
        ...{ 'onClick': {} },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_110));
    let __VLS_113;
    let __VLS_114;
    let __VLS_115;
    const __VLS_116 = {
        onClick: (__VLS_ctx.addAiMusic)
    };
    __VLS_112.slots.default;
    var __VLS_112;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ai-tool" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ai-tool-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_117 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_118 = __VLS_asFunctionalComponent(__VLS_117, new __VLS_117({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
    loading: (__VLS_ctx.aiVideoLoading),
    disabled: (!__VLS_ctx.aiVideoPrompt.trim()),
}));
const __VLS_119 = __VLS_118({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
    loading: (__VLS_ctx.aiVideoLoading),
    disabled: (!__VLS_ctx.aiVideoPrompt.trim()),
}, ...__VLS_functionalComponentArgsRest(__VLS_118));
let __VLS_121;
let __VLS_122;
let __VLS_123;
const __VLS_124 = {
    onClick: (__VLS_ctx.genVideo)
};
__VLS_120.slots.default;
var __VLS_120;
const __VLS_125 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_126 = __VLS_asFunctionalComponent(__VLS_125, new __VLS_125({
    modelValue: (__VLS_ctx.aiVideoPrompt),
    placeholder: "描述视频场景",
}));
const __VLS_127 = __VLS_126({
    modelValue: (__VLS_ctx.aiVideoPrompt),
    placeholder: "描述视频场景",
}, ...__VLS_functionalComponentArgsRest(__VLS_126));
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
        const __VLS_129 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_130 = __VLS_asFunctionalComponent(__VLS_129, new __VLS_129({
            ...{ 'onClick': {} },
            size: "small",
        }));
        const __VLS_131 = __VLS_130({
            ...{ 'onClick': {} },
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_130));
        let __VLS_133;
        let __VLS_134;
        let __VLS_135;
        const __VLS_136 = {
            onClick: (__VLS_ctx.checkVideoStatus)
        };
        __VLS_132.slots.default;
        var __VLS_132;
    }
    else if (__VLS_ctx.aiVideoDownloadUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.video)({
            src: (__VLS_ctx.aiVideoDownloadUrl),
            controls: true,
            ...{ class: "video-player" },
        });
        const __VLS_137 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_138 = __VLS_asFunctionalComponent(__VLS_137, new __VLS_137({
            ...{ 'onClick': {} },
            size: "small",
        }));
        const __VLS_139 = __VLS_138({
            ...{ 'onClick': {} },
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_138));
        let __VLS_141;
        let __VLS_142;
        let __VLS_143;
        const __VLS_144 = {
            onClick: (__VLS_ctx.addAiVideo)
        };
        __VLS_140.slots.default;
        var __VLS_140;
    }
    else if (__VLS_ctx.aiVideoStatus === 'Fail') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ai-video-fail" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
}
var __VLS_72;
const __VLS_145 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_146 = __VLS_asFunctionalComponent(__VLS_145, new __VLS_145({
    label: "公开可见",
}));
const __VLS_147 = __VLS_146({
    label: "公开可见",
}, ...__VLS_functionalComponentArgsRest(__VLS_146));
__VLS_148.slots.default;
const __VLS_149 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_150 = __VLS_asFunctionalComponent(__VLS_149, new __VLS_149({
    modelValue: (__VLS_ctx.form.isPublic),
    activeText: "公开",
    inactiveText: "私密",
}));
const __VLS_151 = __VLS_150({
    modelValue: (__VLS_ctx.form.isPublic),
    activeText: "公开",
    inactiveText: "私密",
}, ...__VLS_functionalComponentArgsRest(__VLS_150));
var __VLS_148;
const __VLS_153 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_154 = __VLS_asFunctionalComponent(__VLS_153, new __VLS_153({}));
const __VLS_155 = __VLS_154({}, ...__VLS_functionalComponentArgsRest(__VLS_154));
__VLS_156.slots.default;
const __VLS_157 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_158 = __VLS_asFunctionalComponent(__VLS_157, new __VLS_157({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    loading: (__VLS_ctx.saving),
    ...{ class: "save-btn" },
}));
const __VLS_159 = __VLS_158({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    loading: (__VLS_ctx.saving),
    ...{ class: "save-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_158));
let __VLS_161;
let __VLS_162;
let __VLS_163;
const __VLS_164 = {
    onClick: (__VLS_ctx.handleSave)
};
__VLS_160.slots.default;
(__VLS_ctx.isEditMode ? '保存' : '发布日记');
var __VLS_160;
const __VLS_165 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_166 = __VLS_asFunctionalComponent(__VLS_165, new __VLS_165({
    ...{ 'onClick': {} },
    size: "large",
}));
const __VLS_167 = __VLS_166({
    ...{ 'onClick': {} },
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_166));
let __VLS_169;
let __VLS_170;
let __VLS_171;
const __VLS_172 = {
    onClick: (...[$event]) => {
        __VLS_ctx.router.back();
    }
};
__VLS_168.slots.default;
var __VLS_168;
var __VLS_156;
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
        const __VLS_173 = {}.ElImage;
        /** @type {[typeof __VLS_components.ElImage, typeof __VLS_components.elImage, ]} */ ;
        // @ts-ignore
        const __VLS_174 = __VLS_asFunctionalComponent(__VLS_173, new __VLS_173({
            src: (__VLS_ctx.form.images[0]),
            fit: "cover",
            ...{ class: "cover-img" },
        }));
        const __VLS_175 = __VLS_174({
            src: (__VLS_ctx.form.images[0]),
            fit: "cover",
            ...{ class: "cover-img" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_174));
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
        const __VLS_177 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_178 = __VLS_asFunctionalComponent(__VLS_177, new __VLS_177({}));
        const __VLS_179 = __VLS_178({}, ...__VLS_functionalComponentArgsRest(__VLS_178));
        __VLS_180.slots.default;
        const __VLS_181 = {}.Location;
        /** @type {[typeof __VLS_components.Location, ]} */ ;
        // @ts-ignore
        const __VLS_182 = __VLS_asFunctionalComponent(__VLS_181, new __VLS_181({}));
        const __VLS_183 = __VLS_182({}, ...__VLS_functionalComponentArgsRest(__VLS_182));
        var __VLS_180;
        (__VLS_ctx.form.destination);
    }
    if (__VLS_ctx.selectedSpotName) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "meta-item" },
        });
        const __VLS_185 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_186 = __VLS_asFunctionalComponent(__VLS_185, new __VLS_185({}));
        const __VLS_187 = __VLS_186({}, ...__VLS_functionalComponentArgsRest(__VLS_186));
        __VLS_188.slots.default;
        const __VLS_189 = {}.Flag;
        /** @type {[typeof __VLS_components.Flag, ]} */ ;
        // @ts-ignore
        const __VLS_190 = __VLS_asFunctionalComponent(__VLS_189, new __VLS_189({}));
        const __VLS_191 = __VLS_190({}, ...__VLS_functionalComponentArgsRest(__VLS_190));
        var __VLS_188;
        (__VLS_ctx.selectedSpotName);
    }
    const __VLS_193 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_194 = __VLS_asFunctionalComponent(__VLS_193, new __VLS_193({
        type: (__VLS_ctx.form.isPublic ? 'success' : 'info'),
        size: "small",
    }));
    const __VLS_195 = __VLS_194({
        type: (__VLS_ctx.form.isPublic ? 'success' : 'info'),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_194));
    __VLS_196.slots.default;
    (__VLS_ctx.form.isPublic ? '公开' : '私密');
    var __VLS_196;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "preview-content" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.form.contentHtml || __VLS_ctx.renderedContent) }, null, null);
    if (__VLS_ctx.form.images.length > 1) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-gallery" },
        });
        for (const [img, idx] of __VLS_getVForSourceType((__VLS_ctx.form.images.slice(1)))) {
            const __VLS_197 = {}.ElImage;
            /** @type {[typeof __VLS_components.ElImage, typeof __VLS_components.elImage, ]} */ ;
            // @ts-ignore
            const __VLS_198 = __VLS_asFunctionalComponent(__VLS_197, new __VLS_197({
                key: (idx),
                src: (img),
                fit: "cover",
                ...{ class: "gallery-img" },
                previewTeleported: true,
                previewSrcList: (__VLS_ctx.form.images),
                initialIndex: (idx + 1),
            }));
            const __VLS_199 = __VLS_198({
                key: (idx),
                src: (img),
                fit: "cover",
                ...{ class: "gallery-img" },
                previewTeleported: true,
                previewSrcList: (__VLS_ctx.form.images),
                initialIndex: (idx + 1),
            }, ...__VLS_functionalComponentArgsRest(__VLS_198));
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
    const __VLS_201 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_202 = __VLS_asFunctionalComponent(__VLS_201, new __VLS_201({
        size: (48),
    }));
    const __VLS_203 = __VLS_202({
        size: (48),
    }, ...__VLS_functionalComponentArgsRest(__VLS_202));
    __VLS_204.slots.default;
    const __VLS_205 = {}.Document;
    /** @type {[typeof __VLS_components.Document, ]} */ ;
    // @ts-ignore
    const __VLS_206 = __VLS_asFunctionalComponent(__VLS_205, new __VLS_205({}));
    const __VLS_207 = __VLS_206({}, ...__VLS_functionalComponentArgsRest(__VLS_206));
    var __VLS_204;
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
/** @type {__VLS_StyleScopedClasses['cover-upload-area']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-thumb']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-upload-trigger']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-label']} */ ;
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
            Location: Location,
            Flag: Flag,
            Document: Document,
            DefaultLayout: DefaultLayout,
            RichEditor: RichEditor,
            router: router,
            isEditMode: isEditMode,
            diaryId: diaryId,
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
            coverInput: coverInput,
            onCoverSelected: onCoverSelected,
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
