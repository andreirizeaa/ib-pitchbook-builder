import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
  desc?: string;
  render?: React.ReactNode;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export function Dropdown({ options, value, onChange, placeholder = 'Select...', label, required }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {label}{required && ' *'}
        </label>
      )}
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          if (!isOpen && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setDropUp(spaceBelow < 240);
          }
          setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg transition-colors bg-white ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {selected ? (
          <span className="truncate">
            {selected.render || selected.label}
          </span>
        ) : (
          <span className="text-gray-400 truncate">{placeholder}</span>
        )}
        <div className="flex items-center flex-shrink-0 ml-2 gap-1">
          {!required && selected && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); setIsOpen(false); }}
              className="p-0.5 rounded hover:bg-gray-200 transition-colors"
            >
              <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className={`absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto ${
          dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                value === option.value
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                {option.render || (
                  <>
                    <span className={value === option.value ? 'font-medium' : ''}>{option.label}</span>
                    {option.desc && (
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{option.desc}</p>
                    )}
                  </>
                )}
              </div>
              {value === option.value && (
                <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
