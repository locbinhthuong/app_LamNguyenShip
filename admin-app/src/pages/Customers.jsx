import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Search, X, Loader2, Calendar } from 'lucide-react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../services/api';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await getCustomers();
      if (res.success) {
        setCustomers(res.data);
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi khi tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer = null) => {
    if (customer) {
      setIsEditing(true);
      setCurrentId(customer._id);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        password: '', // Chừa trống bớt nguy hiểm
        isActive: customer.isActive
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ name: '', phone: '', password: '', isActive: true });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return alert('Vui lòng nhập Tên và Số điện thoại');
    
    setSubmitting(true);
    try {
      if (isEditing) {
        // Tùy chỉnh update data: Nếu ko nhập pass thì không gừi pass
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        
        await updateCustomer(currentId, updateData);
        alert('Cập nhật thành công');
      } else {
        if (!formData.password) return alert('Vui lòng tạo mật khẩu cho Khách hàng mới');
        await createCustomer(formData);
        alert('Thêm khách hàng thành công');
      }
      setShowModal(false);
      fetchCustomers();
    } catch (error) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa khách hàng ${name}? Việc này rủi ro mất dữ liệu lịch sử đặt đơn nếu có liên kết.`)) return;
    try {
      await deleteCustomer(id);
      alert('Đã xóa');
      fetchCustomers();
    } catch (error) {
       alert('Có lỗi, không thể xóa khách hàng');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý Khách Hàng</h1>
          <p className="text-sm text-gray-500 mt-1">Xem, thêm, sửa, xóa thông tin account của Khách Hàng</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Thêm Khách Hàng
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="Tìm theo Tên hoặc Số điện thoại..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-colors"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
        </div>

        {loading ? (
           <div className="flex items-center justify-center py-20 text-blue-600">
             <Loader2 size={32} className="animate-spin" />
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Khách Hàng</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Số Điện Thoại</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Vai Trò</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Ngày Tham Gia</th>
                  <th className="py-3 px-4 font-medium text-center whitespace-nowrap">Trạng Thái</th>
                  <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-gray-500">Không tìm thấy khách hàng nào.</td>
                  </tr>
                ) : (
                  filteredCustomers.map(customer => (
                    <tr key={customer._id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                            {customer.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                             <p className="font-semibold text-gray-800">{customer.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-700">{customer.phone}</td>
                      <td className="py-3 px-4">
                        <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border border-emerald-100">
                          {customer.role === 'SHOP' ? 'SHOP / ĐỐI TÁC' : 'KHÁCH HÀNG'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">
                         <div className="flex items-center gap-1.5">
                            <Calendar size={14} />
                            {new Date(customer.createdAt).toLocaleDateString()}
                         </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${customer.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {customer.isActive ? 'Đang hoạt động' : 'Bị Khóa'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenModal(customer)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Sửa"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(customer._id, customer.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden animate-slideUp">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">
                {isEditing ? 'Sửa thông tin Khách Hàng' : 'Thêm Khách Hàng mới'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Họ Tên</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 font-medium"
                  placeholder="Nhập họ tên"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Số điện thoại</label>
                <input 
                  type="number" 
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 font-bold"
                  placeholder="Nhập số điện thoại"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Mật khẩu {isEditing ? '(Tùy chọn - để trống nếu không đổi)' : '*'}
                </label>
                <input 
                  type="password" 
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500"
                  placeholder={isEditing ? 'Nhập mật khẩu mới...' : 'Tạo mật khẩu...'}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>

              {isEditing && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 mt-4">
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={formData.isActive}
                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-800 cursor-pointer">
                    Cho phép hoạt động (Bỏ chọn để khóa tài khoản)
                  </label>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Hủy bỏ
                </button>
                <button 
                  disabled={submitting}
                  type="submit" 
                  className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {isEditing ? 'Cập nhật' : 'Tạo Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
