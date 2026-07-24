const fs = require('fs');
let code = fs.readFileSync('src/components/StudentModal.tsx', 'utf8');

// function to replace class for an input
function applyErrorToInput(code, labelStr, valueStr, errorKey) {
  // Find the block containing the label and input
  const blockStart = code.indexOf(labelStr);
  if (blockStart === -1) {
    console.log("Could not find label: ", labelStr);
    return code;
  }
  const valueIdx = code.indexOf(valueStr, blockStart);
  if (valueIdx === -1) {
    console.log("Could not find value string: ", valueStr, " after label ", labelStr);
    return code;
  }
  
  const classStartIdx = code.indexOf('className="', valueIdx);
  if (classStartIdx === -1) {
    console.log("Could not find className after value: ", valueStr);
    return code;
  }
  
  const classEndIdx = code.indexOf('"', classStartIdx + 11);
  const oldClass = code.substring(classStartIdx + 11, classEndIdx);
  
  const newClass = oldClass.replace('border-slate-200 bg-slate-50', `\${errors.${errorKey} ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'}`);
  
  const beforeClass = code.substring(0, classStartIdx);
  const afterClass = code.substring(classEndIdx + 1);
  
  let newCode = beforeClass + `className={\`${newClass}\`}` + afterClass;
  
  const inputEndIdx = newCode.indexOf('/>', classStartIdx);
  if (inputEndIdx !== -1) {
    newCode = newCode.substring(0, inputEndIdx + 2) + `\n                  {errors.${errorKey} && <p className="text-[11px] text-rose-500 mt-1">{errors.${errorKey}}</p>}` + newCode.substring(inputEndIdx + 2);
  }
  
  return newCode;
}

// 1. Siswa NIK
code = applyErrorToInput(code, '>NIK</label>', 'value={formData.nik}', 'nik');
// 2. Siswa HP
code = applyErrorToInput(code, '>No. HP/Whatsapp</label>', 'value={formData.hp}', 'hp');
// 3. Siswa Email
code = applyErrorToInput(code, '>Alamat Email</label>', 'value={formData.email}', 'email');
// 4. Ayah NIK
code = applyErrorToInput(code, '>NIK</label>', 'value={formData.ayah.nik}', 'ayah_nik');
// 5. Ayah HP
code = applyErrorToInput(code, '>Nomor HP/Whatsapp</label>', 'value={formData.ayah.hp}', 'ayah_hp');
// 6. Ibu NIK
code = applyErrorToInput(code, '>NIK</label>', 'value={formData.ibu.nik}', 'ibu_nik');
// 7. Ibu HP
code = applyErrorToInput(code, '>Nomor HP/Whatsapp</label>', 'value={formData.ibu.hp}', 'ibu_hp');
// 8. Wali NIK
code = applyErrorToInput(code, '>NIK</label>', 'value={formData.waliData.nik}', 'wali_nik');
// 9. Wali HP (wait let me check the label)
// I will check later if it fails

fs.writeFileSync('src/components/StudentModal.tsx', code);
console.log("Done");
