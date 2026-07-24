const fs = require('fs');
let code = fs.readFileSync('src/components/SearchableSelect.tsx', 'utf8');

if (!code.includes('error?: boolean;')) {
    code = code.replace('showSearch?: boolean;', 'showSearch?: boolean;\n  error?: boolean;');
    code = code.replace('showSearch = true,', 'showSearch = true,\n  error = false,');
    
    // update className of the button
    code = code.replace(
      'className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 disabled:opacity-50 text-left focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 flex items-center justify-between cursor-pointer transition-all shadow-sm hover:border-slate-300"',
      'className={`w-full px-4 py-2.5 rounded-lg border ${error ? \'border-rose-500 bg-rose-50\' : \'border-slate-200 bg-slate-50 hover:border-slate-300\'} disabled:opacity-50 text-left focus:bg-white focus:outline-none focus:border-[#10b981] text-[13px] text-slate-700 flex items-center justify-between cursor-pointer transition-all shadow-sm`}'
    );
    
    fs.writeFileSync('src/components/SearchableSelect.tsx', code);
    console.log("SearchableSelect updated");
}
