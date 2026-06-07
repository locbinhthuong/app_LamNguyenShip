import React from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

const ForceUpdateModal = ({ config }) => {
  const isAndroid = Capacitor.getPlatform() === 'android';
  
  const handleUpdate = async () => {
    try {
      const url = isAndroid ? config?.storeUrlAndroid : config?.storeUrlIos;
      if (url) {
        if (Capacitor.isNativePlatform()) {
          await Browser.open({ url });
        } else {
          window.open(url, '_blank');
        }
      } else {
        alert("Link cập nhật chưa được cài đặt, vui lòng liên hệ tổng đài!");
      }
    } catch (err) {
      console.error("Không thể mở link cập nhật:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
        
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-black text-slate-800 mb-3">Đã có bản cập nhật mới!</h2>
        
        <p className="text-slate-600 mb-8 leading-relaxed">
          Phiên bản ứng dụng của bạn đã quá cũ. Vui lòng cập nhật lên phiên bản mới nhất để tiếp tục nhận đơn hàng và trải nghiệm các tính năng mới nhất từ AloShipp.
        </p>
        
        <button
          onClick={handleUpdate}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 transform transition-all active:scale-95"
        >
          CẬP NHẬT NGAY
        </button>
      </div>
    </div>
  );
};

export default ForceUpdateModal;
