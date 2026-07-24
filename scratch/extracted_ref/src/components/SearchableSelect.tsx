import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  group?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: (string | SelectOption)[];
  placeholder: string;
  disabled?: boolean;
  emptyMessage?: string;
  showSearch?: boolean;
  error?: boolean;
  className?: string;
  isClearable?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  emptyMessage = "Tidak ditemukan data. Ketik untuk mencari.",
  showSearch = true,
  error = false,
  className = "",
  isClearable = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to SelectOption[]
  const normalizedOptions = React.useMemo<SelectOption[]>(() => {
    return options.map(opt => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Find the label for the currently selected value
  const selectedOption = React.useMemo(() => {
    return normalizedOptions.find(opt => opt.value === value);
  }, [normalizedOptions, value]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update search input to match current value when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const filteredOptions = React.useMemo(() => {
    return normalizedOptions.filter(opt =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      opt.value.toLowerCase().includes(search.toLowerCase())
    );
  }, [normalizedOptions, search]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (search.trim() !== '') {
        const exactOrPartialMatch = filteredOptions.find(
          (opt) => opt.label.toLowerCase() === search.trim().toLowerCase()
        );
        if (exactOrPartialMatch) {
          handleSelect(exactOrPartialMatch.value);
        } else if (filteredOptions.length > 0) {
          handleSelect(filteredOptions[0].value);
        } else {
          handleSelect(search.trim());
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const isCustomOptionVisible = showSearch && search.trim() !== '' && 
    !normalizedOptions.some(opt => opt.label.toLowerCase() === search.trim().toLowerCase());

  // Grouped options if groups exist
  const hasGroups = React.useMemo(() => {
    return normalizedOptions.some(opt => !!opt.group);
  }, [normalizedOptions]);

  return (
    <div className={`relative w-full text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2.5 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-all shadow-sm ${
          isOpen ? 'border-[#10b981] ring-1 ring-[#10b981] bg-white' : ''
        } ${
          error ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
        } disabled:opacity-50 text-[13px] text-slate-700`}
      >
        <span className={value ? 'text-slate-800 font-medium' : 'text-slate-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center space-x-1.5">
          {value && isClearable && !disabled && (
            <span 
              onClick={(e) => {
                e.stopPropagation();
                handleSelect('');
              }}
              className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#10b981]' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-1.5 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 flex flex-col overflow-hidden animate-fade-in min-w-[200px]">
          {showSearch && (
            <div className="p-2 border-b border-slate-100 flex items-center bg-slate-50">
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik untuk mencari..."
                className="w-full bg-transparent focus:outline-none text-[16px] md:text-[13px] text-slate-700 py-1"
                autoFocus
              />
            </div>
          )}

          <div className="overflow-y-auto flex-1 max-h-48 py-1 scrollbar-thin">
            {isCustomOptionVisible && (
              <button
                type="button"
                onClick={() => handleSelect(search.trim())}
                className="w-full text-left px-4 py-2 text-[13px] text-teal-600 hover:bg-teal-50 font-semibold transition-colors border-b border-dashed border-slate-100 flex items-center space-x-1.5 cursor-pointer"
              >
                <span>+ Gunakan "{search.trim()}"</span>
              </button>
            )}

            {filteredOptions.length > 0 ? (
              hasGroups ? (
                // Group rendering
                (Object.entries(
                  filteredOptions.reduce((acc, opt) => {
                    const groupName = opt.group || 'Lainnya';
                    if (!acc[groupName]) acc[groupName] = [];
                    acc[groupName].push(opt);
                    return acc;
                  }, {} as Record<string, SelectOption[]>)
                ) as [string, SelectOption[]][]).map(([groupName, groupOpts]) => (
                  <div key={groupName} className="space-y-0.5">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                      {groupName}
                    </div>
                    {groupOpts.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={`w-full text-left px-4 py-2 text-[13px] flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                          value === opt.value ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-slate-700'
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {value === opt.value && <Check className="w-4 h-4 text-teal-600 shrink-0 ml-2" />}
                      </button>
                    ))}
                  </div>
                ))
              ) : (
                // Flat rendering
                filteredOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-4 py-2.5 text-[13px] flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                      value === opt.value ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {value === opt.value && <Check className="w-4 h-4 text-teal-600 shrink-0 ml-2" />}
                  </button>
                ))
              )
            ) : (
              !isCustomOptionVisible && (
                <div className="px-4 py-4 text-[12px] text-slate-400 text-center italic">
                  {emptyMessage}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
