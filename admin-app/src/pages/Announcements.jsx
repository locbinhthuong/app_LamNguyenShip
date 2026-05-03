import { useState, useEffect, useRef } from 'react';
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, uploadMedia, getFullImageUrl } from '../services/api';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States cho Form Thêm/Sửa
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [form, setForm] = useState({ type: 'NEWS', title: '', content: '', imageUrl: '', videoUrl: '', isActive: true });
  
  const [isUploading, setIsUploading] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState(null);
  const [mediaType, setMediaType] = useState('image'); // 'image' hoặc 'video'
  const [multipleFiles, setMultipleFiles] = useState([]);
  const [multiplePreviewUrls, setMultiplePreviewUrls] = useState([]);
  const fileInputRef = useRef(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getAnnouncements();
      if (res.success) setAnnouncements(res.data);
    } catch (err) {
      alert('Không thể tải danh sách Tin Tức');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openAddModal = () => {
    setForm({ type: 'NEWS', title: '', content: '', imageUrl: '', videoUrl: '', isActive: true });
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setMultipleFiles([]);
    setMultiplePreviewUrls([]);
    setIsEditing(false);
    setCurrentId(null);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setForm({ 
      type: item.type || 'NEWS',
      title: item.title, 
      content: item.content, 
      imageUrl: item.imageUrl || '', 
      videoUrl: item.videoUrl || '', 
      isActive: item.isActive 
    });
    setMediaFile(null);
    setMultipleFiles([]);
    setMultiplePreviewUrls([]);
    
    // Ưu tiên hiển thị video nếu có, ngược lại hiển thị ảnh
    if (item.videoUrl) {
      setMediaType('video');
      setMediaPreviewUrl(item.videoUrl);
    } else if (item.imageUrl) {
      setMediaType('image');
      setMediaPreviewUrl(item.imageUrl);
    } else {
      setMediaPreviewUrl(null);
    }
    
    setIsEditing(true);
    setCurrentId(item._id);
    setShowModal(true);
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`XÓA TẬN GỐC TIN "${title}"?\nTính năng này sẽ tự động xóa sạch Hình/Video đính kèm trong Máy Chủ vĩnh viễn!`)) return;
    try {
      const res = await deleteAnnouncement(id);
      if (res.success) {
        alert('Đã Xóa Thành Công!');
        loadData();
      }
    } catch (err) {
      alert('Lỗi khi xóa Tin tức!');
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await updateAnnouncement(item._id, { isActive: !item.isActive });
      loadData();
    } catch (err) {
      alert('Lỗi cập nhật trạng thái');
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    if (form.type === 'BANNER' && !isEditing) {
      for (let file of files) {
         if (file.type && !file.type.startsWith('image/')) {
            return alert('Quảng Cáo chỉ hỗ trợ tải lên Hình Ảnh (không hỗ trợ Video)!');
         }
         if (file.size > 50 * 1024 * 1024) return alert('Một số file vượt quá dung lượng tối đa 50MB!');
      }
      setMultipleFiles(prev => [...prev, ...files]);
      setMultiplePreviewUrls(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
      setMediaFile(null);
      setMediaPreviewUrl(null);
    } else {
      const file = files[0];
      if (form.type === 'BANNER' && file.type && !file.type.startsWith('image/')) {
         return alert('Quảng Cáo chỉ hỗ trợ tải lên Hình Ảnh (không hỗ trợ Video)!');
      }
      if (file.mimetype && !file.type.startsWith('image/') && !file.type.startsWith('video/')) {
         return alert('Chỉ hỗ trợ file Hình ảnh hoặc Video!');
      }
      if (file.size > 50 * 1024 * 1024) return alert('Dung lượng tối đa 50MB!');
      
      setMediaFile(file);
      setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
      setMediaPreviewUrl(URL.createObjectURL(file));
      setMultipleFiles([]);
      setMultiplePreviewUrls([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.type !== 'BANNER' && (!form.title || !form.content)) return alert('Vui lòng nhập Tiêu đề và Nội dung!');
    if (form.type === 'BANNER' && !mediaFile && !mediaPreviewUrl && multipleFiles.length === 0) return alert('Bảng tin loại Quảng Cáo bắt buộc phải có Hình Ảnh hoặc Video!');
    if (form.type === 'PAYMENT_QR') {
      const existingQR = announcements.find(a => a.type === 'PAYMENT_QR' && a._id !== currentId);
      if (existingQR) {
        return alert('Chỉ được phép tạo 1 mã QR Công Nợ duy nhất! Vui lòng xóa mã cũ hoặc chỉnh sửa mã đã có.');
      }
    }
    
    setIsUploading(true);
    try {
      if (form.type === 'BANNER' && !isEditing && multipleFiles.length > 0) {
        let successCount = 0;
        for (let file of multipleFiles) {
          const upRes = await uploadMedia(file);
          if (upRes.success) {
            const submitData = { ...form, imageUrl: upRes.data.url, videoUrl: '' };
            await createAnnouncement(submitData);
            successCount++;
          }
        }
        alert(`Đã đăng thành công ${successCount} Quảng Cáo!`);
      } else {
        let finalImageUrl = form.imageUrl;
        let finalVideoUrl = form.videoUrl;

        // Nếu có file mới, tải lên trước
        if (mediaFile) {
          const upRes = await uploadMedia(mediaFile);
          if (upRes.success) {
            if (upRes.data.type === 'video') {
              finalVideoUrl = upRes.data.url;
              finalImageUrl = ''; // Thay thế hình bằng video
            } else {
              finalImageUrl = upRes.data.url;
              finalVideoUrl = ''; // Thay thế video bằng hình
            }
          }
        }

        const submitData = { ...form, imageUrl: finalImageUrl, videoUrl: finalVideoUrl };

        if (isEditing) {
          await updateAnnouncement(currentId, submitData);
          alert('Đã cập nhật Bảng Tin!');
        } else {
          await createAnnouncement(submitData);
          alert('Đã đăng Bảng Tin mới!');
        }
      }
      
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi lưu Bảng tin!');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản Lý Marketing</h1>
          <p className="text-sm text-slate-500 mt-1">Nơi bạn đăng Khuyến Mãi và Bảng Tin Tức cho App Khách Hàng</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-105"
        >
          + Đăng Tin Mới
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center h-40 items-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <div className="text-6xl mb-4">📰</div>
          <h3 className="text-lg font-bold text-slate-700">Chưa có bản tin nào</h3>
          <p className="text-slate-500">Hãy thêm bài đăng quảng cáo đầu tiên đi Sếp!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.map(ann => (
            <div key={ann._id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xl hover:shadow-2xl transition-all flex flex-col">
              {/* Vùng Render Media (Ảnh/Video) */}
              <div className="h-48 w-full bg-slate-100 flex items-center justify-center relative overflow-hidden group">
                 {!ann.isActive && (
                   <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center">
                     <span className="text-white font-bold border-2 border-white px-4 py-1.5 rounded-lg rotate-[-15deg]">Đã Ẩn</span>
                   </div>
                 )}
                 
                 {ann.type === 'PAYMENT_QR' ? (
                   <span className="text-4xl">💳</span>
                 ) : ann.videoUrl ? (
                   <video src={getFullImageUrl(ann.videoUrl)} className="w-full h-full object-cover" controls muted />
                 ) : ann.imageUrl ? (
                   <img src={getFullImageUrl(ann.imageUrl)} alt="News" className={`w-full h-full ${ann.type === 'BANNER' ? 'object-contain p-2' : 'object-cover'}`} />
                 ) : (
                   <span className="text-4xl">📰</span>
                 )}
                 
                 {ann.type === 'PROMO' && (
                   <div className="absolute top-2 left-2 z-20">
                     <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow">🔥 KHUYẾN MÃI</span>
                   </div>
                 )}
                 {ann.type === 'NEWS' && (
                   <div className="absolute top-2 left-2 z-20">
                     <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow">📰 TIN TỨC</span>
                   </div>
                 )}
                 {ann.type === 'NOTIFICATION' && (
                   <div className="absolute top-2 left-2 z-20">
                     <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow">🔔 THÔNG BÁO</span>
                   </div>
                 )}
                 {ann.type === 'TERMS_DRIVER_USAGE' && (
                   <div className="absolute top-2 left-2 z-20">
                     <span className="bg-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow">📜 Đ.KHOẢN SD (TX)</span>
                   </div>
                 )}
                 {ann.type === 'TERMS_DRIVER_PRIVACY' && (
                   <div className="absolute top-2 left-2 z-20">
                     <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow">🔒 BẢO MẬT (TX)</span>
                   </div>
                 )}
                 {ann.type === 'TERMS_CUSTOMER_USAGE' && (
                   <div className="absolute top-2 left-2 z-20">
                     <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow">📜 Đ.KHOẢN SD (KH)</span>
                   </div>
                 )}
                 {ann.type === 'TERMS_CUSTOMER_PRIVACY' && (
                   <div className="absolute top-2 left-2 z-20">
                     <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow">🔒 BẢO MẬT (KH)</span>
                   </div>
                 )}
                 {(ann.type === 'TERMS_DRIVER' || ann.type === 'TERMS_CUSTOMER') && (
                   <div className="absolute top-2 left-2 z-20">
                     <span className="bg-gray-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow">⚠️ BẢN CŨ</span>
                   </div>
                 )}
                 {ann.type === 'SUPPORT_CONTACT' && (
                   <div className="absolute top-2 left-2 z-20">
                     <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow">🎧 HỖ TRỢ LIÊN HỆ</span>
                   </div>
                 )}
                 {ann.type === 'PAYMENT_QR' && (
                   <div className="absolute top-2 left-2 z-20">
                     <span className="bg-sky-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow">💳 MÃ QR THANH TOÁN</span>
                   </div>
                 )}
                 {ann.type === 'BANNER' && (
                   <div className="absolute top-2 left-2 z-20">
                     <span className="bg-pink-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow">🌟 QUẢNG CÁO</span>
                   </div>
                 )}
                 
                 <div className="absolute top-2 right-2 flex gap-2 z-20">
                   <button 
                     onClick={() => handleToggleActive(ann)}
                     className={`p-2 rounded-full shadow-lg text-sm ${ann.isActive ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'} text-white transition-transform hover:scale-110`}
                     title={ann.isActive ? 'Bấm để Ẩn' : 'Bấm để Hiện'}
                   >
                     {ann.isActive ? '👁️' : '🙈'}
                   </button>
                 </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                 <h3 className="font-bold text-slate-800 text-lg leading-snug line-clamp-2 mb-2">{ann.title}</h3>
                 <p className="text-slate-500 text-sm line-clamp-3 mb-4 flex-1 whitespace-pre-wrap">{ann.content}</p>
                 <div className="text-xs text-slate-400 mb-4">{new Date(ann.createdAt).toLocaleString('vi-VN')}</div>
                 
                 <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button 
                      onClick={() => openEditModal(ann)}
                      className="flex-1 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold py-2 rounded-xl transition-colors"
                    >
                      Sửa
                    </button>
                    <button 
                      onClick={() => handleDelete(ann._id, ann.title)}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 rounded-xl transition-colors"
                    >
                      Xóa Sạch
                    </button>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl relative my-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Sửa Bảng Tin' : 'Đăng Bảng Tin Mới'}</h2>
              <button disabled={isUploading} onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 text-2xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
               {/* Kiểu bài đăng */}
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Loại Bài Đăng</label>
                  <div className="flex gap-4 flex-wrap">
                     <label className={`flex-1 min-w-[120px] py-3 border rounded-xl text-center cursor-pointer font-bold transition-all ${form.type === 'PROMO' ? 'bg-red-50 border-red-500 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                        <input type="radio" name="type" value="PROMO" checked={form.type === 'PROMO'} onChange={(e) => setForm({...form, type: 'PROMO'})} className="hidden" />
                        🎁 Khuyến Mãi
                     </label>
                     <label className={`flex-1 min-w-[120px] py-3 border rounded-xl text-center cursor-pointer font-bold transition-all ${form.type === 'NEWS' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                        <input type="radio" name="type" value="NEWS" checked={form.type === 'NEWS'} onChange={(e) => setForm({...form, type: 'NEWS'})} className="hidden" />
                        📰 Tin Tức
                     </label>
                     <label className={`flex-1 min-w-[120px] py-3 border rounded-xl text-center cursor-pointer font-bold transition-all ${form.type === 'NOTIFICATION' ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                        <input type="radio" name="type" value="NOTIFICATION" checked={form.type === 'NOTIFICATION'} onChange={(e) => setForm({...form, type: 'NOTIFICATION'})} className="hidden" />
                        🔔 Thông Báo
                     </label>
                     <label className={`flex-1 min-w-[120px] py-3 border rounded-xl text-center cursor-pointer font-bold transition-all ${form.type === 'TERMS_DRIVER_USAGE' ? 'bg-purple-50 border-purple-500 text-purple-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                        <input type="radio" name="type" value="TERMS_DRIVER_USAGE" checked={form.type === 'TERMS_DRIVER_USAGE'} onChange={(e) => setForm({...form, type: 'TERMS_DRIVER_USAGE'})} className="hidden" />
                        📜 Đ.Khoản SD (TX)
                     </label>
                     <label className={`flex-1 min-w-[120px] py-3 border rounded-xl text-center cursor-pointer font-bold transition-all ${form.type === 'TERMS_DRIVER_PRIVACY' ? 'bg-purple-100 border-purple-600 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                        <input type="radio" name="type" value="TERMS_DRIVER_PRIVACY" checked={form.type === 'TERMS_DRIVER_PRIVACY'} onChange={(e) => setForm({...form, type: 'TERMS_DRIVER_PRIVACY'})} className="hidden" />
                        🔒 Bảo Mật (TX)
                     </label>
                     <label className={`flex-1 min-w-[120px] py-3 border rounded-xl text-center cursor-pointer font-bold transition-all ${form.type === 'TERMS_CUSTOMER_USAGE' ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                        <input type="radio" name="type" value="TERMS_CUSTOMER_USAGE" checked={form.type === 'TERMS_CUSTOMER_USAGE'} onChange={(e) => setForm({...form, type: 'TERMS_CUSTOMER_USAGE'})} className="hidden" />
                        📜 Đ.Khoản SD (KH)
                     </label>
                     <label className={`flex-1 min-w-[120px] py-3 border rounded-xl text-center cursor-pointer font-bold transition-all ${form.type === 'TERMS_CUSTOMER_PRIVACY' ? 'bg-indigo-100 border-indigo-600 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                        <input type="radio" name="type" value="TERMS_CUSTOMER_PRIVACY" checked={form.type === 'TERMS_CUSTOMER_PRIVACY'} onChange={(e) => setForm({...form, type: 'TERMS_CUSTOMER_PRIVACY'})} className="hidden" />
                        🔒 Bảo Mật (KH)
                     </label>
                     <label className={`flex-1 min-w-[120px] py-3 border rounded-xl text-center cursor-pointer font-bold transition-all ${form.type === 'BANNER' ? 'bg-pink-50 border-pink-500 text-pink-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                        <input type="radio" name="type" value="BANNER" checked={form.type === 'BANNER'} onChange={(e) => setForm({...form, type: 'BANNER', title: 'Quảng Cáo', content: 'Hình ảnh quảng cáo'})} className="hidden" />
                        🌟 Quảng Cáo
                     </label>
                     <label className={`flex-1 min-w-[120px] py-3 border rounded-xl text-center cursor-pointer font-bold transition-all ${form.type === 'SUPPORT_CONTACT' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                        <input type="radio" name="type" value="SUPPORT_CONTACT" checked={form.type === 'SUPPORT_CONTACT'} onChange={(e) => setForm({...form, type: 'SUPPORT_CONTACT', title: 'Trung Tâm Hỗ Trợ'})} className="hidden" />
                        🎧 Hỗ Trợ Liên Hệ
                     </label>
                     <label className={`flex-1 min-w-[120px] py-3 border rounded-xl text-center cursor-pointer font-bold transition-all ${form.type === 'PAYMENT_QR' ? 'bg-sky-50 border-sky-500 text-sky-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                        <input type="radio" name="type" value="PAYMENT_QR" checked={form.type === 'PAYMENT_QR'} onChange={(e) => setForm({...form, type: 'PAYMENT_QR', title: 'Mã QR Thanh Toán'})} className="hidden" />
                        💳 QR Công Nợ
                     </label>
                  </div>
               </div>

               {/* Tiêu đề & Nội dung */}
               {form.type === 'PAYMENT_QR' ? (
                 <>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Mã Ngân Hàng <span className="text-red-500">*</span></label>
                      <input 
                        required autoFocus
                        type="text" 
                        value={form.title} 
                        onChange={e => setForm({...form, title: e.target.value.toUpperCase()})} 
                        placeholder="Ví dụ: MB"
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-sky-500 font-bold uppercase" 
                      />
                      <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="font-bold text-slate-700">Mã phổ biến: </span> 
                        VietinBank (<b className="text-sky-600">ICB</b>), 
                        Vietcombank (<b className="text-sky-600">VCB</b>), 
                        BIDV (<b className="text-sky-600">BIDV</b>), 
                        Agribank (<b className="text-sky-600">VBA</b>), 
                        MBBank (<b className="text-sky-600">MB</b>), 
                        Techcombank (<b className="text-sky-600">TCB</b>), 
                        VPBank (<b className="text-sky-600">VPB</b>), 
                        ACB (<b className="text-sky-600">ACB</b>), 
                        Sacombank (<b className="text-sky-600">STB</b>), 
                        TPBank (<b className="text-sky-600">TPB</b>),
                        VIB (<b className="text-sky-600">VIB</b>).
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Số Tài Khoản <span className="text-red-500">*</span></label>
                      <input 
                        required
                        type="text" 
                        value={form.content} 
                        onChange={e => setForm({...form, content: e.target.value.replace(/\D/g, '')})} 
                        placeholder="Ví dụ: 0857986911"
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-sky-500 font-mono text-lg" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Tên Chủ Tài Khoản <span className="text-red-500">*</span></label>
                      <input 
                        required
                        type="text" 
                        value={form.videoUrl} 
                        onChange={e => setForm({...form, videoUrl: e.target.value.toUpperCase()})} 
                        placeholder="Ví dụ: NGUYEN LAM NGUYEN"
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-sky-500 font-bold uppercase" 
                      />
                    </div>
                 </>
               ) : form.type !== 'BANNER' ? (
                 <>
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Tiêu Đề (Title) <span className="text-red-500">*</span></label>
                      <input 
                        required autoFocus
                        type="text" 
                        value={form.title} 
                        onChange={e => setForm({...form, title: e.target.value})}
                        placeholder="Mừng đại lễ freeship 100%..." 
                        className="w-full border border-slate-300 rounded-xl p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-medium"
                      />
                   </div>
                   
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Nội Dung Chi Tiết <span className="text-red-500">*</span></label>
                      <textarea 
                        required rows="4"
                        value={form.content} 
                        onChange={e => setForm({...form, content: e.target.value})}
                        placeholder="Khách iu nhanh tay đặt hàng..." 
                        className="w-full border border-slate-300 rounded-xl p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                      ></textarea>
                   </div>
                 </>
               ) : null}

               {/* Chèn Media */}
               {form.type !== 'PAYMENT_QR' && (
                 <div className="border border-dashed border-blue-300 bg-blue-50 rounded-2xl p-6 text-center">
                    <input 
                      type="file" 
                      multiple={form.type === 'BANNER' && !isEditing}
                      accept={form.type === 'BANNER' ? "image/*" : "image/*,video/*"}
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden" 
                    />
                    
                    {multipleFiles.length > 0 ? (
                      <div className="flex flex-wrap gap-4 justify-center">
                        {multiplePreviewUrls.map((url, i) => (
                          <div key={i} className="relative inline-block w-24 h-24 rounded-xl overflow-hidden shadow-md">
                            <img src={url} className="w-full h-full object-cover" alt="Preview" />
                            <button 
                              type="button" 
                              onClick={() => {
                                const newFiles = [...multipleFiles];
                                newFiles.splice(i, 1);
                                setMultipleFiles(newFiles);
                                const newUrls = [...multiplePreviewUrls];
                                newUrls.splice(i, 1);
                                setMultiplePreviewUrls(newUrls);
                                if(newFiles.length === 0 && fileInputRef.current) fileInputRef.current.value = "";
                              }} 
                              className="absolute top-1 right-1 bg-red-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs hover:bg-red-700 shadow"
                            >✕</button>
                          </div>
                        ))}
                        
                        {/* Nút Thêm Ảnh Nữa */}
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-24 h-24 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-100 transition-colors shadow-sm"
                        >
                          <span className="text-2xl mb-1">➕</span>
                          <span className="text-[10px] font-bold text-blue-600">Thêm ảnh</span>
                        </div>
                      </div>
                    ) : mediaPreviewUrl ? (
                      <div className="relative inline-block max-w-full rounded-xl overflow-hidden shadow-md">
                        {mediaType === 'video' ? (
                          <video src={mediaFile ? mediaPreviewUrl : getFullImageUrl(mediaPreviewUrl)} className="max-h-64 mx-auto" controls />
                        ) : (
                          <img src={mediaFile ? mediaPreviewUrl : getFullImageUrl(mediaPreviewUrl)} className="max-h-64 mx-auto object-contain" alt="Preview" />
                        )}
                        
                        <button 
                          type="button" 
                          onClick={() => {
                            setMediaFile(null);
                            setMediaPreviewUrl(null);
                            if(fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="absolute top-2 right-2 bg-red-600 text-white w-8 h-8 flex flex-col justify-center items-center rounded-full shadow-lg hover:bg-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer space-y-2 py-4"
                      >
                        <div className="text-4xl">📸</div>
                        <h4 className="font-bold text-blue-600">
                          {form.type === 'BANNER' && !isEditing ? 'Bấm vào đây để chọn (có thể chọn nhiều ảnh cùng lúc)' : form.type === 'BANNER' ? 'Bấm vào đây để thay ảnh quảng cáo' : 'Bấm vào đây để đính kèm Ảnh / Video'}
                        </h4>
                        <p className="text-xs text-blue-400">
                          {form.type === 'BANNER' ? 'Chỉ hỗ trợ JPG, PNG.' : 'Hỗ trợ JPG, PNG, MP4. Tối đa 50MB.'}
                        </p>
                      </div>
                    )}
                 </div>
               )}

               {/* Nút Action */}
               <div className="border-t border-slate-100 pt-6 flex gap-3 flex-col sm:flex-row">
                  <button 
                    type="button" 
                    disabled={isUploading}
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Hủy Bỏ
                  </button>
                  <button 
                    type="submit" 
                    disabled={isUploading}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Đang đẩy File lên...</>
                    ) : isEditing ? '💾 Lưu Chỉnh Sửa' : '🚀 Đăng Bản Tin Ngay'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
