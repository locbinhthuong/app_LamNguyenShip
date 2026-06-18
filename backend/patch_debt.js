const fs = require('fs');
const path = 'c:/app_LamNguyenShip/backend/controllers/orderController.js';
let content = fs.readFileSync(path, 'utf8');

const helper = `
const refundOrderDebtIfAny = async (orderId) => {
  try {
    const debtTxList = await DebtTransaction.find({ orderId: orderId, type: 'FEE_DEDUCTION' });
    for (const debtTx of debtTxList) {
      if (debtTx.driverId) {
        await Driver.findByIdAndUpdate(debtTx.driverId, { $inc: { walletDebt: -debtTx.amount } });
        await DebtTransaction.findByIdAndDelete(debtTx._id);
        console.log(\`[REFUND DEBT] Hoan lai \${debtTx.amount}d cho tai xe \${debtTx.driverId} do don hang bi huy/xoa.\`);
      }
    }
  } catch (err) {
    console.error('Error refunding order debt:', err);
  }
};
`;

if (!content.includes('refundOrderDebtIfAny')) {
  content = content.replace('const orderController = {', helper + '\nconst orderController = {');
}

// Update cancelOrder (Admin)
content = content.replace(
  `cancelReason: reason || 'Hủy bởi admin'
        },
        { new: true }
      );`,
  `cancelReason: reason || 'Hủy bởi admin'
        },
        { new: true }
      );
      if (order) await refundOrderDebtIfAny(order._id);`
);

content = content.replace(
  `cancelReason: reason || 'H\u00f7y b\u00fai admin'
        },
        { new: true }
      );`,
  `cancelReason: reason || 'H\u00f7y b\u00fai admin'
        },
        { new: true }
      );
      if (order) await refundOrderDebtIfAny(order._id);`
);

// Note: due to unicode issues "Hủy bởi admin", I will use regex
content = content.replace(
  /cancelReason: reason \|\| ['"].*?['"]\s*},\s*{ new: true }\s*\);/g,
  (match) => match + '\n      if (order) await refundOrderDebtIfAny(order._id);'
);


// Update deleteOrder
content = content.replace(
  `const order = await Order.findByIdAndDelete(id);`,
  `const order = await Order.findByIdAndDelete(id);
      if (order) await refundOrderDebtIfAny(order._id);`
);

// Update bulkDeleteOrders
content = content.replace(
  `const result = await Order.deleteMany({
        _id: { $in: orderIds }
      });`,
  `for (const oid of orderIds) {
        await refundOrderDebtIfAny(oid);
      }
      const result = await Order.deleteMany({
        _id: { $in: orderIds }
      });`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched orderController.js');
