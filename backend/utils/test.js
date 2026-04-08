const ArabicReshaper = require('arabic-persian-reshaper').ArabicReshaper;
const reshaper = new ArabicReshaper();
let text = "مرحبا";
console.log(reshaper.convertArabic(text));
