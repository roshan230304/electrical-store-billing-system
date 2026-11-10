require('dotenv').config();
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/controllers/purchaseController.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add cashService import if not present
if (!content.includes('cashService')) {
  content = content.replace(
    "const pool = require('../config/db');",
    "const pool = require('../config/db');\nconst { recordCashMovement } = require('../services/cashService');"
  );
  console.log('✓ Added cashService import to purchaseController');
}

// 2. Find the INSERT INTO payments for purchases and add cash ledger recording after it
// The block ends with:  );    }    await connection.commit();
// We specifically look for the createPurchase payment section
const marker = "INSERT INTO payments (purchase_id, payment_method, amount, reference_number) VALUES (?, ?, ?, ?)";
const idx = content.indexOf(marker);
if (idx === -1) {
  console.error('✗ Could not find purchase payment INSERT in createPurchase');
  process.exit(1);
}

// Find the closing of this if block to inject after the query
// Pattern after the query close: ");  \r\n    }\r\n\r\n    await connection.commit();"
const afterQuery = content.indexOf("      );\r\n    }\r\n\r\n    await connection.commit();\r\n    transactionStarted = false;\r\n    return res.status(201)", idx);
if (afterQuery === -1) {
  console.error('✗ Could not find block end after createPurchase payment INSERT');
  process.exit(1);
}

const insertion = `      );
      // Record cash outflow in ledger — only for Cash payments
      if (method === 'Cash') {
        await recordCashMovement(connection, {
          entry_type: 'Purchase',
          reference_id: purchaseNumber,
          party_name: supplierName,
          date: new Date(),
          inflow: 0,
          outflow: paidAmount,
          description: 'Cash paid for Purchase Bill #' + purchaseNumber,
          created_by: req.user && req.user.username ? req.user.username : 'Admin'
        });
      }
    }

    await connection.commit();
    transactionStarted = false;
    return res.status(201)`;

// Replace the target section
const targetOld = content.slice(afterQuery, afterQuery + 110);
console.log('Target to replace:', JSON.stringify(targetOld));

content = content.slice(0, afterQuery) + insertion + content.slice(afterQuery + 110);
fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ purchaseController: cash ledger recording wired into createPurchase');

// 3. Also wire into updatePurchase — when additional cash payment is made
// updatePurchase inserts additional payment when additionalPayment > 0
const updateMarker = "'INSERT INTO payments (purchase_id, payment_method, amount, reference_number) VALUES (?, ?, ?, ?)'";
const updateIdxAll = [];
let searchFrom = 0;
while (true) {
  const found = content.indexOf(updateMarker, searchFrom);
  if (found === -1) break;
  updateIdxAll.push(found);
  searchFrom = found + 1;
}
console.log(`Found ${updateIdxAll.length} purchase payment INSERT(s)`);
// The second one is in updatePurchase
if (updateIdxAll.length >= 2) {
  const updateIdx = updateIdxAll[1];
  // After this query close "); } 
  const afterUpdateQuery = content.indexOf("      );\r\n      }\r\n    }\r\n\r\n    const balanceDue", updateIdx);
  if (afterUpdateQuery !== -1) {
    const updateInsertion = `      );
        // Record cash outflow in ledger for additional cash payment in updatePurchase
        if (method === 'Cash') {
          await recordCashMovement(connection, {
            entry_type: 'Purchase',
            reference_id: currentPurchase.purchase_number,
            party_name: supplierName,
            date: new Date(),
            inflow: 0,
            outflow: additionalPayment,
            description: 'Additional cash paid for Purchase Bill #' + currentPurchase.purchase_number,
            created_by: req.user && req.user.username ? req.user.username : 'Admin'
          });
        }
      }
    }

    const balanceDue`;

    content = content.slice(0, afterUpdateQuery) + updateInsertion + content.slice(afterUpdateQuery + 50);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✓ purchaseController: cash ledger wired into updatePurchase');
  } else {
    console.log('  Could not find updatePurchase payment close — skipping');
  }
}

console.log('\nDone!');

