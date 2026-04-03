import { useState, useEffect } from 'react';
import { getStaffs, createStaff, updateStaff, deleteStaff } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Dispatchers() {
  const { admin } = useAuth();
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [status, setStatus] = useState('active');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchStaffs = async () => {
    try {
      setLoading(true);
      const res = await getStaffs();
      if (res.success) {
        setStaffs(res.data);
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi tải danh sách nhân viên: ' + (error.response?.data?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffs();
  }, []);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setName('');
    setPhone('');
    setPassword('');
    setRole('staff');
    setStatus('active');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (staff) => {
    setEditingStaff(staff);
    setName(staff.name);
    setPhone(staff.phone);
    setPassword(''); // pass rỗng = không đổi
    setRole(staff.role);
    setStatus(staff.status);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (saving) return; // đang lưu không cho đóng
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || (!editingStaff && !password.trim())) {
      return setErrorMsg('Vui lòng điền đủ Tên, SĐT và Mật khẩu.');
    }
    
    try {
      setSaving(true);
      setErrorMsg('');

      const payload = { name: name.trim(), phone: phone.trim(), role, status };
      if (password.trim()) payload.password = password.trim();

      if (editingStaff) {
        await updateStaff(editingStaff._id, payload);
        alert('Cập nhật nhân viên thành công!');
      } else {
        await createStaff(payload);
        alert('Tạo nhân viên thành công!');
      }
      setShowModal(false);
      fetchStaffs();
    } catch (error) {
      console.error(error);
      setErrorMsg(error.response?.data?.message || 'Có lỗi khi lưu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (staff) => {
    if (staff._id === admin?._id) return alert('Bạn không thể xoá chính mình!');
    if (!window.confirm(`Bạn có chắc chắn muốn xoá tài khoản ${staff.name} ? KHÔNG THỂ KHÔI PHỤC.`)) return;

    try {
      await deleteStaff(staff._id);
      alert('Đã xoá tài khoản.');
      fetchStaffs();
    } catch (error) {
      console.error(error);
      alert('Không thể xoá: ' + (error.response?.data?.message || ''));
    }
  };

  if (admin?.role !== 'admin' && admin?.role !== 'manager') {
    return <div className="p-4 text-red-500">Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <div className="p-4 md:p-6 pb-20 max-w-6xl mx-auto animate-fadeIn">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
            🎧 Quản Lý Tổng Đài Viên
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">Danh sách nhân viên vận hành và quản trị</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm text-sm"
        >
          + Thêm Nhân Viên
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500">Đang tải dữ liệu...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3">Nhân Viên</th>
                  <th className="px-4 py-3">Điện Thoại</th>
                  <th className="px-4 py-3">Vai Trò</th>
                  <th className="px-4 py-3">Trạng Thái</th>
                  <th className="px-4 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500">Chưa có nhân viên nào.</td>
                  </tr>
                ) : (
                  staffs.map(staff => (
                    <tr key={staff._id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{staff.name}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-600">{staff.phone}</td>
                      <td className="px-4 py-3">
                        {staff.role === 'admin' ? (
                          <span className="bg-red-100 text-red-700 py-0.5 px-2 rounded font-bold text-[10px] uppercase">Quản Trị</span>
                        ) : staff.role === 'manager' ? (
                          <span className="bg-blue-100 text-blue-700 py-0.5 px-2 rounded font-bold text-[10px] uppercase">Quản Lý</span>
                        ) : (
                          <span className="bg-green-100 text-green-700 py-0.5 px-2 rounded font-bold text-[10px] uppercase">Tổng Đài Viên</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`w-2.5 h-2.5 rounded-full inline-block mr-1.5 ${staff.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <span className={`text-[10px] font-bold uppercase ${staff.status === 'active' ? 'text-green-600' : 'text-slate-500'}`}>
                          {staff.status === 'active' ? 'Hoạt động' : 'Khoá'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button onClick={() => handleOpenEdit(staff)} className="text-blue-600 hover:text-blue-800 font-bold px-2 py-1 bg-blue-50 rounded-lg text-xs">Sửa</button>
                           {staff._id !== admin?._id && (
                              <button onClick={() => handleDelete(staff)} className="text-red-600 hover:text-red-800 font-bold px-2 py-1 bg-red-50 rounded-lg text-xs">Xoá</button>
                           )}
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

      {/* Modal Thêm sửa */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl flex flex-col max-h-[90vh]">
            <h2 className="text-lg font-bold text-slate-800 mb-4">{editingStaff ? 'Cập Nhật Tài Khoản' : 'Thêm Nhân Viên'}</h2>
            
            {errorMsg && <div className="mb-4 text-xs font-bold text-red-600 bg-red-50 p-2 rounded-lg">{errorMsg}</div>}
            
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Họ Tên</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" placeholder="Nguyễn Văn A" />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SĐT Đăng Nhập</label>
                <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full text-sm font-bold text-blue-600 p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" placeholder="09xxxx" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mật khẩu {editingStaff && '(Bỏ trống nếu không đổi)'}</label>
                <input required={!editingStaff} type="text" value={password} onChange={e => setPassword(e.target.value)} className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" placeholder="********" />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vai trò</label>
                  <select value={role} onChange={e => setRole(e.target.value)} className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none">
                    <option value="staff">Tổng Đài Viên</option>
                    <option value="manager">Quản Lý</option>
                    <option value="admin">Quản Trị Tối Cao</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Trạng Thái</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none">
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Khoá tài khoản</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-4">
                <button type="button" onClick={handleCloseModal} disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Huỷ bỏ</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200">{saving ? 'Đang lưu...' : 'Xác nhận'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
