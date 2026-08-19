import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function createAdmin() {
  const email = 'admin@seedance.com'
  const password = 'admin123456'

  try {
    // 检查管理员是否已存在
    const existingAdmin = await prisma.user.findUnique({
      where: { email }
    })

    if (existingAdmin) {
      console.log('✅ 管理员账号已存在')
      console.log('邮箱:', email)
      console.log('角色:', existingAdmin.role)
      return
    }

    // 创建新管理员
    const hashedPassword = await bcrypt.hash(password, 10)
    
    const admin = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        role: 'ADMIN'
      }
    })

    console.log('✅ 管理员账号创建成功！')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 邮箱:', email)
    console.log('🔑 密码:', password)
    console.log('👤 角色:', admin.role)
    console.log('🆔 ID:', admin.id)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⚠️  请妥善保管管理员密码！')

  } catch (error) {
    console.error('❌ 创建管理员失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
