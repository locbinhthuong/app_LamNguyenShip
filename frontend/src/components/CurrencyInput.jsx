import React, { useState, useEffect } from 'react';

export default function CurrencyInput({ value, onChange, name, placeholder, className, min = 0, disabled = false, required = false }) {
  const [displayValue, setDisplayValue] = useState('');

  // Sinc up internal state with external value
  useEffect(() => {
    if (value === undefined || value === null) {
      setDisplayValue('');
      return;
    }
    // Lọc bỏ tất cả số 0 ở đầu nếu chỉ có số 0 (trừ khi giá trị thật sự là 0)
    let stringVal = value.toString();
    if (stringVal === '0') {
      setDisplayValue(''); // Hiển thị rỗng thay vì 0 để người dùng dễ nhập mới
    } else {
      setDisplayValue(Number(stringVal).toLocaleString('vi-VN'));
    }
  }, [value]);

  const handleChange = (e) => {
    let raw = e.target.value.replace(/\./g, ''); // Xóa dấu chấm
    if (raw === '') {
      setDisplayValue('');
      onChange({ target: { name, value: 0 } });
      return;
    }
    
    // Nếu có chữ thì bỏ qua
    if (!/^\d+$/.test(raw)) return;

    const num = parseInt(raw, 10);
    setDisplayValue(num.toLocaleString('vi-VN'));
    onChange({ target: { name, value: num } });
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      name={name}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      required={required}
    />
  );
}
