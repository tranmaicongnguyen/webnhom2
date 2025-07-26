import dotenv from 'dotenv';
import colors from 'colors';
import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import { connectDB } from '../config/db.config';

// Cấu hình môi trường
dotenv.config();
colors.enable();

// Helper để hash mật khẩu
const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
};

// Hàm nhập dữ liệu
const importData = async () => {
  try {
    // Kết nối database
    await connectDB();

    // Xóa dữ liệu cũ trước khi import
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
      console.log(`Đã xóa dữ liệu từ collection: ${collection.collectionName}`.yellow);
    }

    // Tạo collection users
    const usersCollection = mongoose.connection.collection('users');
    
    // Hash mật khẩu cho người dùng
    const hashedPassword = await hashPassword('123456');
    
    // Tạo người dùng admin và thường
    const users = [
      {
        name: 'Admin User',
        email: 'admin@webfashion.com',
        password: hashedPassword, // Mật khẩu: 123456
        role: 'admin',
        isAdmin: true,
        address: '123 Admin Street',
        phone: '0123456789',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: hashedPassword, // Mật khẩu: 123456
        role: 'user',
        isAdmin: false,
        address: '456 User Street',
        phone: '0987654321',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: hashedPassword, // Mật khẩu: 123456
        role: 'user',
        isAdmin: false,
        address: '789 User Avenue',
        phone: '0567891234',
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ];
    
    // Thêm users vào database
    const insertedUsers = await usersCollection.insertMany(users);
    console.log(`${insertedUsers.insertedCount} người dùng được tạo`.green);
    
    // Lấy ID của admin
    const adminUser = Object.values(insertedUsers.insertedIds)[0];
    
    // Tạo collection products
    const productsCollection = mongoose.connection.collection('products');
    
    // Dữ liệu sản phẩm
    const products = [
      {
        name: 'Áo Phông Cotton Cơ Bản',
        description:
          'Áo phông cotton mềm mại, thoáng khí với thiết kế cơ bản phù hợp cho mọi hoạt động hàng ngày.',
        price: 250000,
        image: 'https://assets.adidas.com/images/h_840,f_auto,q_auto:sensitive,fl_lossy/f5bf7da4f7b7439f88b9abfb00fbe9c1_9366/Adicolor_Classics_3-Stripes_Tee_Black_GN3458_01_laydown.jpg',
        brand: 'Adidas',
        category: 'T-shirt',
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        colors: ['Black', 'White', 'Grey'],
        countInStock: 50,
        rating: 4.5,
        numReviews: 12,
        isFeatured: true,
        material: 'Cotton 100%',
        washingInstructions: 'Giặt máy ở nhiệt độ thường, không tẩy, phơi trong bóng râm',
        style: 'Casual',
        gender: 'unisex',
        season: ['Spring', 'Summer', 'Fall'],
        fit: 'regular',
        user: adminUser,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Quần Jeans Slim Fit',
        description:
          'Quần jeans co giãn với kiểu dáng slim fit tôn dáng, màu xanh đậm thời trang và bền màu.',
        price: 650000,
        image: 'https://lp2.hm.com/hmgoepprod?set=quality%5B79%5D%2Csource%5B%2F22%2F96%2F22966e3eac733d673fd9bb9c7a8eb6be91b8c4b8.jpg%5D%2Corigin%5Bdam%5D%2Ccategory%5Bmen_jeans_slim%5D%2Ctype%5BDESCRIPTIVESTILLLIFE%5D%2Cres%5Bm%5D%2Chmver%5B2%5D&call=url[file:/product/main]',
        brand: 'H&M',
        category: 'Jeans',
        sizes: ['30', '32', '34', '36', '38'],
        colors: ['Blue', 'Black'],
        countInStock: 30,
        rating: 4.8,
        numReviews: 8,
        isFeatured: true,
        material: '98% Cotton, 2% Elastane',
        washingInstructions: 'Giặt máy ở nhiệt độ thấp, không tẩy, không sấy',
        style: 'Casual',
        gender: 'men',
        season: ['All Season'],
        fit: 'slim',
        user: adminUser,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Váy Liền Chữ A',
        description:
          'Váy liền dáng chữ A với họa tiết hoa nhẹ nhàng, thích hợp cho mùa hè và các buổi dạo chơi.',
        price: 480000,
        image: 'https://assets.myntassets.com/h_1440,q_90,w_1080/v1/assets/images/11697064/2020/3/5/d0080875-3a36-4a39-8226-76e3c42c57401583403309465-Athena-Women-Dresses-7641583403306654-1.jpg',
        brand: 'Zara',
        category: 'Dress',
        sizes: ['S', 'M', 'L'],
        colors: ['Floral', 'Blue', 'Pink'],
        countInStock: 20,
        rating: 4.3,
        numReviews: 10,
        isFeatured: true,
        material: 'Polyester',
        washingInstructions: 'Giặt tay, không tẩy, ủi ở nhiệt độ thấp',
        style: 'Casual',
        gender: 'women',
        season: ['Spring', 'Summer'],
        fit: 'regular',
        user: adminUser,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Áo Khoác Denim Oversized',
        description:
          'Áo khoác denim phong cách oversized, dễ phối đồ và tạo phong cách cá tính cho người mặc.',
        price: 850000,
        image: 'https://img.ltwebstatic.com/images3_pi/2021/11/08/163636696605f2a9f1fe27c18a86e2aa542bc66e0c_thumbnail_900x.webp',
        brand: 'Levi\'s',
        category: 'Jacket',
        sizes: ['M', 'L', 'XL'],
        colors: ['Blue', 'Black'],
        countInStock: 12,
        rating: 4.1,
        numReviews: 6,
        isFeatured: false,
        isDiscounted: true,
        discountPercent: 15,
        material: '100% Cotton Denim',
        washingInstructions: 'Giặt máy ở nhiệt độ thấp, không tẩy, không sấy khô',
        style: 'Street',
        gender: 'unisex',
        season: ['Spring', 'Fall'],
        fit: 'oversized',
        user: adminUser,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Quần Short Thể Thao',
        description:
          'Quần short thể thao với chất liệu thoáng khí, có túi hai bên tiện dụng, thích hợp cho các hoạt động thể thao.',
        price: 320000,
        image: 'https://assets.adidas.com/images/h_840,f_auto,q_auto:sensitive,fl_lossy/3e252c40bab842a4b2d6ab0b00f51f52_9366/Essentials_3-Stripes_Shorts_Black_DQ3073_01_laydown.jpg',
        brand: 'Nike',
        category: 'Shorts',
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['Black', 'Grey', 'Blue'],
        countInStock: 25,
        rating: 4.6,
        numReviews: 15,
        isFeatured: false,
        material: '90% Polyester, 10% Elastane',
        washingInstructions: 'Giặt máy với nước lạnh, không tẩy, phơi tự nhiên',
        style: 'Sportswear',
        gender: 'men',
        season: ['Summer'],
        fit: 'regular',
        user: adminUser,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Thêm sản phẩm vào database
    const insertedProducts = await productsCollection.insertMany(products);
    console.log(`${insertedProducts.insertedCount} sản phẩm được tạo`.green);
    
    // Tạo collection inventories
    const inventoriesCollection = mongoose.connection.collection('inventories');
    
    // Tạo dữ liệu inventory
    const inventoryItems = [];
    const productIds = Object.values(insertedProducts.insertedIds);
    const insertedProductArray = await productsCollection.find({}).toArray();
    
    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i];
      const product = insertedProductArray[i];
      
      for (const size of product.sizes) {
        for (const color of product.colors) {
          const sku = `${product.brand.substring(0, 3).toUpperCase()}-${productId.toString().substring(0, 5)}-${size}-${color.substring(0, 3).toUpperCase()}`;
          const quantity = Math.floor(Math.random() * 10) + 5; // Random 5-15
          
          inventoryItems.push({
            product: productId,
            size,
            color,
            quantity,
            reservedQuantity: 0,
            threshold: 5,
            sku,
            location: `Kho A - Hàng ${Math.floor(Math.random() * 10) + 1}`,
            rack: `R${Math.floor(Math.random() * 10) + 1}`,
            section: product.gender === 'men' ? 'Nam' : 
                    product.gender === 'women' ? 'Nữ' : 
                    product.gender === 'kids' ? 'Trẻ em' : 'Unisex',
            lastUpdated: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }
    
    // Thêm inventory vào database
    const insertedInventory = await inventoriesCollection.insertMany(inventoryItems);
    console.log(`${insertedInventory.insertedCount} mục tồn kho được tạo`.green);
    
    console.log('Dữ liệu đã được nhập thành công!'.green.inverse);
    process.exit();
  } catch (error: any) {
    console.error(`Lỗi: ${error.message}`.red.inverse);
    process.exit(1);
  }
};

// Hàm xóa tất cả dữ liệu
const destroyData = async () => {
  try {
    // Kết nối database
    await connectDB();

    // Xóa dữ liệu từ tất cả collections
    const collections = await mongoose.connection.db.collections();
    
    for (const collection of collections) {
      await collection.deleteMany({});
      console.log(`Đã xóa dữ liệu từ collection: ${collection.collectionName}`.yellow);
    }

    console.log('Tất cả dữ liệu đã được xóa thành công!'.red.inverse);
    process.exit();
  } catch (error: any) {
    console.error(`Lỗi: ${error.message}`.red.inverse);
    process.exit(1);
  }
};

// Chạy script
if (process.argv[2] === '-d') {
  destroyData();
} else if (process.argv[2] === '-i') {
  importData();
} else {
  console.log('Sử dụng: npm run data:import (-i) hoặc npm run data:destroy (-d)'.blue);
  process.exit();
} 