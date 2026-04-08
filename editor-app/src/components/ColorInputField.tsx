import React from 'react';

/** RGB文字列をHEXに変換 */
export const rgbToHex = (rgb: string): string => {
  if (rgb.startsWith('#')) return rgb;
  if (rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return '#ffffff';
  const match = rgb.match(/\d+/g);
  if (!match || match.length < 3) return '#000000';
  return '#' + match.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
};

interface ColorInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  showTextInput?: boolean;
}

export const ColorInputField: React.FC<ColorInputFieldProps> = ({ value, onChange, showTextInput = true }) => (
  <div className="color-input-group">
    <input
      type="color"
      value={rgbToHex(value)}
      onChange={e => onChange(e.target.value)}
    />
    {showTextInput && (
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="color-text"
      />
    )}
  </div>
);
