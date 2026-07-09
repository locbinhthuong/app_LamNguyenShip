import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { api, getFullImageUrl } from '../../services/api';

const ShopMenuManager = () => {
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: 'Khác',
    isAvailable: true,
    image: ''
  });

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await api.get('/shop/menu');
      if (res.data.success) {
        setMenuItems(res.data.data);
      }
    } catch (error) {
      console.error('Lỗi lấy menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        price: item.price,
        description: item.description || '',
        category: item.category || 'Khác',
        isAvailable: item.isAvailable,
        image: item.image || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        price: '',
        description: '',
        category: 'Khác',
        isAvailable: true,
        image: ''
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/shop/menu/${editingItem._id}`, formData);
        alert('Cập nhật món thành công!');
      } else {
        await api.post('/shop/menu', formData);
        alert('Thêm món mới thành công!');
      }
      setShowModal(false);
      fetchMenu();
    } catch (error) {
      alert('Có lỗi xảy ra: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa món này?')) {
      try {
        await api.delete(`/shop/menu/${id}`);
        fetchMenu();
      } catch (error) {
        alert('Lỗi khi xóa món!');
      }
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const form = new FormData();
    form.append('image', file);

    try {
      const res = await api.post('/upload/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setFormData({ ...formData, image: res.data.data.url });
      }
    } catch (err) {
      console.error('Upload error', err);
      alert('Lỗi tải ảnh lên');
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto bg-gray-50 font-sans min-h-screen">
      {/* HEADER */}
      <div className="shrink-0 bg-white/90 backdrop-blur-md px-5 py-4 safe-pt sticky top-0 z-40 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.02)] border-b border-gray-100/50">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 active:scale-[0.85] transition-transform duration-300 ease-out bg-gray-50 rounded-full hover:bg-gray-100">
          <ArrowLeft size={22} />
        </button>
        <span className="font-bold text-gray-800 flex-1 text-center pr-8 text-lg">
          Quản Lý Thực Đơn
        </span>
      </div>

      <div className="p-4 flex-1">
        <button 
          onClick={() => handleOpenModal()}
          className="w-full bg-blue-600 text-white rounded-xl py-3.5 flex items-center justify-center gap-2 font-bold mb-6 shadow-md hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          <Plus size={20} /> Thêm Món Mới
        </button>

        {loading ? (
          <div className="text-center py-10 text-gray-500">Đang tải...</div>
        ) : menuItems.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            Chưa có món ăn nào. Hãy thêm món mới!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map(item => (
              <div key={item._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-4 relative overflow-hidden">
                {!item.isAvailable && (
                  <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full font-bold text-sm shadow-md">Hết Hàng</span>
                  </div>
                )}
                
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative z-20">
                  {item.image ? (
                    <img src={getFullImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ImageIcon size={24} />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col justify-between relative z-20">
                  <div>
                    <h3 className="font-bold text-gray-800 line-clamp-1">{item.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
                    <p className="font-bold text-blue-600 mt-1">{item.price.toLocaleString('vi-VN')}đ</p>
                  </div>
                  <div className="flex items-center gap-2 mt-2 justify-end">
                    <button 
                      onClick={() => handleOpenModal(item)}
                      className="p-1.5 text-gray-500 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(item._id)}
                      className="p-1.5 text-red-500 bg-red-50 rounded-md hover:bg-red-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL THÊM / SỬA MÓN */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-lg">{editingItem ? 'Sửa Món Ăn' : 'Thêm Món Mới'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 bg-white p-1 rounded-full shadow-sm">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 overflow-y-auto flex-1 space-y-4">
              
              <div className="flex justify-center mb-4">
                <label className="w-24 h-24 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group">
                  {formData.image ? (
                    <>
                      <img src={getFullImageUrl(formData.image)} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-xs font-bold">Thay Đổi</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="text-blue-400 mb-1" />
                      <span className="text-[10px] font-medium text-blue-600">Thêm Ảnh</span>
                    </>
                  )}
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tên món *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all"
                  placeholder="VD: Trà sữa trân châu"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Giá tiền (VNĐ) *</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all"
                  placeholder="VD: 35000"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Mô tả (Không bắt buộc)</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all resize-none h-20"
                  placeholder="Mô tả chi tiết về món ăn..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Danh mục</label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all"
                >
                  <option value="Trà Sữa">Trà Sữa</option>
                  <option value="Cơm">Cơm</option>
                  <option value="Đồ Ăn Vặt">Đồ Ăn Vặt</option>
                  <option value="Đồ Uống">Đồ Uống</option>
                  <option value="Bún/Phở">Bún/Phở</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onChange={e => setFormData({...formData, isAvailable: e.target.checked})}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isAvailable" className="font-bold text-gray-700">Đang có hàng (Sẵn sàng bán)</label>
              </div>

              <div className="pt-4 pb-2">
                <button 
                  type="submit"
                  className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-[0.98] transition-all"
                >
                  {editingItem ? 'Lưu Thay Đổi' : 'Thêm Món Này'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ShopMenuManager;
