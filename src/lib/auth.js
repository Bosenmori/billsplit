import jwt from 'jsonwebtoken';
 
export function verifyToken(token) {
  if (!token) {
    return { success: false, message: 'ไม่พบ token กรุณาเข้าสู่ระบบ' };
  }
 
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { success: true, userId: decoded.userId, email: decoded.email };
  } catch (error) {
    return { success: false, message: 'token ไม่ถูกต้องหรือหมดอายุ', error: error.message };
  }
}
 
export function verifyAuth(request) {
  const token = request.cookies.get('token')?.value;
  return verifyToken(token);
}
 