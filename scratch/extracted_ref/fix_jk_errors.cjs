const fs = require('fs');

// TeacherModal.tsx
let teacherCode = fs.readFileSync('src/components/TeacherModal.tsx', 'utf8');
teacherCode = teacherCode.replace(
  '<span className="text-[13px] text-slate-600">Perempuan</span>\n                    </label>\n                  </div>',
  '<span className="text-[13px] text-slate-600">Perempuan</span>\n                    </label>\n                  </div>\n                  {errors.jk && <p className="text-[11px] text-rose-500 mt-1">{errors.jk}</p>}'
);
fs.writeFileSync('src/components/TeacherModal.tsx', teacherCode);


// StudentModal.tsx
let studentCode = fs.readFileSync('src/components/StudentModal.tsx', 'utf8');
// Add validation to handleSave
studentCode = studentCode.replace(
  "if (!formData.password) newErrors.password = 'Password siswa wajib diisi!';",
  "if (!formData.password) newErrors.password = 'Password siswa wajib diisi!';\n    if (!formData.jk) newErrors.jk = 'Jenis Kelamin wajib diisi!';"
);
// Add error display
studentCode = studentCode.replace(
  '<span className="text-[13px] text-slate-600">Perempuan</span>\n                    </label>\n                  </div>',
  '<span className="text-[13px] text-slate-600">Perempuan</span>\n                    </label>\n                  </div>\n                  {errors.jk && <p className="text-[11px] text-rose-500 mt-1">{errors.jk}</p>}'
);
fs.writeFileSync('src/components/StudentModal.tsx', studentCode);

console.log("Fixed jk errors");
