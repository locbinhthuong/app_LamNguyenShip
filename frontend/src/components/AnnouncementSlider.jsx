import React from 'react';
import { Gift, Newspaper } from 'lucide-react';

const AnnouncementSlider = ({ title, items, type, onSelect }) => {
  if (!items || items.length === 0) return null;

  const isPromo = type === 'PROMO';
  const borderColor = isPromo ? 'border-red-100' : 'border-blue-100';
  const gradientClass = isPromo ? 'from-red-500 to-orange-500' : 'from-blue-500 to-indigo-500';
  const Icon = isPromo ? Gift : Newspaper;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
        <span className="text-blue-600 text-sm font-medium cursor-pointer">Xem tất cả</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar -mx-4 px-4">
        {items.map((ann) => (
          <div 
            key={ann._id} 
            onClick={() => onSelect(ann)}
            className={`w-48 md:w-64 bg-white rounded-2xl border ${borderColor} flex-shrink-0 overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-all active:scale-95`}
          >
            {ann.imageUrl ? (
              <img src={`https://api.aloshipp.com${ann.imageUrl}`} className="w-full h-40 object-cover bg-gray-100" alt={title} />
            ) : ann.videoUrl ? (
              <video src={`https://api.aloshipp.com${ann.videoUrl}`} className="w-full h-40 object-cover bg-black" autoPlay muted loop playsInline />
            ) : (
              <div className={`w-full h-40 bg-gradient-to-br ${gradientClass} p-4 flex flex-col justify-center text-white relative overflow-hidden`}>
                <Icon size={32} className="opacity-30 absolute right-2 bottom-2" />
                <h4 className="font-black text-base line-clamp-2 relative z-10">{ann.title}</h4>
              </div>
            )}
            <div className="p-3">
              <p className="font-bold text-[13px] text-gray-800 line-clamp-2 leading-tight">{ann.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnnouncementSlider;
