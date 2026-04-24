const text = `lấy ở hẻm 51 sđt 0909000111
giao tới trần hoàng na sđt 00011100010
tiền ship 19k`;

    const newForm = { note: '', codAmount: 0, deliveryFee: 0 };

    const pickupRegex = /^(?:(?:📍)?điểm lấy đơn|điểm lấy|từ|lấy đơn tại|lấy hàng|lấy tại|lấy ở|nhận tại|địa chỉ lấy|nơi lấy|chỗ lấy|chỗ này lấy đơn|lấy chỗ này|lấy chỗ|lấy)\s*:?\s*([^\n]+)/im;
    const pickupMatch = text.match(pickupRegex);
    let rawPickup = pickupMatch ? pickupMatch[1].trim() : '';

    const deliveryRegex = /^(?:(?:📍)?điểm giao|đến|giao|giao đơn tại|giao hàng|giao tại|giao ở|giao tới|giao đến|địa chỉ giao|nơi giao|chỗ giao|giao chỗ này|trực tiếp|gửi cho|ship qua|địa chỉ nhận|nơi nhận)\s*:?\s*([^\n]+)/im;
    const deliveryMatch = text.match(deliveryRegex);
    let rawDelivery = deliveryMatch ? deliveryMatch[1].trim() : '';

    // Phones
    let allPhones = Array.from(text.matchAll(/(?:sđt|sdt|đt|dt|phone)\s*:?\s*([0-9\.\s-]{8,12})/gi)).map(m => m[1].replace(/\D/g, ''));
    const loosePhones = (text.match(/\b0[0-9]{7,10}\b/g) || []);
    allPhones = [...new Set([...allPhones, ...loosePhones])].filter(p => p.length >= 8);

    let pPhone = '';
    let dPhone = '';

    if (allPhones.length === 1) {
       pPhone = allPhones[0]; 
    } else if (allPhones.length >= 2) {
       pPhone = allPhones[0]; 
       dPhone = allPhones[allPhones.length - 1]; 
    }

    const removePhoneFromAddress = (addr) => {
        return addr.replace(/(?:sđt|sdt|đt|dt|phone)\s*:?\s*[0-9\.\s-]+/i, '')
                   .replace(/\b0[0-9]{7,10}\b/g, '')
                   .replace(/[-,\s]+$/, '').trim();
    };

    if (rawPickup) newForm.pickupAddress = removePhoneFromAddress(rawPickup);
    if (pPhone) newForm.pickupPhone = pPhone;
    if (rawDelivery) newForm.deliveryAddress = removePhoneFromAddress(rawDelivery);
    if (dPhone) newForm.customerPhone = dPhone; 

    // cod
    const codMatch = text.match(/^(?:tiền\s*)?Thu\s*:?\s*([0-9\.,]+[kK]?)/im);
    if (codMatch) newForm.codAmount = codMatch[1];
    // ship
    const shipMatch = text.match(/^(?:tiền\s*)?Ship\s*:?\s*([0-9\.,]+[kK]?)/im);
    if (shipMatch) newForm.deliveryFee = shipMatch[1];

    const noteLines = text.split('\n').map(l => l.trim()).filter(l => {
       if (!l) return false;
       if (l.match(/^(?:(?:📍)?điểm lấy đơn|điểm lấy|từ|lấy đơn tại|lấy hàng|lấy tại|lấy ở|nhận tại|địa chỉ lấy|nơi lấy|chỗ lấy|chỗ này lấy đơn|lấy chỗ này|lấy chỗ|lấy)/i)) return false;
       if (l.match(/^(?:(?:📍)?điểm giao|đến|giao|giao đơn tại|giao hàng|giao tại|giao ở|giao tới|giao đến|địa chỉ giao|nơi giao|chỗ giao|giao chỗ này|trực tiếp|gửi cho|ship qua|địa chỉ nhận|nơi nhận)/i)) return false;
       if (l.match(/^(?:sđt|sdt|đt|dt|phone)/i)) return false;
       if (l.match(/^0[0-9]{7,10}$/)) return false; 
       if (l.match(/^(?:tiền\s*)?Thu\s*:?\s*([0-9\.,]+[kK]?)$/i)) return false; 
       if (l.match(/^(?:tiền\s*)?Ship\s*:?\s*([0-9\.,]+[kK]?)$/i)) return false; 
       return true;
    });
    newForm.note = noteLines.join(' | ');

    console.log(newForm);
