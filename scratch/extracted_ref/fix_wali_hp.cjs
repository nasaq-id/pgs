const fs = require('fs');
let code = fs.readFileSync('src/components/StudentModal.tsx', 'utf8');

function applyErrorToInput(code, labelStr, valueStr, errorKey) {
  const blockStart = code.indexOf(labelStr, code.indexOf('value={formData.ibu'));
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

code = applyErrorToInput(code, '>No. HP/Whatsapp</label>', 'value={formData.waliData.hp}', 'wali_hp');

fs.writeFileSync('src/components/StudentModal.tsx', code);
console.log("Done");
