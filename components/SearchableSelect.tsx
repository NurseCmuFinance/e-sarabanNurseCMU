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
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onClick={() => setIsOpen(true)}
          required={required && !value}
        />
        <ChevronDown 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer pointer-events-none" 
            size={16} 
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-sm text-slate-500 text-center">
                {allowCustomInput ? 'กด Enter เพื่อใช้ชื่อนี้' : 'ไม่พบข้อมูล'}
            </div>
          ) : (
            filteredOptions.map(option => (
              <div
                key={option.id}
                onClick={() => handleSelect(option)}
                className={`px-4 py-2 cursor-pointer hover:bg-blue-50 flex items-center justify-between group ${value === option.id ? 'bg-blue-50' : ''}`}
              >
                <div>
                  <div className={`text-sm font-medium ${value === option.id ? 'text-blue-700' : 'text-slate-700'}`}>
                    {option.label}
                  </div>
                  {option.subLabel && (
                    <div className="text-xs text-slate-500">{option.subLabel}</div>
                  )}
                </div>
                {value === option.id && <Check size={16} className="text-blue-600" />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;