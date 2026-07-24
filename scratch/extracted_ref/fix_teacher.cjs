const fs = require('fs');
let code = fs.readFileSync('src/components/TeacherModal.tsx', 'utf8');

const validationAddition = `
    if (formData.hp) {
      if (formData.hp.length < 10 || formData.hp.length > 14) newErrors.hp = 'Nomor HP tidak valid (10-14 digit)!';
    }
    
    if (formData.email) {
      if (!formData.email.includes('@')) newErrors.email = 'Email harus mengandung @!';
    }
`;

code = code.replace(
  '// Validasi Data Kepegawaian',
  validationAddition + '\n    // Validasi Data Kepegawaian'
);

code = code.replace(
  'if (newErrors.nik || newErrors.nama || newErrors.jk || newErrors.username || newErrors.password) {',
  'if (newErrors.nik || newErrors.nama || newErrors.jk || newErrors.username || newErrors.password || newErrors.hp || newErrors.email) {'
);

const hpMatch = `onChange={(e) => handleChange('hp', e.target.value)}
                    placeholder="08xx"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0052cc] focus:ring-1 focus:ring-[#0052cc] text-[16px] md:text-[13px] text-slate-700 transition-colors"
                  />`;

const hpReplacement = `onChange={(e) => handleChange('hp', e.target.value.replace(/\\D/g, ''))}
                    maxLength={14}
                    placeholder="08xx"
                    className={\`w-full px-4 py-2.5 rounded-lg border \${errors.hp ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#0052cc] focus:ring-1 focus:ring-[#0052cc] text-[16px] md:text-[13px] text-slate-700 transition-colors\`}
                  />
                  {errors.hp && <p className="text-[11px] text-rose-500 mt-1">{errors.hp}</p>}`;

code = code.replace(hpMatch, hpReplacement);

const emailMatch = `onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="harus mengandung tanda @"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0052cc] focus:ring-1 focus:ring-[#0052cc] text-[16px] md:text-[13px] text-slate-700 transition-colors"
                  />`;

const emailReplacement = `onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="harus mengandung tanda @"
                    className={\`w-full px-4 py-2.5 rounded-lg border \${errors.email ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#0052cc] focus:ring-1 focus:ring-[#0052cc] text-[16px] md:text-[13px] text-slate-700 transition-colors\`}
                  />
                  {errors.email && <p className="text-[11px] text-rose-500 mt-1">{errors.email}</p>}`;

code = code.replace(emailMatch, emailReplacement);

fs.writeFileSync('src/components/TeacherModal.tsx', code);
console.log("Fixed teacher validations");
