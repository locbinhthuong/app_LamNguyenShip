import { useState, useEffect, useRef } from 'react';
import { uploadDriverAvatar, getFullImageUrl } from '../services/api';

export default function DriverProfileModal({ isOpen, onClose, driver, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    vehicleType: 'motorcycle',
    licensePlate: '',
    avatar: ''
  });

  useEffect(() => {
    if (driver && isOpen) {
      setFormData({
        name: driver.name || '',
        vehicleType: driver.vehicleType || 'motorcycle',
        licensePlate: driver.licensePlate || '',
        avatar: driver.avatar || ''
      });
      setAvatarPreview(driver.avatar || null);
      setAvatarFile(null);
      setIsEditing(false);
      setIsUploading(false);
    }
  }, [driver, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file hình ảnh hợp lệ!');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước ảnh không được vượt quá 5MB.');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    let finalAvatarUrl = formData.avatar;
    
    // Nếu có file mới, upload trước rồi mới save data
    try {
      if (avatarFile) {
        const result = await uploadDriverAvatar(avatarFile);
        if (result.success && result.data?.url) {
          finalAvatarUrl = result.data.url;
        }
      }

      const submissionData = { ...formData, avatar: finalAvatarUrl };
      await onSave(submissionData);
    } catch (error) {
      console.error('Upload Error:', error);
      alert('Có lỗi xảy ra khi tải ảnh lên. Vui lòng thử lại sau!');
    } finally {
      setIsUploading(false);
    }
  };

  const VEHICLE_EMOJI = {
    motorcycle: '🏍️ Xe máy',
    bike: '🚲 Xe đạp',
    car: '🚗 Ô tô'
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden transform transition-all">
        {/* Modal Header */}
        <div className="bg-blue-600 p-4 flex justify-between items-center text-white relative">
          <h2 className="font-bold text-lg">{isEditing ? 'Cập nhật hồ sơ' : 'Hồ sơ tài xế'}</h2>
          <button onClick={onClose} className="rounded-full bg-black/10 hover:bg-black/20 p-2 border-0 w-8 h-8 flex items-center justify-center transition-colors">
            ✕
          </button>
        </div>

        {/* Cấu trúc xem Profile */}
        {!isEditing ? (
          <div className="p-6">
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 rounded-full bg-blue-100 border-4 border-blue-50 overflow-hidden flex items-center justify-center mb-3 shadow-inner">
                {driver?.avatar ? (
                  <img src={getFullImageUrl(driver.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-blue-500">
                    {driver?.name?.charAt(0).toUpperCase() || '👤'}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-800">{driver?.name}</h3>
              <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full mt-1">
                {driver?.driverCode}
              </span>
            </div>

            <div className="space-y-4 mb-6 relative">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg">📞</div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Số điện thoại</p>
                  <p className="text-sm font-bold text-slate-800">{driver?.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-lg">{driver?.vehicleType === 'car' ? '🚗' : '🏍️'}</div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Phương tiện</p>
                  <p className="text-sm font-bold text-slate-800">
                    {VEHICLE_EMOJI[driver?.vehicleType]} {driver?.licensePlate && `- ${driver.licensePlate}`}
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsEditing(true)}
              className="w-full py-3.5 rounded-xl font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors border-2 border-transparent hover:border-blue-200"
            >
              ✏️ Chỉnh sửa hồ sơ
            </button>
          </div>
        ) : (
          /* Khung sửa thông tin */
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Khu vực chọn Ảnh đại diện mới */}
              <div className="flex flex-col items-center mb-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center mb-2 shadow-sm cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors relative group"
                >
                  {avatarPreview ? (
                    <img src={getFullImageUrl(avatarPreview)} alt="Preview" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                  ) : (
                    <span className="text-2xl text-slate-400">📷</span>
                  )}
                  {avatarPreview && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xl">
                      📷
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Đổi ảnh đại diện
                </button>
                <input 
                  type="file" 
                  accept="image/jpeg, image/png, image/webp"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Họ và Tên</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  required 
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Phương tiện</label>
                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="motorcycle">Xe máy</option>
                  <option value="bike">Xe đạp</option>
                  <option value="car">Ô tô</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Biển số xe (nếu có)</label>
                <input 
                  type="text" 
                  name="licensePlate" 
                  value={formData.licensePlate} 
                  onChange={handleChange} 
                  placeholder="VD: 59A1-12345"
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 uppercase" 
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)} 
                  disabled={isUploading}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Trở lại
                </button>
                <button 
                  type="submit" 
                  disabled={isUploading}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center disabled:opacity-50"
                >
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Lưu hồ sơ'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
