require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require('./models/User');
const MenuItem = require('./models/MenuItem');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Hàm giải mã base64 và lưu file
function saveBase64Image(base64String, prefix) {
  if (!base64String || !base64String.startsWith('data:image/')) return null;

  try {
    const matches = base64String.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }

    let extension = matches[1];
    if (extension === 'jpeg') extension = 'jpg';
    
    const data = Buffer.from(matches[2], 'base64');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `${prefix}-${uniqueSuffix}.${extension}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, data);
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('Error saving image:', error);
    return null;
  }
}

async function migrate() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('MONGO_URI is missing in .env');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    let userUpdatedCount = 0;
    let menuUpdatedCount = 0;

    // Migrate Users
    console.log('Migrating Users...');
    const users = await User.find({});
    for (const user of users) {
      let updated = false;

      if (user.avatar && user.avatar.startsWith('data:image/')) {
        const fileUrl = saveBase64Image(user.avatar, 'avatar');
        if (fileUrl) {
          user.avatar = fileUrl;
          updated = true;
        }
      }

      if (user.coverImage && user.coverImage.startsWith('data:image/')) {
        const fileUrl = saveBase64Image(user.coverImage, 'cover');
        if (fileUrl) {
          user.coverImage = fileUrl;
          updated = true;
        }
      }

      if (updated) {
        await user.save();
        userUpdatedCount++;
      }
    }
    console.log(`Migrated ${userUpdatedCount} users.`);

    // Migrate MenuItems
    console.log('Migrating MenuItems...');
    const menuItems = await MenuItem.find({});
    for (const item of menuItems) {
      let updated = false;

      if (item.image && item.image.startsWith('data:image/')) {
        const fileUrl = saveBase64Image(item.image, 'menu');
        if (fileUrl) {
          item.image = fileUrl;
          updated = true;
        }
      }

      if (item.images && Array.isArray(item.images)) {
        const newImages = [];
        for (const img of item.images) {
          if (img && img.startsWith('data:image/')) {
            const fileUrl = saveBase64Image(img, 'menu-arr');
            if (fileUrl) {
              newImages.push(fileUrl);
              updated = true;
            } else {
              newImages.push(img);
            }
          } else {
            newImages.push(img);
          }
        }
        item.images = newImages;
      }

      if (updated) {
        await item.save();
        menuUpdatedCount++;
      }
    }
    console.log(`Migrated ${menuUpdatedCount} menu items.`);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
