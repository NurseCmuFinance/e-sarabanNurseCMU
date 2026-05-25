import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string, label?: string) => void;
  placeholder?: string;
  required?: boolean;
  allowCustomInput?: boolean; // If true, user can type a value not in list (for 'From')
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
  options, value, onChange, placeholder = 'Select...', required = false, allowCustomInput = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Initialize search term with current value label if exists
  useEffect(() => {
    const selected = options.find(o => o.id === value);
    if (selected) {
      setSearchTerm(selected.label);
    } else if (value && allowCustomInput) {
        setSearchTerm(value);
    }
  }, [value, options, allowCustomInput]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // If allowing custom input, keep what user typed. If not, revert to valid value.
        if (!allowCustomInput) {
             const selected = options.find(o => o.id === value);
             setSearchTerm(selected ? selected.label : '');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, options, allowCustomInput]);

  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (option.subLabel && option.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (option: Option) => {
    onChange(option.id, option.label);
    setSearchTerm(option.label);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
      if (allowCustomInput) {
          onChange(e.target.value, e.target.value);
      } else {
          // Clear value while typing if strict select
          if (value) onChange('', '');
      }
      setIsOpen(true);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          className="modern-input pr-10"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onClick={() => setIsOpen(true)}
          required={required && !value}
        />
        <ChevronDown 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 cursor-pointer pointer-events-none transition-transform duration-200" 
            style={{ transform: isOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)' }}
            size={16} 
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white/95 backdrop-blur-md border border-stone-200/50 rounded-2xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-fade-in-scale">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-xs text-stone-500 font-bold text-center">
                {allowCustomInput ? 'กด Enter เพื่อใช้ชื่อนี้' : 'ไม่พบข้อมูล'}
            </div>
          ) : (
            filteredOptions.map(option => (
              <div
                key={option.id}
                onClick={() => handleSelect(option)}
                className={`px-4 py-2.5 cursor-pointer hover:bg-indigo-50/50 flex items-center justify-between transition-colors duration-150 group ${value === option.id ? 'bg-indigo-50/30' : ''}`}
              >
                <div>
                  <div className={`text-xs font-bold ${value === option.id ? 'text-indigo-600' : 'text-stone-700'}`}>
                    {option.label}
                  </div>
                  {option.subLabel && (
                    <div className="text-[10px] text-stone-400 font-medium mt-0.5">{option.subLabel}</div>
                  )}
                </div>
                {value === option.id && <Check size={14} className="text-indigo-600 shrink-0 ml-2" />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;