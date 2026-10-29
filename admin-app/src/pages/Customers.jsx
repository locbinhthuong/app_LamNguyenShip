import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Edit2, Trash2, Search, X, Loader2, Calendar, ShieldCheck, 
  CheckCircle2, XCircle, Phone, MessageSquare, AlertTriangle, ShieldAlert 
} from 'lucide-react';
import { 
  getCustomers, createCustomer, updateCustomer, deleteCustomer, 
  getFullImageUrl, uploadDriverAvatar, verifyCustomer 
} from '../services/api';
import { getRegionConfig } from '../services/configService';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Verification Tab & Counts
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, PENDING, VERIFIED, REJECTED
  const [counts, setCounts] = useState({ pending: 0, verified: 0, rejected: 0 });

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingCustomer, setRejectingCustomer] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    isActive: true,
    avatar: '',
    region: ''
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();

    const handleRefresh = () => {
      fetchCustomers();
    };
    window.addEventListener('refresh_customer_verifications', handleRefresh);
    return () => window.removeEventListener('refresh_customer_verifications', handleRefresh);
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [custRes, regRes] = await Promise.all([
        getCustomers({ verificationStatus: activeTab === 'ALL' ? undefined : activeTab }),
        getRegionConfig().catch(() => null)
      ]);
      if (custRes.success) {
        setCustomers(custRes.data);
        if (custRes.counts) {
          setCounts(custRes.counts);
        }
      }
      if (regRes && regRes.success && regRes.data && Array.isArray(regRes.data.value)) {
        setRegions(regRes.data.value);
      } else {
        setRegions(['Cần Thơ', 'Vĩnh Long']);
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await getCustomers({ verificationStatus: activeTab === 'ALL' ? undefined : activeTab });
      if (res.success) {
        setCustomers(res.data);
        if (res.counts) {
          setCounts(res.counts);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Duyệt tài khoản
  const handleApprove = async (customer) => {
    if (!window.confirm(`Xác nhận phê duyệt tài khoản của ${customer.name} (${customer.phone})? Khách sẽ được phép sử dụng dịch vụ ngay lập tức.`)) return;
    
    setProcessingId(customer._id);
    try {
      const res = await verifyCustomer(customer._id, 'VERIFIED');
      if (res.success) {
        alert('✅ Đã phê duyệt tài khoản thành công!');
        fetchCustomers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi phê duyệt tài khoản');
    } finally {
      setProcessingId(null);
    }
  };

  // Mở modal từ chối
  const handleOpenReject = (customer) => {
    setRejectingCustomer(customer);
    setRejectReason('Số điện thoại không liên lạc được hoặc chưa xác định được Zalo chính chủ');
    setShowRejectModal(true);
  };

  // Gửi từ chối
  const handleConfirmReject = async () => {
    if (!rejectingCustomer) return;
    if (!rejectReason.trim()) return alert('Vui lòng nhập lý do từ chối');

    setProcessingId(rejectingCustomer._id);
    try {
      const res = await verifyCustomer(rejectingCustomer._id, 'REJECTED', rejectReason.trim());
      if (res.success) {
        alert('Đã từ chối xác minh tài khoản');
        setShowRejectModal(false);
        setRejectingCustomer(null);
        fetchCustomers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi từ chối tài khoản');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenModal = (customer = null) => {
    if (customer) {
      setIsEditing(true);
      setCurrentId(customer._id);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        password: '',
        isActive: customer.isActive,
        avatar: customer.avatar || '',
        region: customer.region || ''
      });
      setAvatarPreview(customer.avatar || null);
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ name: '', phone: '', password: '', isActive: true, avatar: '', region: '' });
      setAvatarPreview(null);
    }
    setAvatarFile(null);
    setShowModal(true);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return alert('Vui lòng nhập Tên và Số điện thoại');
    
    setSubmitting(true);
    try {
      let finalAvatarUrl = formData.avatar;
      if (avatarFile) {
        const uploadRes = await uploadDriverAvatar(avatarFile);
        if (uploadRes.success) {
          finalAvatarUrl = uploadRes.data.url;
        }
      }

      if (isEditing) {
        const updateData = { ...formData, avatar: finalAvatarUrl };
        if (!updateData.password) delete updateData.password;
        
        await updateCustomer(currentId, updateData);
        alert('Cập nhật thành công');
      } else {
        if (!formData.password) return alert('Vui lòng tạo mật khẩu cho Khách hàng mới');
        await createCustomer({ ...formData, avatar: finalAvatarUrl });
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

  const handleApprovalToggle = async (id, currentApprovalStatus) => {
    try {
      await updateCustomer(id, { isApprovedShop: !currentApprovalStatus });
      fetchCustomers();
    } catch (error) {
      alert('Có lỗi xảy ra khi duyệt cửa hàng');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm)
  );

  const regularCustomers = filteredCustomers.filter(c => c.role !== 'SHOP');
  const shopCustomers = filteredCustomers.filter(c => c.role === 'SHOP');

  // Badge trạng thái xác minh
  const renderVerificationBadge = (customer) => {
    const status = customer.verificationStatus || 'VERIFIED';
    if (status === 'PENDING') {
      return (
        <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 animate-pulse">
          ⏳ Chờ duyệt SĐT
        </span>
      );
    }
    if (status === 'VERIFIED') {
      return (
        <span className="bg-green-100 text-green-700 border border-green-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">
          <CheckCircle2 size={12} /> Đã xác minh
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="bg-red-100 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1" title={customer.rejectReason || ''}>
          <XCircle size={12} /> Bị từ chối
        </span>
      );
    }
    return (
      <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 animate-pulse">
        ⏳ Chờ duyệt SĐT
      </span>
    );
  };

  // Nút hành động xác minh
  const renderVerificationActions = (customer) => {
    const status = customer.verificationStatus || 'VERIFIED';
    const zaloNum = customer.zaloPhone || customer.phone;

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Nút check Zalo nhanh */}
        <a 
          href={`https://zalo.me/${zaloNum}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
          title="Mở Zalo kiểm tra tài khoản chính chủ"
        >
          <MessageSquare size={13} /> Zalo
        </a>

        {/* Nút gọi điện */}
        <a 
          href={`tel:${customer.phone}`}
          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
          title="Gọi kiểm tra số điện thoại"
        >
          <Phone size={13} /> Gọi
        </a>

        {/* Nút Duyệt nếu đang PENDING hoặc REJECTED */}
        {status !== 'VERIFIED' && (
          <button 
            disabled={processingId === customer._id}
            onClick={() => handleApprove(customer)}
            className="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 size={13} /> Duyệt
          </button>
        )}

        {/* Nút Từ chối nếu đang PENDING */}
        {status === 'PENDING' && (
          <button 
            disabled={processingId === customer._id}
            onClick={() => handleOpenReject(customer)}
            className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
          >
            <XCircle size={13} /> Từ chối
          </button>
        )}
      </div>
    );
  };

  const renderCustomerCards = (list) => (
    <div className="space-y-4 lg:hidden">
      {list.length === 0 ? (
        <div className="py-10 text-center text-gray-500">Không có dữ liệu.</div>
      ) : (
        list.map(customer => (
          <div key={customer._id} className="bg-white border text-sm border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 shrink-0 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold overflow-hidden border border-gray-200">
                {customer.avatar ? (
                  <img src={getFullImageUrl(customer.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  customer.name?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-base truncate">{customer.name}</p>
                <p className="text-gray-500 text-xs font-mono">{customer.phone}</p>
                {customer.verificationNote && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-1 border border-amber-200">
                    📝 Note: {customer.verificationNote}
                  </p>
                )}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1.5">
                {renderVerificationBadge(customer)}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${customer.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {customer.isActive ? 'Đang HĐ' : 'Bị Khóa'}
                </span>
                <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-100">
                  {customer.role === 'SHOP' ? 'SHOP / Đối tác' : 'KHÁCH'}
                </span>
              </div>
            </div>
            
            {/* Thanh công cụ kiểm tra Zalo & Duyệt */}
            <div className="my-2.5 pt-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-gray-500">Xác minh SĐT:</span>
              {renderVerificationActions(customer)}
            </div>

            <div className="flex items-center justify-between mt-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100">
                <Calendar size={14} className="text-gray-400" />
                Tham gia: {new Date(customer.createdAt).toLocaleDateString()}
              </div>
              
              <div className="flex items-center gap-2">
                {customer.role === 'SHOP' && (
                  <button 
                    onClick={() => handleApprovalToggle(customer._id, customer.isApprovedShop)}
                    className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 font-semibold ${customer.isApprovedShop ? 'text-blue-600 bg-blue-50' : 'text-gray-500 bg-gray-100'}`}
                  >
                    <ShieldCheck size={14} /> Duyệt Quán
                  </button>
                )}
                <button 
                  onClick={() => handleOpenModal(customer)}
                  className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 font-semibold"
                >
                  <Edit2 size={14} /> Sửa
                </button>
                <button 
                  onClick={() => handleDelete(customer._id, customer.name)}
                  className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1 font-semibold"
                >
                  <Trash2 size={14} /> Xóa
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderCustomerTable = (list) => (
    <div className="hidden lg:block overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[850px]">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
            <th className="py-3 px-4 font-medium whitespace-nowrap">Khách Hàng</th>
            <th className="py-3 px-4 font-medium whitespace-nowrap">Số Điện Thoại</th>
            <th className="py-3 px-4 font-medium whitespace-nowrap">Xác Minh (Chống Bom)</th>
            <th className="py-3 px-4 font-medium whitespace-nowrap">Kiểm Tra & Phê Duyệt</th>
            <th className="py-3 px-4 font-medium whitespace-nowrap">Vai Trò</th>
            <th className="py-3 px-4 font-medium whitespace-nowrap">Khu Vực</th>
            <th className="py-3 px-4 font-medium text-center whitespace-nowrap">Trạng Thái</th>
            <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Thao Tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {list.length === 0 ? (
            <tr>
              <td colSpan="8" className="py-10 text-center text-gray-500">Không có dữ liệu.</td>
            </tr>
          ) : (
            list.map(customer => (
              <tr key={customer._id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold overflow-hidden border border-gray-200">
                      {customer.avatar ? (
                        <img src={getFullImageUrl(customer.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        customer.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{customer.name}</p>
                      {customer.verificationNote && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 max-w-[200px] truncate" title={customer.verificationNote}>
                          Note: {customer.verificationNote}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 font-bold text-gray-700 font-mono">{customer.phone}</td>
                <td className="py-3 px-4 whitespace-nowrap">
                  {renderVerificationBadge(customer)}
                  {customer.rejectReason && customer.verificationStatus === 'REJECTED' && (
                    <p className="text-[10px] text-red-500 mt-0.5 max-w-[150px] truncate" title={customer.rejectReason}>
                      Lý do: {customer.rejectReason}
                    </p>
                  )}
                </td>
                <td className="py-3 px-4">
                  {renderVerificationActions(customer)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-col gap-1 items-start">
                    <span className="bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap border border-emerald-100">
                      {customer.role === 'SHOP' ? 'SHOP / ĐỐI TÁC' : 'KHÁCH HÀNG'}
                    </span>
                    {customer.role === 'SHOP' && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${customer.isApprovedShop ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {customer.isApprovedShop ? 'Đã duyệt AloFood' : 'Chưa duyệt'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-sm font-semibold text-blue-600 whitespace-nowrap">
                  {customer.region || '-'}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${customer.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {customer.isActive ? 'Hoạt động' : 'Bị Khóa'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {customer.role === 'SHOP' && (
                      <button 
                        onClick={() => handleApprovalToggle(customer._id, customer.isApprovedShop)}
                        className={`p-2 rounded-lg transition-colors ${customer.isApprovedShop ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-100'}`}
                        title={customer.isApprovedShop ? "Hủy duyệt AloFood" : "Duyệt AloFood"}
                      >
                        <ShieldCheck size={18} />
                      </button>
                    )}
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
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="text-blue-600" /> Quản lý Khách Hàng & Cửa Hàng
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Xác minh SĐT/Zalo chính chủ để phòng chống quậy phá, bom hàng và cấp quyền đặt đơn
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={20} /> Thêm Khách Hàng
        </button>
      </div>

      {/* TABS LỌC TRẠNG THÁI XÁC MINH */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-100 overflow-x-auto shadow-sm">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'ALL' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Tất cả
        </button>
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'PENDING' ? 'bg-amber-500 text-white shadow' : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
          }`}
        >
          <span>⏳ Chờ xác minh</span>
          {counts.pending > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeTab === 'PENDING' ? 'bg-white text-amber-600' : 'bg-red-500 text-white animate-pulse'
            }`}>
              {counts.pending}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('VERIFIED')}
          className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'VERIFIED' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          <CheckCircle2 size={16} />
          <span>Đã xác minh ({counts.verified})</span>
        </button>
        <button
          onClick={() => setActiveTab('REJECTED')}
          className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'REJECTED' ? 'bg-red-600 text-white shadow' : 'text-red-700 bg-red-50 hover:bg-red-100'
          }`}
        >
          <XCircle size={16} />
          <span>Bị từ chối ({counts.rejected})</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
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
          <>
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4 px-2 flex items-center gap-2">
                <Users className="text-blue-600" /> Khách Cá Nhân ({regularCustomers.length})
              </h2>
              {renderCustomerCards(regularCustomers)}
              {renderCustomerTable(regularCustomers)}
            </div>

            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4 px-2 flex items-center gap-2">
                <span className="text-emerald-600">🏪</span> Chủ Cửa Hàng ({shopCustomers.length})
              </h2>
              {renderCustomerCards(shopCustomers)}
              {renderCustomerTable(shopCustomers)}
            </div>
          </>
        )}
      </div>

      {/* Modal Từ chối xác minh */}
      {showRejectModal && rejectingCustomer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-slideUp">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-red-50 text-red-800">
              <h3 className="font-bold text-base flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-600" /> Từ chối tài khoản {rejectingCustomer.name}
              </h3>
              <button onClick={() => setShowRejectModal(false)} className="p-1 rounded-full hover:bg-red-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Số điện thoại: <strong className="text-gray-900">{rejectingCustomer.phone}</strong></p>
                <label className="block text-sm font-bold text-gray-800 mb-1">Lý do từ chối:</label>
                <textarea 
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:border-red-500 outline-none"
                  placeholder="Nhập lý do (ví dụ: Số thuê bao không có thật, gọi không nghe máy, nghi vấn tài khoản rác...)"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={processingId === rejectingCustomer._id}
                  onClick={handleConfirmReject}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm shadow-md shadow-red-600/30"
                >
                  {processingId === rejectingCustomer._id ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div className="flex flex-col items-center justify-center mb-4">
                <label className="text-sm font-semibold text-gray-700 mb-2">Ảnh Đại Diện</label>
                <div className="relative w-24 h-24 rounded-full border-4 border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden group">
                  {avatarPreview ? (
                    <img src={getFullImageUrl(avatarPreview)} alt="Preview" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                  ) : (
                    <Users size={32} className="text-gray-300" />
                  )}
                  <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <span className="text-[10px] font-bold text-white uppercase">Đổi ảnh</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
                </div>
              </div>

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

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Khu vực hoạt động</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 font-medium bg-white"
                  value={formData.region || ''}
                  onChange={e => setFormData({...formData, region: e.target.value})}
                >
                  <option value="">-- Chọn khu vực --</option>
                  {regions.map((reg, idx) => (
                    <option key={idx} value={reg}>{reg}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="isActiveCheck" 
                  checked={formData.isActive}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="isActiveCheck" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Kích hoạt tài khoản (Cho phép đăng nhập)
                </label>
              </div>

              <div className="pt-4 border-t border-gray-100 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {isEditing ? 'Cập Nhật' : 'Thêm Mới'}
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
