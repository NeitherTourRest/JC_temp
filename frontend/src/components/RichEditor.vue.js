/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, onMounted } from 'vue';
import { fileApi } from '@/api/aiGenApi';
const props = defineProps();
const emit = defineEmits();
const editorRef = ref();
const imageInputRef = ref();
const videoInputRef = ref();
const uploading = ref(false);
const uploadStatus = ref('');
const fontFamily = ref('Lucida Console');
const fontSize = ref('16');
const textColor = ref('#ffffff');
// Selection bookmark — store as node path + offset for robustness
let bookmark = null;
function saveSelection() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorRef.value)
        return;
    const range = sel.getRangeAt(0);
    bookmark = {
        path: getNodePath(editorRef.value, range.startContainer),
        offset: range.startOffset,
    };
}
function restoreSelection() {
    if (!bookmark || !editorRef.value)
        return;
    const node = resolveNodePath(editorRef.value, bookmark.path);
    if (!node)
        return;
    const sel = window.getSelection();
    if (!sel)
        return;
    try {
        const range = document.createRange();
        range.setStart(node, bookmark.offset);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    }
    catch {
        // Graceful fallback
    }
    editorRef.value.focus();
}
function getNodePath(root, target) {
    const path = [];
    let current = target;
    while (current !== root) {
        const parent = current.parentNode;
        if (!parent)
            break;
        const children = parent.childNodes;
        for (let i = 0; i < children.length; i++) {
            if (children[i] === current) {
                path.unshift(i);
                break;
            }
        }
        current = parent;
    }
    return path;
}
function resolveNodePath(root, path) {
    let node = root;
    for (const idx of path) {
        if (idx >= 0 && idx < node.childNodes.length) {
            node = node.childNodes[idx];
        }
        else {
            return node;
        }
    }
    return node;
}
function exec(cmd, value) {
    document.execCommand(cmd, false, value);
    editorRef.value?.focus();
    emitContent();
}
function setFontFamily() {
    document.execCommand('styleWithCSS', true);
    document.execCommand('fontName', false, fontFamily.value);
    editorRef.value?.focus();
}
function setFontSize() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed || !editorRef.value) {
        const sizeMap = { '12': '1', '14': '2', '16': '3', '18': '4', '24': '5', '32': '6', '48': '7' };
        document.execCommand('fontSize', false, sizeMap[fontSize.value] || '3');
        editorRef.value?.focus();
        return;
    }
    const range = sel.getRangeAt(0);
    const selectedText = range.extractContents();
    const span = document.createElement('span');
    span.style.fontSize = fontSize.value + 'px';
    span.appendChild(selectedText);
    range.insertNode(span);
    sel.removeAllRanges();
    sel.addRange(range);
    emitContent();
}
function setColor() {
    document.execCommand('styleWithCSS', true);
    document.execCommand('foreColor', false, textColor.value);
    editorRef.value?.focus();
}
function triggerImageUpload() {
    saveSelection();
    imageInputRef.value?.click();
}
function triggerVideoUpload() {
    saveSelection();
    videoInputRef.value?.click();
}
async function onImageSelected(e) {
    const input = e.target;
    const file = input?.files?.[0];
    if (!file)
        return;
    input.value = '';
    await uploadAndInsert(file, 'image');
}
async function onVideoSelected(e) {
    const input = e.target;
    const file = input?.files?.[0];
    if (!file)
        return;
    input.value = '';
    await uploadAndInsert(file, 'video');
}
async function uploadAndInsert(file, type) {
    uploading.value = true;
    uploadStatus.value = `正在上传 ${type === 'image' ? '图片' : '视频'}...`;
    try {
        const res = await fileApi.upload(file);
        const url = res.data.data?.url;
        if (!url)
            throw new Error('No URL returned');
        uploadStatus.value = '正在插入...';
        // Restore cursor position from bookmark
        restoreSelection();
        // Insert the media element at cursor via DOM
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
            const range = sel.getRangeAt(0);
            if (type === 'image') {
                const el = document.createElement('img');
                el.src = url;
                el.alt = '上传图片';
                el.style.cssText = 'max-width:100%;border-radius:8px;margin:8px 0;display:block';
                range.deleteContents();
                range.insertNode(el);
                range.setStartAfter(el);
            }
            else {
                const el = document.createElement('video');
                el.src = url;
                el.controls = true;
                el.preload = 'metadata';
                el.style.cssText = 'max-width:100%;max-height:400px;border-radius:8px;margin:8px 0;display:block';
                range.deleteContents();
                range.insertNode(el);
                range.setStartAfter(el);
            }
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
        emitContent();
    }
    catch (e) {
        console.error(`上传 ${type} 失败:`, e);
        uploadStatus.value = '上传失败';
        await new Promise(r => setTimeout(r, 1000));
    }
    finally {
        uploading.value = false;
    }
}
function onInput() {
    emitContent();
}
function onPaste(e) {
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain');
    if (text) {
        document.execCommand('insertText', false, text);
    }
}
function emitContent() {
    if (editorRef.value) {
        emit('update:modelValue', editorRef.value.innerHTML);
    }
}
// Set initial content once on mount — never re-set from outside to avoid cursor jumps
onMounted(() => {
    if (editorRef.value) {
        editorRef.value.innerHTML = props.modelValue || '';
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['toolbar-group']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-select']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-select']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-color']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-color']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rich-editor" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "editor-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toolbar-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.exec('bold');
        } },
    ...{ class: "tb-btn" },
    title: "加粗",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.exec('italic');
        } },
    ...{ class: "tb-btn" },
    title: "斜体",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.exec('underline');
        } },
    ...{ class: "tb-btn" },
    title: "下划线",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.u, __VLS_intrinsicElements.u)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toolbar-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    ...{ onChange: (__VLS_ctx.setFontFamily) },
    ...{ class: "tb-select" },
    title: "字体",
    value: (__VLS_ctx.fontFamily),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "Lucida Console",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "Arial",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "Georgia",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "SimSun, serif",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "SimHei, sans-serif",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "Microsoft YaHei, sans-serif",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "KaiTi, serif",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    ...{ onChange: (__VLS_ctx.setFontSize) },
    ...{ class: "tb-select" },
    title: "字号",
    value: (__VLS_ctx.fontSize),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "12",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "14",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "16",
    selected: true,
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "18",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "24",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "32",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "48",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onInput: (__VLS_ctx.setColor) },
    type: "color",
    ...{ class: "tb-color" },
    title: "文字颜色",
});
(__VLS_ctx.textColor);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toolbar-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.exec('justifyLeft');
        } },
    ...{ class: "tb-btn" },
    title: "左对齐",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.exec('justifyCenter');
        } },
    ...{ class: "tb-btn" },
    title: "居中",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.exec('justifyRight');
        } },
    ...{ class: "tb-btn" },
    title: "右对齐",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toolbar-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.triggerImageUpload) },
    ...{ class: "tb-btn" },
    title: "插入图片",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.triggerVideoUpload) },
    ...{ class: "tb-btn" },
    title: "插入视频",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toolbar-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.exec('removeFormat');
        } },
    ...{ class: "tb-btn" },
    title: "清除格式",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onInput: (__VLS_ctx.onInput) },
    ...{ onPaste: (__VLS_ctx.onPaste) },
    ref: "editorRef",
    ...{ class: "editor-content" },
    contenteditable: "true",
});
/** @type {typeof __VLS_ctx.editorRef} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.onImageSelected) },
    ref: "imageInputRef",
    type: "file",
    accept: "image/*",
    ...{ style: {} },
});
/** @type {typeof __VLS_ctx.imageInputRef} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.onVideoSelected) },
    ref: "videoInputRef",
    type: "file",
    accept: "video/*",
    ...{ style: {} },
});
/** @type {typeof __VLS_ctx.videoInputRef} */ ;
if (__VLS_ctx.uploading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "editor-upload-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "editor-upload-box glass-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "upload-spinner" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.uploadStatus);
}
/** @type {__VLS_StyleScopedClasses['rich-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-group']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-group']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-select']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-select']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-color']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-group']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-group']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-group']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-upload-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-upload-box']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['upload-spinner']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            editorRef: editorRef,
            imageInputRef: imageInputRef,
            videoInputRef: videoInputRef,
            uploading: uploading,
            uploadStatus: uploadStatus,
            fontFamily: fontFamily,
            fontSize: fontSize,
            textColor: textColor,
            exec: exec,
            setFontFamily: setFontFamily,
            setFontSize: setFontSize,
            setColor: setColor,
            triggerImageUpload: triggerImageUpload,
            triggerVideoUpload: triggerVideoUpload,
            onImageSelected: onImageSelected,
            onVideoSelected: onVideoSelected,
            onInput: onInput,
            onPaste: onPaste,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
