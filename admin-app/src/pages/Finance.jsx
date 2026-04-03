import { useState, useEffect } from 'react';
import api from '../services/api';
import DriverDebtModal from '../components/DriverDebtModal';
import DriverWalletModal from '../components/DriverWalletModal';

export default function Finance() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    pendingDebts: [],
    pendingWallets: [],
    recentDebts: [],
    recentWallets: []
  });
  const [activeTab, setActiveTab] = useState('debts'); // 'debts' | 'wallets'
  const [drivers, setDrivers] = useState([]);
  const [debtModal, setDebtModal] = useState({ isOpen: false, driverId: null });
  const [walletModal, setWalletModal] = useState({ isOpen: false, driverId: null });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/finance/all-requests');
      const drvRes = await api.get('/api/drivers');
      if (res.data.success) {
        setData(res.data.data);
      }
      if (drvRes.data.success) {
        setDrivers(drvRes.data.data);
      }
    } catch (e) {
      console.error(e);
      alert('Không thể tải dữ liệu tài chính');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveDebt = async (txId) => {
    if (!window.confirm('Xác nhận đã nhận được tiền của Tài xế?')) return;
    try {
      await api.post(`/api/finance/debts/${txId}/approve`);
      alert('Đã duyệt thành công!');
      fetchData();
    } catch (e) {
      alert('Lỗi duyệt lệnh');
    }
  };

  const handleRejectDebt = async (txId) => {
    const reason = window.prompt('Nhập lý do từ chối (VD: Không nhận được tiền):');
    if (reason === null) return;
    try {
      await api.post(`/api/finance/debts/${txId}/reject`, { reason });
      alert('Đã từ chối lệnh');
      fetchData();
    } catch (e) {
      alert('Lỗi từ chối lệnh');
    }
  };

  const handleApproveWallet = async (txId) => {
    if (!window.confirm('Xác nhận ĐẢ CHUYỂN KHOẢN đủ tiền cho Tài xế?')) return;
    try {
      await api.post(`/api/finance/wallets/${txId}/approve`);
      alert('Đã duyệt thành công!');
      fetchData();
    } catch (e) {
      alert('Lỗi duyệt lệnh');
    }
  };

  const handleRejectWallet = async (txId) => {
    const reason = window.prompt('Nhập lý do từ chối (VD: Sai số tài khoản):');
    if (reason === null) return;
    try {
      await api.post(`/api/finance/wallets/${txId}/reject`, { reason });
      alert('Đã từ chối lệnh');
      fetchData();
    } catch (e) {
      alert('Lỗi từ chối lệnh');
    }
  };

  const handleDeleteWalletTx = async (txId) => {
    if (!window.confirm('Xóa giao dịch này có thể làm lệch tổng tiền ví / bị sai đối soát.\nBạn có chắc chắn muốn xóa?')) return;
    try {
      await api.delete(`/api/wallets/admin/tx/${txId}`);
      alert('Xóa thành công!');
      fetchData();
    } catch (e) {
      alert('Lỗi khi xoá lịch sử ví.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Trung Tâm Tài Chính</h1>
          <p className="text-slate-500 mt-1 font-medium">Duyệt các Yêu cầu nạp/rút tiền của Tài xế</p>
        </div>
        <button onClick={fetchData} className="px-5 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 font-semibold shadow-sm transition-all focus:ring-2 focus:ring-blue-500 outline-none flex items-center gap-2">
          🔄 Làm mới (Refresh)
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
        {/* TAB HEADER */}
        <div className="flex border-b border-slate-200">
           <button 
             onClick={() => setActiveTab('debts')} 
             className={`flex-1 py-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'debts' ? 'border-red-500 text-red-600 bg-red-50/30' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
           >
             SỔ ĐEN: Yêu Cầu Thu Nợ
             {data.pendingDebts.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-red-100 text-red-600 rounded-full text-xs">{data.pendingDebts.length}</span>
             )}
           </button>
           <button 
             onClick={() => setActiveTab('wallets')} 
             className={`flex-1 py-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'wallets' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/30' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
           >
             VÍ BÓP: Yêu Cầu Rút Thưởng
             {data.pendingWallets.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full text-xs">{data.pendingWallets.length}</span>
             )}
           </button>
        </div>

        {/* TAB CÔNG NỢ */}
        {activeTab === 'debts' && (
          <div className="p-6">
             <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-red-400 rounded-full"></span> Lệnh Chờ Kiểm Duyệt Nhận Tiền
             </h2>

             {loading ? (
                <div className="animate-pulse flex flex-col gap-3"><div className="h-20 bg-slate-100 rounded-xl"></div></div>
             ) : data.pendingDebts.length === 0 ? (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center text-slate-500 font-medium italic">Không có lệnh thanh toán nợ mới nào.</div>
             ) : (
                <div className="space-y-4">
                  {data.pendingDebts.map(tx => (
                    <div key={tx._id} className="bg-white border-2 border-amber-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-center gap-4 justify-between relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                       <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                             <div className="font-bold text-slate-800 text-lg">{tx.driverId?.name}</div>
                             <div className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-bold uppercase">{tx.driverId?.driverCode}</div>
                             <div className="text-sm text-slate-500">{tx.driverId?.phone}</div>
                          </div>
                          <div><span className="text-xs text-slate-400 font-semibold uppercase">Mô tả:</span> <span className="text-sm text-slate-700">{tx.description}</span></div>
                          <div className="text-xs text-slate-400 mt-1">Lập lúc: {new Date(tx.createdAt).toLocaleString('vi-VN')}</div>
                       </div>
                       
                       <div className="text-right">
                          <div className="text-2xl font-black text-rose-600 tabular-nums my-2 border border-rose-100 bg-rose-50 px-4 py-1.5 rounded-lg inline-block">
                             {Math.abs(tx.amount).toLocaleString()} đ
                          </div>
                       </div>
                       
                       <div className="flex md:flex-col gap-2 w-full md:w-auto">
                          <button onClick={() => handleApproveDebt(tx._id)} className="flex-1 whitespace-nowrap px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors">
                             Đã Nhận Tiền - Duyệt
                          </button>
                          <button onClick={() => handleRejectDebt(tx._id)} className="flex-1 whitespace-nowrap px-4 py-2 bg-slate-100 hover:bg-red-100 hover:text-red-600 text-slate-600 font-bold rounded-lg transition-colors">
                             Từ chối / Hủy
                          </button>
                       </div>
                    </div>
                  ))}
                </div>
             )}

             <h2 className="text-lg font-bold text-slate-800 mt-12 mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-slate-300 rounded-full"></span> Lịch sử Giao dịch Nợ gần nhất
             </h2>
             <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold w-40">Tài xế</th>
                      <th className="px-4 py-3 font-semibold w-40">Trạng thái</th>
                      <th className="px-4 py-3 font-semibold text-right w-32">Số tiền</th>
                      <th className="px-4 py-3 font-semibold min-w-48">Mô tả</th>
                      <th className="px-4 py-3 font-semibold w-40">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentDebts.map(tx => (
                      <tr key={tx._id} className="hover:bg-slate-50">
                         <td className="px-4 py-3 font-medium text-slate-700">{tx.driverId?.name}</td>
                         <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${tx.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                               {tx.status}
                            </span>
                         </td>
                         <td className={`px-4 py-3 text-right font-black ${tx.amount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} đ
                         </td>
                         <td className="px-4 py-3 text-slate-600 overflow-hidden text-ellipsis max-w-xs" title={tx.description}>{tx.description}</td>
                         <td className="px-4 py-3 text-slate-400 text-xs">{new Date(tx.createdAt).toLocaleString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
             <h2 className="text-lg font-bold text-slate-800 mt-12 mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-400 rounded-full"></span> Danh Sách Quản Lý Công Nợ / Ví Tài Xế
             </h2>
             <div className="border border-slate-200 rounded-xl overflow-x-auto mb-8">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold min-w-[200px]">Tài xế</th>
                      <th className="px-4 py-3 font-semibold text-right border-l border-slate-200">Nợ Còn Thiếu</th>
                      <th className="px-4 py-3 font-semibold border-r border-slate-200 text-center">Quản Lý Sổ Đen</th>
                      <th className="px-4 py-3 font-semibold text-right">Số dư Ví</th>
                      <th className="px-4 py-3 font-semibold text-center">Quản Lý Ví</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drivers.map(drv => (
                      <tr key={drv._id} className="hover:bg-slate-50">
                         <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{drv.name}</div>
                            <div className="text-xs text-slate-500">{drv.phone}</div>
                         </td>
                         
                         <td className="px-4 py-3 text-right border-l border-slate-100">
                            <span className={`font-black ${drv.walletDebt > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                {drv.walletDebt > 0 ? drv.walletDebt.toLocaleString() + ' đ' : 'Thanh toán đủ'}
                            </span>
                         </td>
                         <td className="px-4 py-3 border-r border-slate-100 text-center">
                            <button
                              onClick={() => setDebtModal({ isOpen: true, driverId: drv._id })}
                              className="rounded-lg bg-orange-50 px-4 py-2 text-xs font-bold text-orange-600 hover:bg-orange-100 transition-colors shadow-sm"
                            >
                              📓 Nợ (Sổ Đen)
                            </button>
                         </td>
                         
                         <td className="px-4 py-3 text-right">
                            <span className={`font-black ${drv.walletBalance > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                {drv.walletBalance > 0 ? drv.walletBalance.toLocaleString() + ' đ' : '0 đ'}
                            </span>
                         </td>
                         <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setWalletModal({ isOpen: true, driverId: drv._id })}
                              className="rounded-lg bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-100 transition-colors shadow-sm"
                            >
                              🏦 Ví
                            </button>
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {/* TAB VÍ BÓP */}
        {activeTab === 'wallets' && (
          <div className="p-6">
             <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-emerald-400 rounded-full"></span> Lệnh Chờ Giải Ngân
             </h2>

             {loading ? (
                <div className="animate-pulse flex flex-col gap-3"><div className="h-20 bg-slate-100 rounded-xl"></div></div>
             ) : data.pendingWallets.length === 0 ? (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center text-slate-500 font-medium italic">Không có lệnh xin rút thưởng nào.</div>
             ) : (
                <div className="space-y-4">
                  {data.pendingWallets.map(tx => (
                    <div key={tx._id} className="bg-white border-2 border-emerald-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-center gap-4 justify-between relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400"></div>
                       <div className="flex-1 w-full">
                          <div className="flex items-center gap-3 mb-2">
                             <div className="font-bold text-slate-800 text-lg">{tx.driverId?.name}</div>
                             <div className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-bold uppercase">{tx.driverId?.driverCode}</div>
                             <div className="text-sm text-slate-500">{tx.driverId?.phone}</div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                             <div><span className="text-xs text-slate-400 font-semibold block uppercase">Ngân hàng</span> <span className="font-bold text-slate-700">{tx.bankInfo?.bankName}</span></div>
                             <div><span className="text-xs text-slate-400 font-semibold block uppercase">Chủ tài khoản</span> <span className="font-bold text-slate-700">{tx.bankInfo?.accountName}</span></div>
                             <div className="sm:col-span-2 flex items-center justify-between">
                               <div><span className="text-xs text-slate-400 font-semibold block uppercase">Số tài khoản</span> <span className="font-bold text-blue-600 text-lg tracking-wider">{tx.bankInfo?.accountNumber}</span></div>
                               <button onClick={() => {navigator.clipboard.writeText(tx.bankInfo?.accountNumber); alert('Đã copy số tài khoản')}} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded shadow-sm hover:bg-slate-50 active:scale-95">Copy STK</button>
                             </div>
                          </div>
                          
                          <div className="text-xs text-slate-400 mt-3 flex justify-between">
                             <span>Mô tả: {tx.description}</span>
                             <span>Lập lúc: {new Date(tx.createdAt).toLocaleString('vi-VN')}</span>
                          </div>
                       </div>
                       
                       <div className="text-right flex flex-col items-end md:ml-4">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">CẦN CHUYỂN KHOẢN</p>
                          <div className="text-3xl font-black text-emerald-600 tabular-nums border-2 border-emerald-100 bg-emerald-50 px-5 py-2 rounded-xl inline-block shadow-sm">
                             {Math.abs(tx.amount).toLocaleString()} đ
                          </div>
                       </div>
                       
                       <div className="flex md:flex-col gap-2 w-full md:w-auto md:min-w-[160px] md:ml-4">
                          <button onClick={() => handleApproveWallet(tx._id)} className="flex-1 whitespace-nowrap px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-200 transition-transform active:scale-95 flex items-center justify-center gap-2">
                             Đã CK - Duyệt Lệnh
                          </button>
                          <button onClick={() => handleRejectWallet(tx._id)} className="flex-1 whitespace-nowrap px-4 py-3 bg-slate-100 hover:bg-red-100 hover:text-red-600 text-slate-600 font-bold rounded-xl transition-colors">
                             Từ chối
                          </button>
                       </div>
                    </div>
                  ))}
                </div>
             )}

             <h2 className="text-lg font-bold text-slate-800 mt-12 mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-slate-300 rounded-full"></span> Lịch sử Xử lý Rút Ví gần nhất
             </h2>
             <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold w-40">Tài xế</th>
                      <th className="px-4 py-3 font-semibold w-40">Trạng thái</th>
                      <th className="px-4 py-3 font-semibold text-right w-32">Số tiền</th>
                      <th className="px-4 py-3 font-semibold min-w-48">Mô tả</th>
                      <th className="px-4 py-3 font-semibold w-40">Thời gian</th>
                      <th className="px-4 py-3 font-semibold w-24 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentWallets.map(tx => (
                      <tr key={tx._id} className="hover:bg-slate-50">
                         <td className="px-4 py-3 font-medium text-slate-700">{tx.driverId?.name}</td>
                         <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${tx.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                               {tx.status}
                            </span>
                         </td>
                         <td className={`px-4 py-3 text-right font-black ${tx.amount > 0 ? 'text-green-500' : 'text-slate-600'}`}>
                            {Math.abs(tx.amount).toLocaleString()} đ
                         </td>
                         <td className="px-4 py-3 text-slate-600 overflow-hidden text-ellipsis max-w-xs" title={tx.description}>{tx.description}</td>
                         <td className="px-4 py-3 text-slate-400 text-xs">{new Date(tx.createdAt).toLocaleString('vi-VN')}</td>
                         <td className="px-4 py-3 text-center">
                            <button onClick={() => handleDeleteWalletTx(tx._id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors text-xs font-bold" title="Xóa lệnh này">
                               XÓA
                            </button>
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}
      </div>
      <DriverDebtModal 
        isOpen={debtModal.isOpen} 
        driverId={debtModal.driverId} 
        onClose={() => setDebtModal({ isOpen: false, driverId: null })} 
      />
      <DriverWalletModal 
        isOpen={walletModal.isOpen} 
        driverId={walletModal.driverId} 
        onClose={() => setWalletModal({ isOpen: false, driverId: null })} 
      />
    </div>
  );
}
