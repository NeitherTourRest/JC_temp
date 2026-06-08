const fs = require('fs');
const src = fs.readFileSync('src/views/navigation/NavigationView.vue', 'utf-8');

const secondFn = src.indexOf('function onIndoorSvgClick', 
  src.indexOf('function onIndoorSvgClick') + 10);
const styleOpen = src.indexOf('<style');

// Keep: 0 -> secondFn, and: styleOpen -> end
const firstPart = src.substring(0, secondFn);
const stylePart = src.substring(styleOpen);

// Check if the first part ends cleanly (with a newline before the duplicate)
const trimmed = firstPart.trimEnd() + '\n' + stylePart;

fs.writeFileSync('src/views/navigation/NavigationView.vue', trimmed, 'utf-8');
console.log('Trimmed:', src.length, '->', trimmed.length, 'chars');

// Verify
const verify = fs.readFileSync('src/views/navigation/NavigationView.vue', 'utf-8');
const tags = ['<template>', '</template>', '<script', '</script>', '<style', '</style>'];
for (const tag of tags) {
  const count = verify.split(tag).length - 1;
  if (count !== 1) console.log(tag + ': ' + count + ' (expected 1)');
}
console.log('Template/script/style counts look correct');
