import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function updateAdmin() {
  try {
    // 新的管理员凭证
    const email = 'admin@seedance.com'
    const password = 'admin123456'
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // 查找现有的管理员账号
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })
    
    if (existingAdmin) {
      // 更新现有管理员
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          email: email,
          passwordHash: hashedPassword
        }
      })
      console.log('✅ 管理员账号已更新')
      console.log(`📧 邮箱: ${email}`)
      console.log(`🔑 密码: ${password}`)
    } else {
      // 创建新的管理员账号
      await prisma.user.create({
        data: {
          email: email,
          passwordHash: hashedPassword,
          role: 'ADMIN'
        }
      })
      console.log('✅ 管理员账号已创建')
      console.log(`📧 邮箱: ${email}`)
      console.log(`🔑 密码: ${password}`)
    }
    
    // 显示所有用户
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    })
    
    console.log('\n📋 当前所有用户：')
    console.table(allUsers)
    
  } catch (error) {
    console.error('❌ 错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateAdmin()
